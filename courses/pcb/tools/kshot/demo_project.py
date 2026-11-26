"""demo_project.py - write a tiny KiCad project (KiCad 8 format; KiCad 10 opens and upgrades it) (schematic + empty board) by hand.

No KiCad symbol libraries are installed in this container, so the three symbols
(Device:R, Device:LED, Connector_Generic:Conn_01x02) are embedded in the schematic's
lib_symbols block, exactly as KiCad itself stores them. Nets are joined with local labels
placed on the pin ends (VIN, LED_A, GND).

Footprints: R1 / D1 get stock 0603 footprints, J1 is left EMPTY on purpose: the
"分配封装" (Assign Footprints) shot shows it unassigned, then assigns JST_PH_B2B-PH-K and the
"从原理图更新 PCB" shot (F8) adds all three to the empty board.
"""
from __future__ import annotations

import json
import subprocess
import sys
import uuid
from pathlib import Path

ROOT_UUID = "6b1f0c2e-2d8a-4a63-9a3b-6f0b8c1d2e01"


def _u(seed: str) -> str:
    return str(uuid.uuid5(uuid.UUID(ROOT_UUID), seed))


LIB_SYMBOLS = r'''
	(lib_symbols
		(symbol "Connector_Generic:Conn_01x02"
			(pin_names (offset 1.016) hide)
			(exclude_from_sim no) (in_bom yes) (on_board yes)
			(property "Reference" "J" (at 0 2.54 0) (effects (font (size 1.27 1.27))))
			(property "Value" "Conn_01x02" (at 0 -5.08 0) (effects (font (size 1.27 1.27))))
			(property "Footprint" "" (at 0 0 0) (effects (font (size 1.27 1.27)) hide))
			(property "Datasheet" "~" (at 0 0 0) (effects (font (size 1.27 1.27)) hide))
			(property "Description" "Generic connector, single row, 01x02" (at 0 0 0) (effects (font (size 1.27 1.27)) hide))
			(property "ki_fp_filters" "Connector*:*_1x??_*" (at 0 0 0) (effects (font (size 1.27 1.27)) hide))
			(symbol "Conn_01x02_1_1"
				(rectangle (start -1.27 -2.413) (end 0 -2.667) (stroke (width 0.1524) (type default)) (fill (type none)))
				(rectangle (start -1.27 0.127) (end 0 -0.127) (stroke (width 0.1524) (type default)) (fill (type none)))
				(rectangle (start -1.27 1.27) (end 1.27 -3.81) (stroke (width 0.254) (type default)) (fill (type background)))
				(pin passive line (at -5.08 0 0) (length 3.81) (name "Pin_1" (effects (font (size 1.27 1.27)))) (number "1" (effects (font (size 1.27 1.27)))))
				(pin passive line (at -5.08 -2.54 0) (length 3.81) (name "Pin_2" (effects (font (size 1.27 1.27)))) (number "2" (effects (font (size 1.27 1.27)))))
			)
		)
		(symbol "Device:LED"
			(pin_numbers hide)
			(pin_names (offset 1.016) hide)
			(exclude_from_sim no) (in_bom yes) (on_board yes)
			(property "Reference" "D" (at 0 2.54 0) (effects (font (size 1.27 1.27))))
			(property "Value" "LED" (at 0 -2.54 0) (effects (font (size 1.27 1.27))))
			(property "Footprint" "" (at 0 0 0) (effects (font (size 1.27 1.27)) hide))
			(property "Datasheet" "~" (at 0 0 0) (effects (font (size 1.27 1.27)) hide))
			(property "Description" "Light emitting diode" (at 0 0 0) (effects (font (size 1.27 1.27)) hide))
			(property "ki_fp_filters" "LED* LED_SMD:* LED_THT:*" (at 0 0 0) (effects (font (size 1.27 1.27)) hide))
			(symbol "LED_0_1"
				(polyline (pts (xy -1.27 -1.27) (xy -1.27 1.27)) (stroke (width 0.254) (type default)) (fill (type none)))
				(polyline (pts (xy -1.27 0) (xy 1.27 0)) (stroke (width 0) (type default)) (fill (type none)))
				(polyline (pts (xy 1.27 -1.27) (xy 1.27 1.27) (xy -1.27 0) (xy 1.27 -1.27)) (stroke (width 0.254) (type default)) (fill (type none)))
				(polyline (pts (xy -3.048 -0.762) (xy -4.572 -2.286) (xy -3.81 -2.286) (xy -4.572 -2.286) (xy -4.572 -1.524)) (stroke (width 0) (type default)) (fill (type none)))
				(polyline (pts (xy -1.778 -0.762) (xy -3.302 -2.286) (xy -2.54 -2.286) (xy -3.302 -2.286) (xy -3.302 -1.524)) (stroke (width 0) (type default)) (fill (type none)))
			)
			(symbol "LED_1_1"
				(pin passive line (at -3.81 0 0) (length 2.54) (name "K" (effects (font (size 1.27 1.27)))) (number "1" (effects (font (size 1.27 1.27)))))
				(pin passive line (at 3.81 0 180) (length 2.54) (name "A" (effects (font (size 1.27 1.27)))) (number "2" (effects (font (size 1.27 1.27)))))
			)
		)
		(symbol "Device:R"
			(pin_numbers hide)
			(pin_names (offset 0))
			(exclude_from_sim no) (in_bom yes) (on_board yes)
			(property "Reference" "R" (at 2.032 0 90) (effects (font (size 1.27 1.27))))
			(property "Value" "R" (at 0 0 90) (effects (font (size 1.27 1.27))))
			(property "Footprint" "" (at -1.778 0 90) (effects (font (size 1.27 1.27)) hide))
			(property "Datasheet" "~" (at 0 0 0) (effects (font (size 1.27 1.27)) hide))
			(property "Description" "Resistor" (at 0 0 0) (effects (font (size 1.27 1.27)) hide))
			(property "ki_fp_filters" "R_*" (at 0 0 0) (effects (font (size 1.27 1.27)) hide))
			(symbol "R_0_1"
				(rectangle (start -1.016 -2.54) (end 1.016 2.54) (stroke (width 0.254) (type default)) (fill (type none)))
			)
			(symbol "R_1_1"
				(pin passive line (at 0 3.81 270) (length 1.27) (name "~" (effects (font (size 1.27 1.27)))) (number "1" (effects (font (size 1.27 1.27)))))
				(pin passive line (at 0 -3.81 90) (length 1.27) (name "~" (effects (font (size 1.27 1.27)))) (number "2" (effects (font (size 1.27 1.27)))))
			)
		)
	)
'''


def _symbol(lib_id, ref, value, fp, x, y, rot, pins, lcsc=""):
    pin_s = "\n".join(f'\t\t(pin "{p}" (uuid "{_u(ref + p)}"))' for p in pins)
    lcsc_s = (f'\t\t(property "LCSC" "{lcsc}" (at {x} {y} 0) (effects (font (size 1.27 1.27)) hide))\n'
              if lcsc else "")
    return f'''	(symbol
		(lib_id "{lib_id}")
		(at {x} {y} {rot})
		(unit 1)
		(exclude_from_sim no) (in_bom yes) (on_board yes) (dnp no)
		(uuid "{_u(ref)}")
		(property "Reference" "{ref}" (at {x + 3} {y - 3} 0) (effects (font (size 1.27 1.27)) (justify left)))
		(property "Value" "{value}" (at {x + 3} {y + 3} 0) (effects (font (size 1.27 1.27)) (justify left)))
		(property "Footprint" "{fp}" (at {x} {y} 0) (effects (font (size 1.27 1.27)) hide))
		(property "Datasheet" "~" (at {x} {y} 0) (effects (font (size 1.27 1.27)) hide))
{lcsc_s}{pin_s}
		(instances (project "demo" (path "/{ROOT_UUID}" (reference "{ref}") (unit 1))))
	)
'''


def _label(name, x, y, rot=0):
    return (f'\t(label "{name}" (at {x} {y} {rot}) (fields_autoplaced yes)\n'
            f'\t\t(effects (font (size 1.27 1.27)) (justify left bottom))\n'
            f'\t\t(uuid "{_u("lbl" + name + str(x) + str(y))}"))\n')


def _wire(x1, y1, x2, y2):
    return (f'\t(wire (pts (xy {x1} {y1}) (xy {x2} {y2})) (stroke (width 0) (type default))'
            f' (uuid "{_u(f"w{x1},{y1},{x2},{y2}")}"))\n')


def schematic(j1_fp: str = "") -> str:
    # all positions on the 1.27 mm grid, top-left area of the A5 sheet
    # J1 at (69.85, 50.8): pin1 end (64.77, 50.8), pin2 end (64.77, 53.34)
    # R1 at (50.8, 50.8) vertical: pin1 (50.8, 46.99), pin2 (50.8, 54.61)
    # D1 at (50.8, 63.5) horizontal: K (46.99, 63.5), A (54.61, 63.5)
    parts = [
        _symbol("Connector_Generic:Conn_01x02", "J1", "BATT", j1_fp, 69.85, 50.8, 0, ["1", "2"]),
        _symbol("Device:R", "R1", "1k", "Resistor_SMD:R_0603_1608Metric", 50.8, 50.8, 0, ["1", "2"],
                "C21190"),
        _symbol("Device:LED", "D1", "RED", "LED_SMD:LED_0603_1608Metric", 50.8, 63.5, 0, ["1", "2"],
                "C2286"),
    ]
    wires = [
        _wire(64.77, 50.8, 59.69, 50.8), _wire(64.77, 53.34, 59.69, 53.34),
        _wire(50.8, 46.99, 50.8, 44.45), _wire(50.8, 54.61, 50.8, 57.15),
        _wire(54.61, 63.5, 58.42, 63.5), _wire(46.99, 63.5, 43.18, 63.5),
    ]
    labels = [
        _label("VIN", 59.69, 50.8, 180), _label("GND", 59.69, 53.34, 180),
        _label("VIN", 50.8, 44.45, 90), _label("LED_A", 50.8, 57.15, 270),
        _label("LED_A", 58.42, 63.5, 0), _label("GND", 43.18, 63.5, 180),
    ]
    return ("(kicad_sch\n\t(version 20231120)\n\t(generator \"eeschema\")\n\t(generator_version \"8.0\")\n"
            f"\t(uuid \"{ROOT_UUID}\")\n\t(paper \"A5\")\n"
            "\t(title_block (title \"LED demo\") (comment 1 \"kshot demo project\"))\n"
            + LIB_SYMBOLS + "".join(wires) + "".join(labels) + "".join(parts) +
            "\t(sheet_instances (path \"/\" (page \"1\")))\n)\n")


def write_demo(d: Path, j1_fp: str = ""):
    d = Path(d)
    d.mkdir(parents=True, exist_ok=True)
    for f in d.iterdir():
        if f.is_file():
            f.unlink()
    (d / "demo.kicad_sch").write_text(schematic(j1_fp))
    (d / "demo.kicad_pro").write_text(json.dumps({
        "meta": {"filename": "demo.kicad_pro", "version": 1},
        "sheets": [[ROOT_UUID, "Root"]],
    }, indent=2))
    (d / "sym-lib-table").write_text("(sym_lib_table\n  (version 7)\n)\n")
    # empty board with a 30 x 20 mm outline, made with KiCad's own python
    code = f"""
import pcbnew
b = pcbnew.NewBoard({str(d / 'demo.kicad_pcb')!r})
r = pcbnew.PCB_SHAPE(b)
r.SetShape(pcbnew.SHAPE_T_RECT)
r.SetStart(pcbnew.VECTOR2I(pcbnew.FromMM(100), pcbnew.FromMM(80)))
r.SetEnd(pcbnew.VECTOR2I(pcbnew.FromMM(130), pcbnew.FromMM(100)))
r.SetLayer(pcbnew.Edge_Cuts)
r.SetWidth(pcbnew.FromMM(0.1))
b.Add(r)
b.Save({str(d / 'demo.kicad_pcb')!r})
"""
    # run with a Python that has pcbnew (KiCad's own, e.g. $KPY from tools/kicad_env.sh)
    subprocess.run([sys.executable, "-I", "-c", code], check=True)
    return d


if __name__ == "__main__":
    write_demo(Path(sys.argv[1]), sys.argv[2] if len(sys.argv) > 2 else "")
