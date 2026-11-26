# kshot — real KiCad 8.0.9 screenshots (Chinese UI), scripted

Takes the 27 `assets/kicad_*.webp` screenshots of the course from a real KiCad 8.0.9 running
headless in this container. Everything is driven by keys / menu clicks, so the same functions
can be reused for short screen recordings of the operations.

```
KSHOT=<scratchpad>/kshot      # working area (default: the session scratchpad's kshot/)
python3 prepare.py            # build working copies + HOME under $KSHOT/work (never touches the delivered files)
python3 kshot.py --list       # shot names and their group
python3 kshot.py all          # every shot  (~8 min)
python3 kshot.py kicad_drc kicad_pos     # just these
python3 report.py             # assets/kicad_shots.md from out/manifest.json + the notes in report.py
```

Output: `$ASSETS/<name>.webp` (default `../../assets`), max width 1400 px, WebP q≈80, shrunk until
≤ 120 KB; the full-size PNGs and logs stay in `$KSHOT/out/`, plus `out/manifest.json`
(status, size, how each shot was opened).

## Requirements (apt, already installed here; reinstall after a container restart)

`xvfb openbox wmctrl x11-utils (xwininfo, xprop) xdotool imagemagick (import) mesa-utils gettext ffmpeg`,
Pillow with WebP, KiCad 8.0.9 with `python3.12` + `pcbnew` module, `zh_CN.UTF-8` locale, Noto CJK fonts.

## Files

| file | what |
|---|---|
| `kslib.py` | `Session`: starts `Xvfb :N` (1400×900, GLX via llvmpipe) + `openbox` (gives dialogs a title bar), launches apps with `HOME=$KSHOT/work/home LANG=zh_CN.UTF-8`, finds windows (`wmctrl -l`), keys / clicks / wheel (`xdotool`), maximize / centre / polite close (`wmctrl`), `grab()` = `import -window root` cropped to a window **including its title bar** (`xwininfo` + `_NET_FRAME_EXTENTS`), `record()` = ffmpeg x11grab, `webp()` = PNG → WebP under a size cap. |
| `prepare.py` | Working copies (see below) and a fresh HOME made from `kicad_config/*.json` (Chinese UI, maximized windows, Cairo canvas, zoom acceleration off, JLC drill / placement choices, netclass splitter position, no 3D rollover highlight). |
| `demo_project.py` | Writes the tiny demo project (R1 1k, D1 red LED, J1 2-pin) by hand: no symbol libraries are installed, so the three symbols are embedded in the `.kicad_sch`. Empty 30×20 mm board made with KiCad's python. |
| `kshot.py` | One function per shot (`@shot(name, group)`), the runner, `--serve <group>` for debugging. |
| `report.py` | Writes `assets/kicad_shots.md`. |
| `kicad_config/` | KiCad 8 settings captured from a clean run (templates for HOME). |

### Working copies (`$KSHOT/work/`)

| dir | used by | change vs. delivered QB12 |
|---|---|---|
| `qb12` | most board / dialog shots | none |
| `qb12_jlc` | board setup pages, plot, drill, pos | `pcbplotparams` set to the JLC tutorial values (facts.md §5.1); **pre-defined sizes filled** (0.2/0.3/0.4/0.5/0.8 mm tracks, 0.6/0.3 and 0.8/0.4 vias – the delivered table is empty) |
| `route` | route_live | USB_DP between U5 pin 1 and U1 pin 14 deleted (4 F.Cu segments) |
| `edge`, `bcu` | edge_only, bcu_view | only `.kicad_prl` layer / item visibility |
| `gerber` | gerbview | `QB12_Gerber.zip` unpacked |
| `demo` | assign_fp, update_pcb | hand-made demo project (QB12 has no KiCad schematic) |

## How a shot works

```python
@shot("kicad_zone_props", "base")          # group "base" = pcbnew on work/qb12
def zone_props(p: Pcb):
    p.focus()
    p.s.click(*bxy(127.5, 105.0))           # board mm -> screen px (zoom-to-fit calibration)
    p.s.key("e")                            # 属性 (E)
    path, d = _dialog_shot(p, "kicad_zone_props", r"^覆铜域属性$")   # wait, centre, grab dialog
    p.close(d)
    note("kicad_zone_props", how="点选 F.Cu 上 GND 铺铜的空白处，按 E")
    return path
```

* Menus are opened with `Alt+<letter>` (the Chinese menus keep the (F)/(E)/… mnemonics) and items
  are clicked at measured positions; items have no mnemonics in the Chinese UI.
  `Pcb.menu("f", (70, 345), sub=(320, 373))` = 文件 → 制造输出 → 钻孔文件 (.drl)...
* Coordinates are for the 1400×900 screen and the maximized windows from the config templates
  (client area starts at y = 23). `bxy()` maps board millimetres to screen pixels at zoom-to-fit
  (16.9 px/mm, board corner (100,100) mm at (133.5,157.5)); `F1` zooms in one step of the zoom
  list (5 → 8 → 13 → 20 → 35) centred on the cursor, snapped to the 0.5 mm grid.
* Re-measure after changing the screen size: `python3 kshot.py --serve base` keeps pcbnew running
  on `:$KSHOT_DISPLAY` (default 82); poke it with `xdotool` / `import -window root x.png`.

## Gotchas found the hard way

* **Never `xdotool windowclose`** – it destroys the X window and KiCad dies. Use `Session.close_window`
  (wmctrl, WM_DELETE) or Escape.
* `pkill -f "<pattern>"` / `pgrep -f` from a shell also match that shell's own command line.
* GTK draws nothing in a few spots under Xvfb (no compositor): the pad-type picture box of 焊盘属性
  for SMD pads shows stale pixels → `pad_props` fills that box with the dialog colour. Resizing
  从原理图更新 PCB leaves an unpainted strip → it is shot at its natural size.
* The 3D viewer highlights footprints selected in the PCB editor and anything under the mouse;
  clear the selection (Escape) before Alt+3, rollover highlight is off in the config. Any key press in
  the 3D view shows a green pivot marker – the top view is shot without pressing keys.
* GerbView loads the files one after another (~90 s for 11 files under llvmpipe); wait for the
  title `QB12-NPTH.drl — Gerber 查看器` before shooting.
* eeschema shows its menu bar only after the 加载原理图 progress window closes; CvPcb ignores typing
  while it re-filters 14 000 footprints – wait ~10 s after toggling a filter.
* "Update PCB from Schematic" only works when eeschema is started from the project manager
  (`kicad demo.kicad_pro`), not stand-alone.
* `Ctrl+Q` in pcbnew writes `pcbnew.json` (window size, last dialogs' options) into HOME; the runner
  kills apps instead, so every run starts from the templates.

## Screen recordings (for the video makers)

```python
with Session(display=90, home=str(WORK / "home")) as s:
    p = Pcb(s, WORK / "route")
    rec = s.record("/tmp/route.mp4", seconds=12, fps=20)   # whole screen, H.264
    route_live(p)                                            # any shot function = an operation
    rec.wait()
```
Slow the actions down (`delay=` arguments) for a watchable video; `box=(x, y, w, h)` records a region.
