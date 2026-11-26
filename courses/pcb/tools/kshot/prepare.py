"""prepare.py - build the working copies the shots need (never touches the delivered files).

    python3 prepare.py            # (re)creates everything under $KSHOT/work

Copies made from $KSHOT/QB12_KiCad (a copy of the delivered QB12 KiCad project):
  work/qb12      untouched copy: board views, properties dialogs, DRC, 3D, net inspector ...
  work/qb12_jlc  same board; .kicad_pcb plot params set to the JLC tutorial values (facts.md 5.1)
                 and .kicad_pro "pre-defined sizes" filled with the widths/vias QB12 really uses
                 (the delivered project has that table EMPTY - say so in captions).
  work/route     USB_DP between U5 pin 1 and U1 pin 14 removed, for the "routing in progress" shot.
  work/edge      .kicad_prl shows only Edge.Cuts + F.Courtyard.
  work/bcu       .kicad_prl shows only B.Cu + Edge.Cuts (B.Cu active).
  work/gerber    the delivered Gerber zip unpacked (for GerbView).
  work/demo      tiny hand-written schematic project (LED + resistor + 2-pin connector,
                 symbols embedded in the .kicad_sch because no symbol libraries are installed).
  work/home      fresh HOME with the Chinese KiCad config (copied from $KSHOT/home, with
                 zoom acceleration off so wheel / F1 zoom is repeatable).
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import zipfile
from pathlib import Path

from kslib import copy_project

KSHOT = Path(os.environ.get("KSHOT", "/tmp/claude-0/-home-claude/a03b22b4-4de2-59bd-890a-4be94b9a8f94/scratchpad/kshot"))
SRC = KSHOT / "QB12_KiCad"
WORK = KSHOT / "work"
GERBER_ZIP = Path(os.environ.get("QB12_GERBER_ZIP", "/mnt/user-data/outputs/QB12/QB12_Gerber.zip"))

# JLC tutorial (facts.md 5.1) as pcbplotparams tokens
JLC_PLOT = {
    "usegerberextensions": "yes",        # Use Protel filename extensions
    "usegerberattributes": "no",         # Gerber X2 off (嘉立创不接受 X2)
    "usegerberadvancedattributes": "no", # netlist attributes off
    "creategerberjobfile": "no",         # job file off
    "disableapertmacros": "no",
    "useauxorigin": "no",                # absolute origin, like the JLC tutorial
    "viasonmask": "no",                  # vias tented
    "plotreference": "yes",
    "plotfptext": "yes",
    "subtractmaskfromsilk": "yes",
    "plotframeref": "no",
    "plotinvisibletext": "no",
    "outputdirectory": '"gerber/"',
}


TEMPLATES = Path(__file__).resolve().parent / "kicad_config"
CANVAS = int(os.environ.get("KSHOT_CANVAS", "2"))   # 1 = OpenGL, 2 = Cairo (no GL glitches in dialogs)


def _patch_json(path: Path, fn):
    d = json.loads(path.read_text())
    fn(d)
    path.write_text(json.dumps(d, indent=2))


def fresh_home() -> Path:
    """HOME with KiCad 8 settings: Chinese UI, maximized windows, repeatable zoom, and the
    JLC drill / placement-file choices (facts.md 5.2 / 5.4) preset so the dialogs open with them."""
    home = WORK / "home"
    if home.exists():
        shutil.rmtree(home)
    cfgdir = home / ".config/kicad/8.0"
    cfgdir.mkdir(parents=True)
    shutil.copy(KSHOT / "home/.config/kicad/8.0/fp-lib-table", cfgdir / "fp-lib-table")
    if (KSHOT / "home/.config/kicad/8.0/colors").exists():
        shutil.copytree(KSHOT / "home/.config/kicad/8.0/colors", cfgdir / "colors")
    for f in TEMPLATES.glob("*.json"):
        shutil.copy(f, cfgdir / f.name)

    def common(c):
        c["system"]["language"] = "简体中文"
        c.setdefault("input", {}).update({"zoom_acceleration": False, "center_on_zoom": True,
                                          "warp_mouse_on_move": False})
        c.setdefault("netclass_panel", {})["sash_pos"] = 286    # show all 5 net classes
    _patch_json(cfgdir / "kicad_common.json", common)

    _patch_json(cfgdir / "3d_viewer.json",       # no rollover highlight in the 3D shots
                lambda p: p["render"].update({"opengl_highlight_on_rollover": False}))

    def pcbnew(p):
        p["graphics"]["canvas_type"] = CANVAS
        p["gen_drill"].update({"drill_file_type": 0, "map_file_type": 1, "merge_pth_npth": False,
                               "minimal_header": False, "mirror": False, "unit_drill_is_inch": False,
                               "use_route_for_oval_holes": False, "zeros_format": 0})
        p["place_file"].update({"file_format": 1, "units": 1, "file_options": 1,   # CSV, mm, one file
                                "onlySMD": False, "excludeTH": False, "negate_xcoord": False,
                                "use_place_file_origin": False})                   # absolute, like Gerber
        p["plot"]["check_zones_before_plotting"] = True
        p["window"]["maximized"] = True
    _patch_json(cfgdir / "pcbnew.json", pcbnew)
    for name in ("fpedit.json", "cvpcb.json", "kicad.json"):
        def gal(p):
            if "graphics" in p:
                p["graphics"]["canvas_type"] = CANVAS
            if "window" in p:
                p["window"]["maximized"] = True
        _patch_json(cfgdir / name, gal)
    sym = cfgdir / "sym-lib-table"            # no symbol libs installed: an empty global table
    sym.write_text("(sym_lib_table\n  (version 7)\n)\n")   # stops the "configure global table" wizard
    return home


# visible_items = GAL layer offsets (KiCad 8 layer_ids.h): 0-3 vias, 4 NPTH holes, 8 anchors,
# 9/10 SMD pads, 11 ratsnest, 20 TH pads, 21 plated holes, 22 via holes, 32 pads ...
ALL_ITEMS = [0, 1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
             27, 28, 29, 30, 32, 33, 34, 35, 36, 39, 40]


def set_prl(d: Path, visible_layers: str, active_layer: int | None = None, hide_items=()):
    """Layer visibility lives in the project's .kicad_prl; editing it is the simplest way to open
    the board with only some layers shown (hex LSET: 7 digits for layers 32..59, 8 for 0..31)."""
    def fn(p):
        p["board"]["visible_layers"] = visible_layers
        if active_layer is not None:
            p["board"]["active_layer"] = active_layer
        p["board"]["visible_items"] = [i for i in ALL_ITEMS if i not in hide_items]
    _patch_json(d / "QB12.kicad_prl", fn)


def set_plot_params(pcb: Path, params: dict):
    s = pcb.read_text()
    for k, v in params.items():
        s, n = re.subn(rf"\({k} [^)]*\)", f"({k} {v})", s, count=1)
        if not n:
            s = s.replace("(pcbplotparams", f"(pcbplotparams\n\t\t\t({k} {v})", 1)
    pcb.write_text(s)


def make_jlc():
    d = copy_project(SRC, WORK / "qb12_jlc")
    set_plot_params(d / "QB12.kicad_pcb", JLC_PLOT)
    pro = d / "QB12.kicad_pro"
    p = json.loads(pro.read_text())
    ds = p["board"]["design_settings"]
    ds["track_widths"] = [0.0, 0.2, 0.3, 0.4, 0.5, 0.8]          # [0] = "use net class"
    ds["via_dimensions"] = [{"diameter": 0.0, "drill": 0.0},
                            {"diameter": 0.6, "drill": 0.3},
                            {"diameter": 0.8, "drill": 0.4}]
    pro.write_text(json.dumps(p, indent=2))


def make_route():
    """Remove the U5 pin 1 -> U1 pin 14 part of USB_DP (4 segments, all F.Cu) so the shot can
    re-route it live along its original corridor, right next to the USB_DN track."""
    d = copy_project(SRC, WORK / "route")
    code = f"""
import pcbnew
b = pcbnew.LoadBoard({str(d / 'QB12.kicad_pcb')!r})
mm = pcbnew.ToMM
gone = [t for t in b.GetTracks() if t.GetNetname() == 'USB_DP'
        and min(mm(t.GetStart().y), mm(t.GetEnd().y)) < 126.0]
for t in gone:
    b.Remove(t)
b.Save({str(d / 'QB12.kicad_pcb')!r})
print('removed', len(gone))
"""
    subprocess.run(["python3.12", "-I", "-c", code], check=True)


def make_gerber():
    g = WORK / "gerber"
    if g.exists():
        shutil.rmtree(g)
    g.mkdir(parents=True)
    with zipfile.ZipFile(GERBER_ZIP) as z:
        for n in z.namelist():
            if "/" in n or n.startswith(".") or ".." in n:
                continue
            (g / n).write_bytes(z.read(n))


def main():
    WORK.mkdir(parents=True, exist_ok=True)
    fresh_home()
    copy_project(SRC, WORK / "qb12")
    make_jlc()
    make_route()
    # Edge.Cuts (44) + F.Courtyard (47) only  /  B.Cu (31) + Edge.Cuts, B.Cu active
    set_prl(copy_project(SRC, WORK / "edge"), "0009000_00000000",
            hide_items=(0, 1, 2, 3, 4, 8, 9, 10, 11, 20, 21, 22, 32))   # no vias / pads / anchors
    set_prl(copy_project(SRC, WORK / "bcu"), "0001000_80000000", active_layer=31,
            hide_items=(8,))                                            # no footprint anchors
    make_gerber()
    from demo_project import write_demo
    write_demo(WORK / "demo")
    print("prepared", WORK)


if __name__ == "__main__":
    main()
