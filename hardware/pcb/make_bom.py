import csv, sys
from collections import OrderedDict
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from netlist import PARTS

OUT = sys.argv[1]
groups = OrderedDict()
for ref, p in PARTS.items():
    key = (p["value"], p["lcsc"], p["fp"])
    g = groups.setdefault(key, dict(refs=[], lib=p["lib"], descs=[]))
    g["refs"].append(ref)
    if p["desc"] not in g["descs"]:
        g["descs"].append(p["desc"])

def natural(r):
    import re
    m = re.match(r"([A-Z]+)(\d+)", r)
    return (m.group(1), int(m.group(2)))

rows = []
for (value, lcsc, fp), g in groups.items():
    refs = sorted(g["refs"], key=natural)
    rows.append([",".join(refs), value, fp, len(refs), lcsc, g["lib"], "；".join(g["descs"])])
order = {"U": 0, "Q": 1, "D": 2, "LED": 3, "J": 4, "SW": 5, "R": 6, "C": 7}
rows.sort(key=lambda r: (order[natural(r[0].split(",")[0])[0]], natural(r[0].split(",")[0])[1]))

# 嘉立创 SMT 上传用 CSV（Comment / Designator / Footprint / LCSC）
with open(f"{OUT}/QB12_BOM_嘉立创SMT.csv", "w", newline="", encoding="utf-8-sig") as f:
    w = csv.writer(f)
    w.writerow(["Comment", "Designator", "Footprint", "Quantity", "LCSC Part #"])
    for r in rows:
        w.writerow([r[1], r[0], r[2], r[3], r[4]])

wb = Workbook(); ws = wb.active; ws.title = "BOM"
head = ["位号", "型号 / 数值", "封装", "数量", "立创编号", "嘉立创库", "用途"]
ws.append(["Boat QB12 主控板 BOM · Rev A · 2026-10-13（立创商城核对）"])
ws.append(head)
for r in rows:
    ws.append(r)
n_ext = sum(1 for r in rows if r[5] == "扩展")
ws.append([])
ws.append([f"共 {len(rows)} 种、{sum(r[3] for r in rows)} 个器件；其中扩展库 {n_ext} 种（每种另收换料费），其余为基础库。"])
ws.append(["电池选「带保护板」的 1S 3.7V 锂电池（PH2.0 插头），板上不再做电池保护。"])
ws.append(["电机两端各焊一颗 0.1µF 瓷片电容（不在 BOM 里，焊在电机上）。"])
ws["A1"].font = Font(bold=True, size=13)
hdr = PatternFill("solid", fgColor="1D2A2E")
thin = Side(style="thin", color="C9D3D1")
for c in ws[2]:
    c.font = Font(bold=True, color="FFFFFF"); c.fill = hdr; c.alignment = Alignment(vertical="center")
for row in ws.iter_rows(min_row=3, max_row=2 + len(rows)):
    for c in row:
        c.border = Border(bottom=thin); c.alignment = Alignment(vertical="center", wrap_text=True)
    if row[5].value == "扩展":
        row[5].font = Font(color="C2410C", bold=True)
for col, wdt in zip("ABCDEFG", (22, 26, 20, 7, 12, 10, 22)):
    ws.column_dimensions[col].width = wdt
ws.freeze_panes = "A3"
wb.save(f"{OUT}/QB12_BOM.xlsx")
print(len(rows), "lines;", sum(r[3] for r in rows), "parts;", n_ext, "extended types")
for r in rows: print(r)
