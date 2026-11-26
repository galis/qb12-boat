"""kslib - small helpers to drive KiCad 8 inside a headless X server and take screenshots.

Everything here is plain subprocess calls to standard tools:
  Xvfb (virtual X server), openbox (window manager, gives dialogs a title bar),
  xdotool (keys / mouse / window search), wmctrl (window list / maximize),
  xwininfo + xprop (window geometry incl. frame), ImageMagick `import` (capture),
  Pillow (crop, scale, WebP), ffmpeg (optional screen recording).

Typical use (see kshot.py for real examples):

    from kslib import Session
    with Session(display=81, size=(1400, 900)) as s:
        s.launch(["pcbnew", "QB12.kicad_pcb"], cwd=work_dir)
        main = s.wait_window(r"PCB 编辑器", timeout=60)
        s.maximize(main)
        s.key("ctrl+b")                 # a KiCad hotkey
        s.grab("out.png", win=main)    # whole window incl. title bar
        s.webp("out.png", "out.webp")
"""
from __future__ import annotations

import os
import re
import shutil
import signal
import subprocess
import time
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent


def _env_base(home: str | None, display: int) -> dict:
    env = dict(os.environ)
    env.update({
        "DISPLAY": f":{display}",
        "LANG": "zh_CN.UTF-8",
        "LC_ALL": "zh_CN.UTF-8",
        "LIBGL_ALWAYS_SOFTWARE": "1",     # llvmpipe: the 3D viewer and GAL canvas need GLX
        "NO_AT_BRIDGE": "1",
    })
    if home:
        env["HOME"] = home
    return env


class Session:
    """One virtual screen (Xvfb + openbox) with KiCad apps on it."""

    def __init__(self, display: int = 81, size=(1400, 900), home: str | None = None,
                 wm: bool = True, log_dir: str | None = None):
        self.display = display
        self.size = size
        self.home = home
        self.wm = wm
        self.procs: list[subprocess.Popen] = []
        self.apps: list[subprocess.Popen] = []
        self.log_dir = Path(log_dir or "/tmp")
        self.env = _env_base(home, display)

    # ---------------------------------------------------------------- X server
    def start(self):
        lock = Path(f"/tmp/.X{self.display}-lock")
        if lock.exists():
            raise RuntimeError(f"display :{self.display} seems busy ({lock})")
        w, h = self.size
        xv = subprocess.Popen(
            ["Xvfb", f":{self.display}", "-screen", "0", f"{w}x{h}x24",
             "+extension", "GLX", "+render", "-nolisten", "tcp"],
            stdout=subprocess.DEVNULL, stderr=open(self.log_dir / f"xvfb{self.display}.log", "w"),
            start_new_session=True)
        self.procs.append(xv)
        for _ in range(50):
            if Path(f"/tmp/.X11-unix/X{self.display}").exists():
                break
            time.sleep(0.1)
        time.sleep(0.5)
        if self.wm:
            wm = subprocess.Popen(["openbox"], env=self.env, stdout=subprocess.DEVNULL,
                                  stderr=subprocess.DEVNULL, start_new_session=True)
            self.procs.append(wm)
            time.sleep(1.0)
        return self

    def stop(self):
        for p in self.apps + self.procs[::-1]:
            try:
                os.killpg(p.pid, signal.SIGTERM)
            except Exception:
                pass
        time.sleep(0.5)
        for p in self.apps + self.procs:
            try:
                os.killpg(p.pid, signal.SIGKILL)
            except Exception:
                pass
        self.apps.clear()
        self.procs.clear()

    def __enter__(self):
        return self.start()

    def __exit__(self, *exc):
        self.stop()

    # ---------------------------------------------------------------- apps
    def launch(self, argv: list[str], cwd: str | None = None, log: str | None = None):
        logf = open(self.log_dir / (log or f"{Path(argv[0]).name}{self.display}.log"), "w")
        p = subprocess.Popen(argv, cwd=cwd, env=self.env, stdout=logf, stderr=subprocess.STDOUT,
                             start_new_session=True)
        self.apps.append(p)
        return p

    def kill_apps(self):
        for p in self.apps:
            try:
                os.killpg(p.pid, signal.SIGKILL)
            except Exception:
                pass
        self.apps.clear()
        time.sleep(0.5)

    # ---------------------------------------------------------------- low-level X
    def x(self, *args, check=False) -> str:
        """Run an X tool on this display and return stdout."""
        r = subprocess.run(list(args), env=self.env, capture_output=True, text=True)
        if check and r.returncode:
            raise RuntimeError(f"{args}: {r.stderr}")
        return r.stdout

    def windows(self) -> list[dict]:
        """Top-level client windows: [{id, x, y, w, h, title}] (wmctrl -l -G)."""
        out = []
        for line in self.x("wmctrl", "-l", "-G").splitlines():
            parts = line.split(None, 7)
            if len(parts) < 7:
                continue
            wid, _desk, x, y, w, h = parts[:6]
            title = parts[7] if len(parts) > 7 else ""
            out.append({"id": wid, "x": int(x), "y": int(y), "w": int(w), "h": int(h),
                        "title": title})
        return out

    def find(self, pattern: str) -> str | None:
        for w in self.windows():
            if re.search(pattern, w["title"]):
                return w["id"]
        return None

    def find_id(self, wid: str) -> bool:
        """Is this window id still mapped?"""
        return any(int(w["id"], 16) == int(wid, 16) for w in self.windows())

    def wait_window(self, pattern: str, timeout: float = 30, settle: float = 1.0) -> str:
        t0 = time.time()
        while time.time() - t0 < timeout:
            wid = self.find(pattern)
            if wid:
                time.sleep(settle)
                return wid
            time.sleep(0.3)
        raise TimeoutError(f"no window matching {pattern!r}; have {[w['title'] for w in self.windows()]}")

    def wait_gone(self, pattern: str, timeout: float = 30):
        t0 = time.time()
        while time.time() - t0 < timeout:
            if not self.find(pattern):
                return
            time.sleep(0.3)
        raise TimeoutError(f"window {pattern!r} still open")

    def geometry(self, wid: str, frame: bool = True) -> tuple[int, int, int, int]:
        """Absolute (x, y, w, h) of a window, optionally including the WM frame (title bar)."""
        info = self.x("xwininfo", "-id", wid)
        g = {k: int(v) for k, v in re.findall(r"(Absolute upper-left [XY]|Width|Height):\s+(-?\d+)", info)}
        x, y, w, h = g["Absolute upper-left X"], g["Absolute upper-left Y"], g["Width"], g["Height"]
        if frame:
            m = re.search(r"= (\d+), (\d+), (\d+), (\d+)", self.x("xprop", "-id", wid, "_NET_FRAME_EXTENTS"))
            if m:
                l, r, t, b = map(int, m.groups())
                x, y, w, h = x - l, y - t, w + l + r, h + t + b
        return x, y, w, h

    def activate(self, wid: str):
        self.x("wmctrl", "-i", "-a", wid)
        time.sleep(0.3)

    def close_window(self, wid: str, delay: float = 1.5):
        """Polite close (WM_DELETE_WINDOW via wmctrl). Never use `xdotool windowclose`:
        it destroys the X window and takes the whole KiCad process down with it."""
        self.x("wmctrl", "-i", "-c", wid)
        time.sleep(delay)

    def maximize(self, wid: str):
        self.x("wmctrl", "-i", "-r", wid, "-b", "add,maximized_vert,maximized_horz")
        time.sleep(1.0)

    def move_resize(self, wid: str, x: int, y: int, w: int, h: int):
        self.x("wmctrl", "-i", "-r", wid, "-b", "remove,maximized_vert,maximized_horz")
        self.x("wmctrl", "-i", "-r", wid, "-e", f"0,{x},{y},{w},{h}")
        time.sleep(0.8)

    def center(self, wid: str):
        """Center a dialog on the screen (keeps its size)."""
        x, y, w, h = self.geometry(wid, frame=True)
        sw, sh = self.size
        self.x("xdotool", "windowmove", wid, str(max(0, (sw - w) // 2)), str(max(0, (sh - h) // 2)))
        time.sleep(0.5)

    def key(self, *keys: str, delay: float = 0.4, wid: str | None = None):
        """xdotool key names, e.g. key('ctrl+b'), key('alt+f', 'Down', 'Return')."""
        for k in keys:
            if wid:
                self.x("xdotool", "key", "--window", wid, k)
            else:
                self.x("xdotool", "key", k)
            time.sleep(delay)

    def type(self, text: str, delay: float = 0.3):
        self.x("xdotool", "type", "--delay", "40", text)
        time.sleep(delay)

    def move(self, x: int, y: int, delay: float = 0.3):
        self.x("xdotool", "mousemove", str(x), str(y))
        time.sleep(delay)

    def click(self, x: int, y: int, button: int = 1, double: bool = False, delay: float = 0.5):
        self.x("xdotool", "mousemove", str(x), str(y))
        time.sleep(0.15)
        self.x("xdotool", "click", *(["--repeat", "2", "--delay", "80"] if double else []), str(button))
        time.sleep(delay)

    def scroll(self, x: int, y: int, clicks: int, delay: float = 0.6):
        """Mouse wheel at (x, y): positive = wheel up (KiCad: zoom in)."""
        self.move(x, y, 0.1)
        btn = "4" if clicks > 0 else "5"
        for _ in range(abs(clicks)):
            self.x("xdotool", "click", btn)
            time.sleep(0.08)
        time.sleep(delay)

    def park_mouse(self, x: int | None = None, y: int | None = None):
        """Move the pointer somewhere harmless (no tooltip) before a shot."""
        sw, sh = self.size
        self.move(sw - 2 if x is None else x, sh - 2 if y is None else y, 0.8)

    # ---------------------------------------------------------------- capture
    def grab(self, path: str, win: str | None = None, frame: bool = True,
             crop: tuple[int, int, int, int] | None = None) -> Image.Image:
        """Capture the screen; crop to a window (incl. frame) and/or a box (x0, y0, x1, y1)
        given relative to that window (or to the screen if win is None)."""
        tmp = f"/tmp/kshot_root_{self.display}.png"
        self.x("import", "-window", "root", tmp, check=True)
        im = Image.open(tmp).convert("RGB")
        ox, oy = 0, 0
        if win:
            x, y, w, h = self.geometry(win, frame=frame)
            x0, y0 = max(0, x), max(0, y)
            im = im.crop((x0, y0, min(im.width, x + w), min(im.height, y + h)))
            ox, oy = x0 - x, y0 - y
        if crop:
            a, b, c, d = crop
            im = im.crop((a - ox, b - oy, c - ox, d - oy))
        im.save(path)
        return im

    def record(self, path: str, seconds: float, fps: int = 15, box=None) -> subprocess.Popen:
        """Start an ffmpeg screen recording (x11grab) in the background; returns the process.
        box = (x, y, w, h) on screen; default whole screen. Call p.wait() or p.terminate()."""
        sw, sh = self.size
        x, y, w, h = box or (0, 0, sw, sh)
        w -= w % 2
        h -= h % 2
        return subprocess.Popen(
            ["ffmpeg", "-y", "-loglevel", "error", "-f", "x11grab", "-framerate", str(fps),
             "-video_size", f"{w}x{h}", "-i", f":{self.display}+{x},{y}", "-t", str(seconds),
             "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23", path],
            env=self.env)


def webp(src, dst, max_w: int = 1400, quality: int = 80, max_kb: int = 120,
         scale: float | None = None) -> tuple[int, int, int]:
    """PNG -> WebP. Downscale to max_w (or by scale), then lower quality until <= max_kb.
    Returns (width, height, bytes)."""
    im = Image.open(src).convert("RGB")
    if scale:
        im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    if im.width > max_w:
        im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
    q = quality
    while True:
        im.save(dst, "WEBP", quality=q, method=6)
        size = os.path.getsize(dst)
        if size <= max_kb * 1024 or q <= 40:
            break
        q -= 8
    if size > max_kb * 1024:          # still too big: shrink geometry a bit
        f = (max_kb * 1024 / size) ** 0.5
        im = im.resize((round(im.width * f), round(im.height * f)), Image.LANCZOS)
        im.save(dst, "WEBP", quality=q, method=6)
        size = os.path.getsize(dst)
    return im.width, im.height, size


def copy_project(src: str, dst: str) -> Path:
    """Fresh working copy of a KiCad project dir (lock files removed)."""
    d = Path(dst)
    if d.exists():
        shutil.rmtree(d)
    shutil.copytree(src, d)
    for f in d.glob("~*.lck"):
        f.unlink()
    return d
