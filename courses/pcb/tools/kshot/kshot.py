#!/usr/bin/env python3
"""kshot.py - real KiCad 8.0.9 (Chinese UI) screenshots of the Boat QB12 board for the course.

    python3 prepare.py                 # once: working copies + HOME under $KSHOT/work
    python3 kshot.py --list            # shot names and groups
    python3 kshot.py all               # every shot
    python3 kshot.py kicad_drc kicad_pos   # only these (their group's app is started once)

Each shot is one function below, decorated with @shot(name, group). A *group* is one app
session on one working copy (e.g. "base" = pcbnew on work/qb12); the runner starts Xvfb +
openbox + the app once per group, then calls that group's shot functions in the order they
are defined. A shot function drives the app with keys / menu clicks (kslib.Session), and
returns a PNG path; the runner turns it into $ASSETS/<name>.webp and records how it was made in
out/manifest.json (used for kicad_shots.md).

All screen coordinates assume the 1400x900 screen, maximized windows and the Noto CJK font
of this container. If you change the screen size, re-measure them (python3 dev.py ... shot).
"""
from __future__ import annotations

import json
import os
import sys
import time
import traceback
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from kslib import Session, webp  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

KSHOT = Path(os.environ.get("KSHOT", "/tmp/claude-0/-home-claude/a03b22b4-4de2-59bd-890a-4be94b9a8f94/scratchpad/kshot"))
WORK = KSHOT / "work"
OUT = KSHOT / "out"
ASSETS = Path(os.environ.get("ASSETS", HERE.parent.parent / "assets"))
SCREEN = (1400, 900)
DISPLAY = int(os.environ.get("KSHOT_DISPLAY", "82"))

SHOTS: list[tuple[str, str, object]] = []
MANIFEST: dict = {}


def shot(name: str, group: str):
    def deco(fn):
        SHOTS.append((name, group, fn))
        return fn
    return deco


def note(name: str, **kw):
    """Record how a shot was opened (shown in kicad_shots.md)."""
    MANIFEST.setdefault(name, {}).update(kw)


# ============================================================== board <-> screen
# Zoom-to-fit of QB12 (edge lines at x 100..156, y 100..138 mm) in the maximized pcbnew window
# (pcbnew.json template) gives 16.9 px/mm with the board corner (100, 100) at (133.5, 157.5).
# Measured from a screenshot; re-measure if the screen size / template changes.
PX_PER_MM = 16.9


def bxy(x_mm: float, y_mm: float) -> tuple[int, int]:
    return round(133.5 + (x_mm - 100) * PX_PER_MM), round(157.5 + (y_mm - 100) * PX_PER_MM)


# ============================================================== pcbnew helpers
class Pcb:
    """A running pcbnew on one board."""

    def __init__(self, s: Session, workdir: Path, board="QB12.kicad_pcb"):
        self.s = s
        s.launch(["pcbnew", board], cwd=str(workdir), log="pcbnew.log")
        self.win = s.wait_window(r"PCB 编辑器", timeout=90, settle=2)
        s.maximize(self.win)
        time.sleep(4)                      # board load + first paint
        self.focus()
        s.key("Home", delay=2)             # 自适应缩放 (zoom to fit) on the final window size

    def focus(self):
        self.s.activate(self.win)
        self.s.move(600, 480, 0.2)         # over the canvas so hotkeys go to the board

    def menu(self, alt: str, item: tuple[int, int], sub: tuple[int, int] | None = None):
        """Open a top menu with Alt+<letter>, click an item (or hover it and click a submenu item)."""
        s = self.s
        self.focus()
        s.key(f"alt+{alt}", delay=0.9)
        if sub is None:
            s.click(*item, delay=1.0)
            return
        s.move(item[0] - 10, item[1], 0.3)
        s.move(*item, 1.3)                 # submenu opens on hover
        s.move(sub[0], item[1], 0.4)       # slide right inside the parent row
        s.click(*sub, delay=1.0)

    def dialog(self, title: str, size: tuple[int, int] | None = None, center=True, wait=2.0) -> str:
        s = self.s
        d = s.wait_window(title, timeout=40, settle=wait)
        if size:
            s.x("xdotool", "windowsize", d, str(size[0]), str(size[1]))
            time.sleep(1.0)
        if center:
            s.center(d)
        return d

    def close(self, d: str):
        s = self.s
        s.activate(d)
        s.key("Escape", delay=1.0)
        if s.find_id(d):
            s.close_window(d)

    def select_ref(self, ref: str):
        """编辑 → 查找 (Ctrl+F): select a footprint by reference."""
        s = self.s
        self.focus()
        s.key("ctrl+f")
        f = s.wait_window(r"^查找$", settle=0.8)
        s.type(ref)
        s.key("Return", delay=1.0)
        s.activate(f)
        s.key("Escape", delay=0.8)
        self.focus()

    def grab_main(self, path: str, crop=None):
        self.s.park_mouse(1398, 898)
        self.s.grab(path, win=self.win, crop=crop)
        return path


def _dialog_shot(p: Pcb, name: str, title: str, size=None, prep=None, rel_clicks=(), wait=2.0):
    """Common pattern: dialog already requested -> wait, resize, centre, clicks, grab."""
    s = p.s
    d = p.dialog(title, size=size, wait=wait)
    gx, gy, _, _ = s.geometry(d)
    for (rx, ry) in rel_clicks:
        s.click(gx + rx, gy + ry, delay=0.8)
    if prep:
        prep(d, gx, gy)
    s.park_mouse()
    path = str(OUT / f"{name}.png")
    s.grab(path, win=d)
    return path, d


# ============================================================== group "base": work/qb12
@shot("kicad_pcb_main", "base")
def pcb_main(p: Pcb):
    note("kicad_pcb_main", how="pcbnew 打开 QB12.kicad_pcb，窗口最大化，视图 → 自适应缩放 (Home)")
    return p.grab_main(str(OUT / "kicad_pcb_main.png"))


@shot("kicad_layers_panel", "base")
def layers_panel(p: Pcb):
    note("kicad_layers_panel", how="PCB 编辑器右侧 外观 面板 → 层 选项卡（默认就显示）；截取右上角并放大 1.5 倍")
    path = p.grab_main(str(OUT / "kicad_layers_panel.png"), crop=(900, 120, 1400, 611))
    im = Image.open(path)
    im.resize((round(im.width * 1.5), round(im.height * 1.5)), Image.LANCZOS).save(path)
    return path


@shot("kicad_fp_props", "base")
def fp_props(p: Pcb):
    p.select_ref("U2")
    p.s.key("e", delay=1.5)
    path, d = _dialog_shot(p, "kicad_fp_props", r"^封装属性$")
    p.close(d)
    note("kicad_fp_props", how="编辑 → 查找 (Ctrl+F) 输入 U2 选中封装，按 E（属性）")
    return path


@shot("kicad_zone_props", "base")
def zone_props(p: Pcb):
    p.focus()
    p.s.click(*bxy(127.5, 105.0), delay=1.0)     # empty F.Cu GND pour (no track / pad there)
    p.s.key("e", delay=1.5)
    path, d = _dialog_shot(p, "kicad_zone_props", r"^覆铜域属性$")
    p.close(d)
    p.s.key("Escape")
    note("kicad_zone_props", how="点选 F.Cu 上 GND 铺铜的空白处，按 E")
    return path


@shot("kicad_keepout_props", "base")
def keepout_props(p: Pcb):
    p.focus()
    p.s.click(*bxy(134.0, 103.7), delay=1.0)     # left edge of the antenna rule area
    p.s.key("e", delay=1.5)
    path, d = _dialog_shot(p, "kicad_keepout_props", r"^规则区属性$")
    p.close(d)
    p.s.key("Escape")
    note("kicad_keepout_props", how="点选天线下方规则区（禁布区）的边框，按 E")
    return path


@shot("kicad_fp_lib_table", "base")
def fp_lib_table(p: Pcb):
    p.menu("r", (507, 89))                       # 设置 → 管理封装库...
    s = p.s
    d = p.dialog(r"封装库", size=(1200, 640), wait=2.5)
    gx, gy, _, _ = s.geometry(d)
    s.click(gx + 160, gy + 47, delay=1.0)        # 工程专用库 tab
    s.park_mouse()
    path = str(OUT / "kicad_fp_lib_table.png")
    s.grab(path, win=d, crop=(0, 0, 1202, 505))  # stop above 可用的替换路径 (shows our temp path)
    p.close(d)
    note("kicad_fp_lib_table", how="设置 → 管理封装库...，切到 项目专用库 选项卡")
    return path


@shot("kicad_net_inspector", "base")
def net_inspector(p: Pcb):
    p.menu("i", (373, 61))                       # 检查 → 网络检查
    path, d = _dialog_shot(p, "kicad_net_inspector", r"^网络检查$", size=(1180, 760))
    p.close(d)
    note("kicad_net_inspector", how="检查 → 网络检查")
    return path


@shot("kicad_net_highlight", "base")
def net_highlight(p: Pcb):
    p.focus()
    p.s.move(*bxy(125.15, 117.0), 0.6)           # D1 pad 1 = VSYS
    p.s.key("grave", delay=2.0)                  # ` = 高亮网络 (Highlight net)
    path = p.grab_main(str(OUT / "kicad_net_highlight.png"))
    p.focus()
    p.s.key("grave", delay=1.0)                  # toggle highlight off again (cursor not on a net)
    p.s.key("Escape")
    note("kicad_net_highlight", how="鼠标放在 D1 的 VSYS 焊盘上，按 `（反引号，高亮网络）")
    return path


@shot("kicad_pad_props", "base")
def pad_props(p: Pcb):
    s = p.s
    p.focus()
    s.move(*bxy(114.5, 111.0), 0.4)              # U2 centre
    s.key("F1", "F1", "F1", "F1", delay=0.6)     # zoom in x4, centred on U2
    s.click(462, 640, delay=1.0)                 # exposed pad (pad 17), away from via holes
    s.key("e", delay=1.5)
    path, d = _dialog_shot(p, "kicad_pad_props", r"^焊盘属性$", size=(960, 680))
    p.close(d)
    # The pad-type illustration box (top right) is never painted for an SMD pad under Xvfb
    # (no compositor), so it shows stale pixels of the window behind. Fill it with the dialog's
    # own background colour - on a normal desktop that box is empty for SMD pads.
    im = Image.open(path).convert("RGB")
    bg = im.getpixel((im.width - 6, 40))
    ImageDraw.Draw(im).rectangle((641, 49, im.width - 5, 223), fill=bg)
    im.save(path)
    s.key("Escape")
    p.focus()
    s.key("Home", delay=1.5)
    note("kicad_pad_props", how="放大到 U2，点选裸露焊盘（17 号焊盘），按 E")
    return path


@shot("kicad_fp_editor", "base")
def fp_editor(p: Pcb):
    s = p.s
    p.select_ref("U2")
    s.key("ctrl+e", delay=3)                     # 在封装编辑器中打开
    w = s.wait_window(r"封装编辑器", timeout=60, settle=3)
    s.maximize(w)
    s.activate(w)
    s.move(700, 480, 0.3)
    s.key("Home", delay=2)
    # (zoom-to-fit cuts the F.Fab value text at the bottom, but one step further out KiCad stops
    #  drawing the pad numbers - keep zoom-to-fit)
    s.park_mouse(1398, 898)
    path = str(OUT / "kicad_fp_editor.png")
    s.grab(path, win=w)
    s.close_window(w, 2)
    if s.find(r"保存"):
        s.key("Escape")
    note("kicad_fp_editor", how="选中 U2，Ctrl+E（在封装编辑器中打开）")
    return path


def _viewer3d(p: Pcb):
    s = p.s
    w = s.find(r"3D 查看器")
    if w:
        return w
    p.focus()
    s.key("Escape", delay=0.5)                   # no selection: the 3D view highlights selected parts
    s.key("alt+3", delay=3)
    w = s.wait_window(r"3D 查看器", timeout=60, settle=8)
    for _ in range(6):                           # the viewer ignores maximize while it is busy
        s.maximize(w)
        time.sleep(2)
        if s.geometry(w, frame=False)[2] >= SCREEN[0] - 10:
            break
    time.sleep(4)
    return w


@shot("kicad_3d_top", "base")
def view3d_top(p: Pcb):
    s = p.s
    w = _viewer3d(p)
    s.activate(w)
    s.move(60, 160, 3)                           # it opens in top view; no key press (a key
                                                 # press shows the green pivot marker)
    s.park_mouse(1398, 898)
    path = str(OUT / "kicad_3d_top.png")
    s.grab(path, win=w)
    note("kicad_3d_top", how="视图 → 3D 查看器 (Alt+3)，打开时就是顶视图（视图 → 顶视图 也可以）")
    return path


@shot("kicad_3d_angle", "base")
def view3d_angle(p: Pcb):
    s = p.s
    w = _viewer3d(p)
    s.activate(w)
    s.move(700, 480, 0.3)
    s.key("z", delay=3)
    # tilt with the mouse: drag up = rotate around X, a bit sideways = around Z
    s.x("xdotool", "mousemove", "600", "600", "mousedown", "1")
    for i in range(1, 21):
        s.x("xdotool", "mousemove", str(600 - i * 3), str(600 - i * 10))
        time.sleep(0.06)
    s.x("xdotool", "mouseup", "1")
    time.sleep(3)
    s.move(60, 160, 3)                           # over empty background: clears hover highlight
    s.park_mouse(1398, 898)
    path = str(OUT / "kicad_3d_angle.png")
    s.grab(path, win=w)
    s.close_window(w)
    note("kicad_3d_angle", how="3D 查看器里按住左键拖动旋转（斜视）")
    return path


@shot("kicad_zones_unfilled", "base")
def zones_unfilled(p: Pcb):
    p.focus()
    p.s.key("Escape")
    p.s.key("Home", delay=2)                     # earlier shots zoomed in: back to zoom-to-fit
    p.s.key("ctrl+b", delay=3)                   # 编辑 → 取消填充所有域
    path = p.grab_main(str(OUT / "kicad_zones_unfilled.png"))
    note("kicad_zones_unfilled", how="编辑 → 取消填充所有域 (Ctrl+B)")
    return path


@shot("kicad_drc", "base")
def drc(p: Pcb):
    s = p.s
    p.menu("i", (386, 146))                      # 检查 → 设计规则检查
    d = p.dialog(r"^设计规则检查$", size=(900, 680))
    gx, gy, gw, gh = s.geometry(d)
    s.click(gx + gw - 80, gy + gh - 30, delay=1)  # 运行 DRC (refills zones first: box ticked)
    for _ in range(60):                           # wait for the result tabs to show counts
        time.sleep(2)
        if not s.find(r"进度|Progress|填充"):
            break
    time.sleep(4)
    s.park_mouse()
    path = str(OUT / "kicad_drc.png")
    s.grab(path, win=d)
    note("kicad_drc", how="检查 → 设计规则检查，点 运行 DRC（勾选 在执行 DRC 之前重新填充所有覆铜域）")
    return path


# ============================================================== group "jlc": work/qb12_jlc
def _board_setup(p: Pcb, name: str, page_xy: tuple[int, int], size=(1100, 760)):
    s = p.s
    d = s.find(r"^电路板配置$")
    if not d:
        p.menu("f", (70, 374))                   # 文件 → 电路板配置...
        d = p.dialog(r"^电路板配置$", size=size, wait=3)
    else:
        s.x("xdotool", "windowsize", d, str(size[0]), str(size[1]))
        time.sleep(1)
        s.center(d)
    gx, gy, _, _ = s.geometry(d)
    s.click(gx + page_xy[0], gy + page_xy[1], delay=1.5)
    s.park_mouse()
    path = str(OUT / f"{name}.png")
    s.grab(path, win=d)
    return path


@shot("kicad_stackup", "jlc")
def stackup(p: Pcb):
    note("kicad_stackup", how="文件 → 电路板配置... → 电路板叠层 → 物理叠层")
    return _board_setup(p, "kicad_stackup", (75, 82), size=(1060, 560))


@shot("kicad_constraints", "jlc")
def constraints(p: Pcb):
    note("kicad_constraints", how="文件 → 电路板配置... → 设计规则 → 约束")
    return _board_setup(p, "kicad_constraints", (62, 274), size=(1000, 820))


@shot("kicad_predef_sizes", "jlc")
def predef_sizes(p: Pcb):
    note("kicad_predef_sizes", how="文件 → 电路板配置... → 设计规则 → 预设尺寸",
         caveat="QB12 原工程的预设尺寸表是空的；截图用的工作副本里填入了 QB12 实际用到的线宽 "
                "0.2/0.3/0.4/0.5/0.8 mm 和过孔 0.6/0.3、0.8/0.4 mm")
    return _board_setup(p, "kicad_predef_sizes", (75, 298), size=(1000, 560))


@shot("kicad_netclasses", "jlc")
def netclasses(p: Pcb):
    note("kicad_netclasses", how="文件 → 电路板配置... → 设计规则 → 网络类")
    path = _board_setup(p, "kicad_netclasses", (69, 370), size=(1200, 860))
    d = p.s.find(r"^电路板配置$")
    p.close(d)
    if p.s.find(r"保存|变更"):
        p.s.key("Escape")
    return path


@shot("kicad_plot_gerber", "jlc")
def plot_gerber(p: Pcb):
    p.menu("f", (70, 345), sub=(320, 345))      # 文件 → 制造输出 → Gerbers (.gbr)...
    path, d = _dialog_shot(p, "kicad_plot_gerber", r"^绘制$")
    note("kicad_plot_gerber", how="文件 → 制造输出 → Gerbers (.gbr)...（打开的是 绘制 对话框）",
         caveat="工作副本的绘制参数事先设成 facts.md §5.1 的 JLC 教程值（Protel 扩展名、无 X2、"
                "无网表属性、无作业文件、过孔盖油、剔除阻焊开窗中的丝印、绝对原点）")
    p.s.activate(d)
    p.s.key("Escape", delay=1)
    return path


@shot("kicad_drill", "jlc")
def drill(p: Pcb):
    p.menu("f", (70, 345), sub=(320, 373))      # 文件 → 制造输出 → 钻孔文件 (.drl)...
    path, d = _dialog_shot(p, "kicad_drill", r"^生成钻孔文件$", size=(760, 623),
                           prep=lambda d, gx, gy: p.s.key("End"))   # drop the text selection
    note("kicad_drill", how="文件 → 制造输出 → 钻孔文件 (.drl)...",
         caveat="pcbnew.json 里事先设成 JLC 值：毫米、使用备选钻孔模式（KiCad 默认是英寸 + 铣孔命令）")
    p.close(d)
    return path


@shot("kicad_pos", "jlc")
def pos(p: Pcb):
    p.menu("f", (70, 345), sub=(320, 429))      # 文件 → 制造输出 → 元件定位文件 (.pos, .gbr)...
    path, d = _dialog_shot(p, "kicad_pos", r"^生成布置文件$")
    note("kicad_pos", how="文件 → 制造输出 → 元件定位文件 (.pos, .gbr)...（对话框标题：生成布置文件）",
         caveat="事先设成 JLC 建议：CSV、毫米、整板一个文件；不勾 使用钻孔/定位文件原点（与 Gerber 的绝对原点一致）")
    p.close(d)
    return path


# ============================================================== single-shot groups
@shot("kicad_edge_only", "edge")
def edge_only(p: Pcb):
    note("kicad_edge_only", how="外观 → 层：只留 Edge.Cuts 和 F.Courtyard 可见（工作副本的 .kicad_prl 里设好）")
    return p.grab_main(str(OUT / "kicad_edge_only.png"))


@shot("kicad_bcu_view", "bcu")
def bcu_view(p: Pcb):
    note("kicad_bcu_view", how="外观 → 层：只留 B.Cu 和 Edge.Cuts 可见，当前层 B.Cu（工作副本的 .kicad_prl 里设好）")
    return p.grab_main(str(OUT / "kicad_bcu_view.png"))


@shot("kicad_route_live", "route")
def route_live(p: Pcb):
    """Work copy: USB_DP between U5 pin 1 (127.45, 126.45) and U1 pin 14 (135.25, 124.42) removed.
    Re-route it live along the original corridor (up 0.8 mm, then right at y = 125.63)."""
    s = p.s
    p.focus()
    c = (130.5, 125.5)                           # on the 0.5 mm grid: F1 centres on the snapped point
    s.move(*bxy(*c), 0.4)
    s.key("F1", "F1", "F1", delay=1.0)           # zoom 5 -> 8 -> 13 -> 20 (x4), centred on c
    k = PX_PER_MM * 4

    def sc(x, y):                                # canvas centre is (607.5, 478.5)
        return round(607.5 + (x - c[0]) * k), round(478.5 + (y - c[1]) * k)
    s.move(*sc(127.45, 126.45), 0.8)             # U5 pin 1 (USB_DP)
    s.key("x", delay=1.2)                        # 布线(单端) starts at the pad under the cursor
    pts = [(127.45, 126.45 - 0.82 * t / 4) for t in range(1, 5)]
    pts += [(127.45 + (132.2 - 127.45) * t / 12, 125.63) for t in range(1, 13)]
    for x, y in pts:
        s.move(*sc(x, y), 0.15)
    time.sleep(2)
    path = str(OUT / "kicad_route_live.png")
    s.grab(path, win=p.win)                      # pointer stays: the live track ends at it
    s.key("Escape", "Escape", delay=0.6)
    note("kicad_route_live",
         how="放大到 U5 / U1 之间，鼠标放在 U5 的 1 脚（USB_DP）上按 X（布线(单端)），向右移动鼠标",
         caveat="工作副本里事先删掉了 USB_DP 从 U5 1 脚到 U1 14 脚的那一段（4 段走线），才有飞线可布")
    return path


# --------------------------------------------------------------- gerbview
@shot("kicad_gerbview", "gerbview")
def gerbview(s: Session):
    order = ["F_Cu.gtl", "B_Cu.gbl", "F_Silkscreen.gto", "B_Silkscreen.gbo", "F_Mask.gts",
             "B_Mask.gbs", "F_Paste.gtp", "B_Paste.gbp", "Edge_Cuts.gm1", "PTH.drl", "NPTH.drl"]
    files = [f"QB12-{n}" for n in order]
    s.launch(["gerbview", *files], cwd=str(WORK / "gerber"), log="gerbview.log")
    w = s.wait_window(r"Gerber 查看器", timeout=90, settle=2)
    s.maximize(w)
    s.wait_window(r"NPTH\.drl — Gerber 查看器", timeout=300, settle=5)   # files load one by one
    s.activate(w)
    s.move(700, 480, 0.3)
    s.key("Home", delay=3)
    s.park_mouse(1398, 898)
    path = str(OUT / "kicad_gerbview.png")
    s.grab(path, win=w)
    note("kicad_gerbview", how="Gerber 查看器（项目管理器里的 Gerber 查看器 / gerbview）载入 QB12_Gerber.zip 里的 "
         "9 个 Gerber + 2 个钻孔文件（相当于 文件 → 打开 Gerber 绘图文件... 和 打开 Excellon 钻孔文件...），"
         "等全部载入后按 Home 自适应缩放")
    return path


# --------------------------------------------------------------- demo project (eeschema / cvpcb)
# Launched through the project manager (kicad demo.kicad_pro): "Update PCB from Schematic"
# refuses to work when eeschema / pcbnew run stand-alone.
def _wait_gone(s: Session, pattern: str, timeout=180, appear=20):
    """Wait for a progress window (e.g. 加载封装库) to show up (max `appear` s) and close again."""
    t0 = time.time()
    while time.time() - t0 < appear and not s.find(pattern):
        time.sleep(0.5)
    t0 = time.time()
    while time.time() - t0 < timeout and s.find(pattern):
        time.sleep(1)
    time.sleep(1)


@shot("kicad_assign_fp", "demo")
def assign_fp(s: Session):
    d = WORK / "demo"
    s.launch(["kicad", str(d / "demo.kicad_pro")], cwd=str(d), log="kicad.log")
    s.wait_window(r"KiCad 8", timeout=90, settle=3)
    s.click(327, 85, delay=2)                    # 原理图编辑器 tile in the project manager
    sch = s.wait_window(r"demo.*原理图编辑器", timeout=120, settle=8)
    _wait_gone(s, r"加载原理图")                  # the menu bar only appears after loading
    time.sleep(3)
    s.maximize(sch)
    s.activate(sch)
    s.move(700, 400, 0.3)
    s.key("Escape")
    s.key("alt+t", delay=1.2)                    # 工具
    s.click(375, 351, delay=2)                   # 分配封装...
    cv = s.wait_window(r"^分配封装$", timeout=120, settle=4)
    _wait_gone(s, r"加载封装库", timeout=300)
    s.maximize(cv)
    time.sleep(2)
    s.click(453, 70, delay=10)                   # filter: symbol's footprint keywords (slow: 14k fps)
    s.click(617, 70, delay=1)                    # search box
    s.type("JST_PH", delay=8)
    s.click(1200, 121, delay=1.5)                # first candidate: JST_PH_B2B-PH-K_1x02 (J1 selected)
    s.move(1300, 860, 0.5)
    s.park_mouse(1398, 898)
    path = str(OUT / "kicad_assign_fp.png")
    s.grab(path, win=cv)
    s.click(1200, 121, double=True, delay=2)     # assign it to J1
    s.click(1339, 879, delay=2)                  # OK: back to the schematic
    note("kicad_assign_fp", how="演示工程：原理图编辑器 → 工具 → 分配封装...；开启第 1 个筛选按钮（按符号的封装关键字筛选），"
         "搜索框输入 JST_PH，选中 J1 和候选封装（截图之后双击分配）",
         caveat="演示工程是手写的 3 个元件（R1 1k、D1 红色 LED、J1 2 针 PH2.0），不是 QB12（QB12 没有 KiCad 原理图）")
    return path


@shot("kicad_update_pcb", "demo")
def update_pcb(s: Session):
    sch = s.wait_window(r"demo.*原理图编辑器", timeout=30, settle=1)
    s.activate(sch)
    s.move(700, 400, 0.3)
    s.key("F8", delay=3)                         # 工具 → 从原理图更新 PCB... (F8)
    dlg = s.wait_window(r"^从原理图更新 PCB$", timeout=120, settle=4)
    s.center(dlg)                                # (resizing it leaves an unpainted strip)
    s.park_mouse()
    path = str(OUT / "kicad_update_pcb.png")
    s.grab(path, win=dlg)
    note("kicad_update_pcb", how="演示工程：分配完封装后，在原理图编辑器按 F8（工具 → 从原理图更新 PCB...），"
         "PCB 编辑器自动打开并弹出此对话框（还没点 更新 PCB）",
         caveat="演示工程，不是 QB12")
    return path


def run_group(group: str, names: list[str]):
    fns = [(n, f) for (n, g, f) in SHOTS if g == group and n in names]
    if not fns:
        return
    OUT.mkdir(parents=True, exist_ok=True)
    print(f"== group {group}: {[n for n, _ in fns]}", flush=True)
    with Session(display=DISPLAY, size=SCREEN, home=str(WORK / "home"), log_dir=str(OUT)) as s:
        if group in ("base", "jlc", "route", "edge", "bcu"):
            wd = {"base": "qb12", "jlc": "qb12_jlc", "route": "route", "edge": "edge", "bcu": "bcu"}[group]
            ctx = Pcb(s, WORK / wd)
        else:
            ctx = s
        for name, fn in fns:
            t0 = time.time()
            try:
                png = fn(ctx)
                if name.startswith("kicad_") and png:
                    w, h, b = webp(png, ASSETS / f"{name}.webp")
                    note(name, status="real", png=png, width=w, height=h, kb=round(b / 1024, 1))
                    print(f"   {name}: {w}x{h} {b/1024:.0f} KB ({time.time()-t0:.0f}s)", flush=True)
            except Exception as e:  # keep going; the placeholder stays
                traceback.print_exc()
                note(name, status="failed", error=str(e))
                s.grab(str(OUT / f"_fail_{name}.png"))
                for _ in range(3):
                    s.key("Escape", delay=0.5)


def serve(group: str, minutes: float = 60):
    """Debug helper: start a group's app and keep it running; poke it with dev.py / xdotool
    (DISPLAY=:$KSHOT_DISPLAY) while it sleeps."""
    with Session(display=DISPLAY, size=SCREEN, home=str(WORK / "home"), log_dir=str(OUT)) as s:
        wd = {"base": "qb12", "jlc": "qb12_jlc", "route": "route", "edge": "edge", "bcu": "bcu"}
        if group in wd:
            Pcb(s, WORK / wd[group])
        print("serving", group, "on display", DISPLAY, flush=True)
        time.sleep(minutes * 60)


def main(argv):
    if argv[:1] == ["--serve"]:
        serve(argv[1], float(argv[2]) if len(argv) > 2 else 60)
        return
    if "--list" in argv:
        for n, g, _ in SHOTS:
            print(f"{g:9s} {n}")
        return
    names = [n for n, _, _ in SHOTS] if (not argv or "all" in argv) else argv
    mf = OUT / "manifest.json"
    if mf.exists():
        MANIFEST.update(json.loads(mf.read_text()))
    groups = []
    for n, g, _ in SHOTS:
        if n in names and g not in groups:
            groups.append(g)
    for g in groups:
        run_group(g, names)
        mf.write_text(json.dumps(MANIFEST, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main(sys.argv[1:])
