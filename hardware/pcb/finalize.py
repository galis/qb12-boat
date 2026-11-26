"""收尾：设置坐标原点（左下角）、背面丝印标注、嘉立创订单号位置，重新铺铜后保存。
用法：python3.12 finalize.py SRC.kicad_pcb DST.kicad_pcb"""
import sys
import pcbnew

SRC, DST = sys.argv[1], sys.argv[2]
OX, OY, BW, BH = 100.0, 100.0, 56.0, 38.0
b = pcbnew.LoadBoard(SRC)


def P(x, y):
    return pcbnew.VECTOR2I(pcbnew.FromMM(OX + x), pcbnew.FromMM(OY + y))


# 只保留位号丝印；LCSC 编号、型号等字段全部隐藏
hidden = 0
for fp in b.GetFootprints():
    for f in fp.GetFields():
        if f.GetName() != "Reference" and f.IsVisible():
            f.SetVisible(False); hidden += 1
print("hidden fields:", hidden)

# ---- 位号自动摆放：放在器件外框旁边、不压焊盘/过孔/别的器件/别的位号；放不下就隐藏 ----
from shapely.geometry import box as sbox, Point
from shapely.ops import unary_union
mm = pcbnew.ToMM


def lb(bb):
    return sbox(mm(bb.GetLeft()) - OX, mm(bb.GetTop()) - OY, mm(bb.GetRight()) - OX, mm(bb.GetBottom()) - OY)


crt = {}
for fp in b.GetFootprints():
    bb = fp.GetCourtyard(pcbnew.F_CrtYd).BBox() if fp.GetCourtyard(pcbnew.F_CrtYd).OutlineCount() else fp.GetBoundingBox(False, False)
    crt[fp.GetReference()] = lb(bb)
obst = []
for fp in b.GetFootprints():
    for pad in fp.Pads():
        obst.append(lb(pad.GetBoundingBox()).buffer(0.15))
# 过孔是盖油的，丝印可以压在上面，不算障碍
obst_u = unary_union(obst)
inside = sbox(0.4, 0.4, BW - 0.4, BH - 0.4).difference(sbox(34.0, 0, BW, 7.4))   # 天线区也不放字
placed = []
H = 0.8
for fp in sorted(b.GetFootprints(), key=lambda f: -crt[f.GetReference()].area):
    ref = fp.GetReference()
    r = fp.Reference()
    r.SetTextSize(pcbnew.VECTOR2I(pcbnew.FromMM(H), pcbnew.FromMM(H)))
    r.SetTextThickness(pcbnew.FromMM(0.15))
    r.SetLayer(pcbnew.F_SilkS)
    c = crt[ref]
    x0, y0, x1, y1 = c.bounds
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    others = unary_union([g.buffer(-0.25) for k, g in crt.items() if k != ref])
    tw = len(ref) * H * 0.75 + 0.2
    cands = []
    for ang in (0, 90):
        w, h = (tw, H + 0.2) if ang == 0 else (H + 0.2, tw)
        for gap in (0.05, 0.3, 0.6):
            for px, py in [(cx, y0 - h / 2 - gap), (cx, y1 + h / 2 + gap), (x0 - w / 2 - gap, cy), (x1 + w / 2 + gap, cy),
                           (x0 + w / 2, y0 - h / 2 - gap), (x1 - w / 2, y0 - h / 2 - gap),
                           (x0 + w / 2, y1 + h / 2 + gap), (x1 - w / 2, y1 + h / 2 + gap)]:
                cands.append((ang, px, py, sbox(px - w / 2, py - h / 2, px + w / 2, py + h / 2)))
    cands.sort(key=lambda c_: (c_[0] != 0) * 0.5 + abs(c_[1] - cx) * 0.0 + Point(c_[1], c_[2]).distance(Point(cx, cy)) / 10)
    for ang, px, py, g in cands:
        if inside.contains(g) and not g.intersects(obst_u) and not g.intersects(others) and \
                not any(g.intersects(p) for p in placed):
            r.SetTextAngleDegrees(ang)
            r.SetPosition(P(px, py))
            r.SetHorizJustify(pcbnew.GR_TEXT_H_ALIGN_CENTER)
            r.SetVertJustify(pcbnew.GR_TEXT_V_ALIGN_CENTER)
            r.SetVisible(True)
            placed.append(g)
            break
    else:
        r.SetVisible(False)
        print("  ref hidden:", ref)

ds = b.GetDesignSettings()
ds.SetAuxOrigin(P(0, BH))
ds.SetGridOrigin(P(0, BH))


def text(s, x, y, h=1.0, layer=pcbnew.B_SilkS, bold=False, ang=0):
    t = pcbnew.PCB_TEXT(b)
    t.SetText(s)
    t.SetPosition(P(x, y))
    t.SetLayer(layer)
    t.SetTextSize(pcbnew.VECTOR2I(pcbnew.FromMM(h), pcbnew.FromMM(h)))
    t.SetTextThickness(pcbnew.FromMM(max(0.15, h * 0.15)))
    t.SetBold(bold)
    if layer in (pcbnew.B_SilkS, pcbnew.B_Cu):
        t.SetMirrored(True)
    t.SetHorizJustify(pcbnew.GR_TEXT_H_ALIGN_CENTER)
    t.SetTextAngleDegrees(ang)
    b.Add(t)


# 背面（没有器件）：接口说明，翻过来就能看
text("L MOTOR", 5.4, 5.6, 1.0)
text("R MOTOR", 5.4, 14.6, 1.0)
text("BATTERY 1S", 5.4, 32.2, 1.0)
text("+", 9.6, 31.2, 1.2, bold=True)
text("-", 9.6, 33.3, 1.2, bold=True)
text("POWER", 6.3, 23.6, 1.0, ang=90)
text("USB-C 5V", 26.5, 35.6, 1.0)
text("BOOT", 38.7, 35.0, 1.0)
text("RESET", 45.9, 35.0, 1.0)
text("CHG", 11.4, 25.6, 0.8)
text("FULL", 11.2, 27.5, 0.8)
text("Boat QB12", 44.0, 20.0, 1.6, bold=True)
text("Rev A  2026-10", 44.0, 22.6, 1.0)
text("JLCJLCJLCJLC", 44.0, 25.0, 0.8)

b.BuildConnectivity()
pcbnew.ZONE_FILLER(b).Fill(b.Zones())
pcbnew.SaveBoard(DST, b)
print("saved", DST)
