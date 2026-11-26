"""第二步：导回 SES -> 给每个接地焊盘就近打过孔 -> 模组接地焊盘之间打过孔 -> 全板缝合过孔
-> 禁布区 + 两层整面铺地 -> 填充 -> 删掉没接上地的缝合孔 -> 再填充 -> 保存。
用法：python3.12 route_b.py SRC.kicad_pcb SES DST.kicad_pcb [fanout]
fanout 模式：不导 SES（SES 写 -），只给接地焊盘打扇出过孔（锁定），供自动布线前使用。"""
import sys, math
import pcbnew
from shapely.geometry import Point, LineString, Polygon, box
from shapely.ops import unary_union
from shapely.strtree import STRtree

SRC, SES, DST = sys.argv[1], sys.argv[2], sys.argv[3]
FANOUT = len(sys.argv) > 4 and sys.argv[4] == "fanout"
OX, OY, BW, BH = 100.0, 100.0, 56.0, 38.0
ANT = (34.0, -1.0, 57.0, 7.4)
EPK = (39.9, 13.0, 45.1, 18.2)          # 模组接地焊盘区：两层不走线
VIA_D, VIA_H = 0.6, 0.3
CLR = 0.2                                # 过孔/导线到别的网络铜皮
HOLE_GAP = 0.3                           # 孔到孔
EDGE = 0.3 + VIA_D / 2 + 0.1

mm = pcbnew.ToMM
b = pcbnew.LoadBoard(SRC)
for z in list(b.Zones()):
    b.Remove(z)
b.SynchronizeNetsAndNetClasses(True)
if SES != "-":
    assert pcbnew.ImportSpecctraSES(b, SES), "SES import failed"
GND = b.FindNet("GND")


def split_t_junctions():
    """自动布线有时把线头接在另一段线的中间（T 形）。在交点处把那段线拆成两段，避免“悬空线头”警告。"""
    n = 0
    segs = [t for t in b.GetTracks() if t.Type() == pcbnew.PCB_TRACE_T]
    for t in segs:
        for e in (t.GetStart(), t.GetEnd()):
            for u in segs:
                if u is t or u.GetNetCode() != t.GetNetCode() or u.GetLayer() != t.GetLayer():
                    continue
                a, c = u.GetStart(), u.GetEnd()
                if e == a or e == c:
                    continue
                # 点到线段距离
                ax, ay, cx_, cy_, ex, ey = a.x, a.y, c.x, c.y, e.x, e.y
                L2 = (cx_ - ax) ** 2 + (cy_ - ay) ** 2
                if L2 == 0:
                    continue
                k = ((ex - ax) * (cx_ - ax) + (ey - ay) * (cy_ - ay)) / L2
                if not (0.001 < k < 0.999):
                    continue
                px, py = ax + k * (cx_ - ax), ay + k * (cy_ - ay)
                if (px - ex) ** 2 + (py - ey) ** 2 > 1000 ** 2:     # 1 µm 以内算在线上
                    continue
                v = pcbnew.PCB_TRACK(b)
                v.SetStart(e); v.SetEnd(c); v.SetWidth(u.GetWidth()); v.SetLayer(u.GetLayer())
                v.SetNet(u.GetNet()); v.SetLocked(u.IsLocked())
                u.SetEnd(e)
                b.Add(v); segs.append(v); n += 1
    return n


if SES != "-":
    print("T-junctions split:", split_t_junctions())


def zlay(z):  # 铺铜所在层（KiCad 8 里 B.Cu 铺铜的 GetLayer() 会返回 F.Cu，要用层集合）
    return z.GetLayerSet().Seq()[0]


def L(v):   # KiCad 内部坐标 -> 板子本地 mm
    return (mm(v.x) - OX, mm(v.y) - OY)


def ps_to_shapely(ps):
    polys = []
    for i in range(ps.OutlineCount()):
        o = ps.Outline(i)
        pts = [L(o.CPoint(j)) for j in range(o.PointCount())]
        if len(pts) >= 3:
            polys.append(Polygon(pts).buffer(0))
    return unary_union(polys)


LAYERS = {"F": pcbnew.F_Cu, "B": pcbnew.B_Cu}
copper = {"F": [], "B": []}      # (geom, is_gnd)
holes = []                       # (Point, radius)
pads_all = []                    # (geom, layerkey, is_gnd)

for fp in b.GetFootprints():
    for pad in fp.Pads():
        is_g = pad.GetNetCode() == GND.GetNetCode()
        for k, lid in LAYERS.items():
            if pad.IsOnLayer(lid):
                ps = pcbnew.SHAPE_POLY_SET()
                pad.TransformShapeToPolygon(ps, lid, 0, pcbnew.FromMM(0.005))
                g = ps_to_shapely(ps)
                copper[k].append((g, is_g))
                pads_all.append((g, k, is_g))
        if pad.GetDrillSize().x > 0:
            holes.append((Point(L(pad.GetPosition())), mm(pad.GetDrillSize().x) / 2))

for t in b.GetTracks():
    is_g = t.GetNetCode() == GND.GetNetCode()
    if t.Type() == pcbnew.PCB_VIA_T:
        p = Point(L(t.GetPosition()))
        for k in LAYERS:
            copper[k].append((p.buffer(mm(t.GetWidth()) / 2), is_g))
        holes.append((p, mm(t.GetDrill()) / 2))
    else:
        g = LineString([L(t.GetStart()), L(t.GetEnd())]).buffer(mm(t.GetWidth()) / 2)
        for k, lid in LAYERS.items():
            if t.GetLayer() == lid:
                copper[k].append((g, is_g))

foreign = {k: unary_union([g for g, isg in v if not isg]) for k, v in copper.items()}
allpads = {k: unary_union([g for g, kk, _ in pads_all if kk == k]) for k in LAYERS}
board_ok = box(EDGE, EDGE, BW - EDGE, BH - EDGE).difference(
    box(*ANT).buffer(VIA_D / 2 + 0.2)).difference(box(*EPK))
new_holes = []


def via_ok(x, y, clr=CLR, need_free_pads=True):
    c = Point(x, y)
    if not board_ok.contains(c):
        return False
    r = VIA_D / 2 + clr
    for k in LAYERS:
        if foreign[k].distance(c) < r:
            return False
        if need_free_pads and allpads[k].distance(c) < VIA_D / 2 + 0.1:
            return False
    for p, hr in holes + new_holes:
        if p.distance(c) < hr + VIA_H / 2 + HOLE_GAP:
            return False
    return True


def seg_ok(a, bpt, w):
    s = LineString([a, bpt]).buffer(w / 2 + CLR)
    if s.intersects(foreign["F"]):
        return False
    if s.intersects(box(*ANT)) or LineString([a, bpt]).buffer(w / 2).intersects(box(*EPK)) or \
            LineString([a, bpt]).buffer(w / 2).intersects(box(22.3, 33.8, 30.7, BH)):
        return False
    return True


def add_via(x, y):
    v = pcbnew.PCB_VIA(b)
    v.SetPosition(pcbnew.VECTOR2I(pcbnew.FromMM(OX + x), pcbnew.FromMM(OY + y)))
    v.SetWidth(pcbnew.FromMM(VIA_D)); v.SetDrill(pcbnew.FromMM(VIA_H))
    v.SetLayerPair(pcbnew.F_Cu, pcbnew.B_Cu)
    v.SetNet(GND); v.SetLocked(FANOUT)
    b.Add(v)
    new_holes.append((Point(x, y), VIA_H / 2))
    return v


def add_track(a, bpt, w):
    t = pcbnew.PCB_TRACK(b)
    t.SetStart(pcbnew.VECTOR2I(pcbnew.FromMM(OX + a[0]), pcbnew.FromMM(OY + a[1])))
    t.SetEnd(pcbnew.VECTOR2I(pcbnew.FromMM(OX + bpt[0]), pcbnew.FromMM(OY + bpt[1])))
    t.SetWidth(pcbnew.FromMM(w)); t.SetLayer(pcbnew.F_Cu); t.SetNet(GND); t.SetLocked(FANOUT)
    b.Add(t)


# ---- 0) 散热焊盘阵列过孔：DRV8833 (U2) 3x3、TP4056 (U4) 3x2，把热量导到底层地 ----
if FANOUT:
    ep_added = 0
    for ref_, num_, offs in (("U2", "17", [(0, 0), (1.0, 0), (-1.0, 0), (0, 1.0), (0, -1.0)]),
                             ("U4", "9", [(dx, dy) for dx in (-1.0, 0.0, 1.0) for dy in (-0.55, 0.55)])):
        fp_ = b.FindFootprintByReference(ref_)
        ep_ = [q for q in fp_.Pads() if q.GetNumber() == num_ and q.GetAttribute() == pcbnew.PAD_ATTRIB_SMD][0]
        ex, ey = L(ep_.GetPosition())
        for dx, dy in offs:
            x_, y_ = ex + dx, ey + dy
            if all(p_.distance(Point(x_, y_)) >= hr + VIA_H / 2 + HOLE_GAP for p_, hr in holes + new_holes):
                add_via(x_, y_); ep_added += 1
    print("EP thermal vias:", ep_added)

# ---- 1) 每个顶层接地 SMD 焊盘：就近打一个过孔，用短线连过去 ----
pad_vias, missed = 0, []
for fp in b.GetFootprints():
    ref = fp.GetReference()
    if ref == "U1":
        continue
    seen = set()
    for pad in fp.Pads():
        if pad.GetNetCode() != GND.GetNetCode() or pad.GetAttribute() != pcbnew.PAD_ATTRIB_SMD:
            continue
        if not pad.IsOnLayer(pcbnew.F_Cu):
            continue
        key = (pad.GetNumber(), round(mm(pad.GetPosition().x), 1), round(mm(pad.GetPosition().y), 1))
        if key in seen:
            continue
        seen.add(key)
        if any(t.GetNetCode() == GND.GetNetCode() and t.Type() != pcbnew.PCB_VIA_T and
               (pad.HitTest(t.GetStart()) or pad.HitTest(t.GetEnd())) for t in b.GetTracks()):
            continue
        cx, cy = L(pad.GetPosition())
        sx, sy = mm(pad.GetBoundingBox().GetWidth()) / 2, mm(pad.GetBoundingBox().GetHeight()) / 2
        w = 0.4 if min(sx, sy) * 2 >= 0.45 else 0.3
        # 芯片有接地散热焊盘的：接地脚直接往里连到散热焊盘，不往外占布线通道
        eps = []
        for q in fp.Pads():
            if q.GetNetCode() == GND.GetNetCode() and q.GetNumber() != pad.GetNumber() and \
                    q.GetAttribute() == pcbnew.PAD_ATTRIB_SMD and \
                    mm(q.GetSize().x) * mm(q.GetSize().y) > 2.0:
                ps_ = pcbnew.SHAPE_POLY_SET()
                q.TransformShapeToPolygon(ps_, pcbnew.F_Cu, 0, pcbnew.FromMM(0.005))
                eps.append(ps_to_shapely(ps_))
        if eps:
            from shapely.ops import nearest_points
            ep_in = unary_union(eps).buffer(-0.25)
            tgt = nearest_points(ep_in, Point(cx, cy))[0]
            # 起点放在焊盘靠里的一端，避免线头圆角伸出焊盘外沿、挡住相邻脚出线
            psp = pcbnew.SHAPE_POLY_SET()
            pad.TransformShapeToPolygon(psp, pcbnew.F_Cu, 0, pcbnew.FromMM(0.005))
            pin = ps_to_shapely(psp).buffer(-0.16)
            st = nearest_points(pin, tgt)[0] if not pin.is_empty else Point(cx, cy)
            if seg_ok((st.x, st.y), (tgt.x, tgt.y), 0.3):
                add_track((st.x, st.y), (tgt.x, tgt.y), 0.3)
                pad_vias += 1
                continue
        cands = []
        for ring in [0.0, 0.15, 0.3, 0.5, 0.75, 1.0, 1.3, 1.7, 2.2]:
            for a in range(0, 360, 15):
                dx, dy = math.cos(math.radians(a)), math.sin(math.radians(a))
                # 从焊盘外沿往外推
                reach = abs(dx) * sx + abs(dy) * sy + VIA_D / 2 + 0.12 + ring
                cands.append((reach, cx + dx * reach, cy + dy * reach))
        cands.sort()
        done = False
        for _, x, y in cands:
            if via_ok(x, y) and seg_ok((cx, cy), (x, y), w):
                add_via(x, y)
                add_track((cx, cy), (x, y), w)
                pad_vias += 1
                done = True
                break
        if not done:
            missed.append(f"{ref}.{pad.GetNumber()}")
print("pad vias:", pad_vias, " missed:", missed)
if FANOUT:
    # 模组左侧电容列的接地孔容易被走线围成孤岛：底层预留一段地线“脊”，把 C7 的地孔接到左边的大片地上
    for v in list(b.GetTracks()):
        if v.Type() == pcbnew.PCB_VIA_T and v.GetNetCode() == GND.GetNetCode():
            vx, vy = L(v.GetPosition())
            if abs(vx - 30.73) < 0.3 and abs(vy - 15.6) < 0.3:
                t = pcbnew.PCB_TRACK(b)
                t.SetStart(v.GetPosition())
                t.SetEnd(pcbnew.VECTOR2I(v.GetPosition().x - pcbnew.FromMM(4.0), v.GetPosition().y))
                t.SetWidth(pcbnew.FromMM(0.5)); t.SetLayer(pcbnew.B_Cu); t.SetNet(GND); t.SetLocked(True)
                b.Add(t)
                print("GND spine added from", round(vx, 2), round(vy, 2))
    pcbnew.SaveBoard(DST, b)
    print("fanout saved", DST)
    sys.exit(0)

# ---- 2) 模组中间 3x3 接地焊盘之间的 4 个空隙打过孔 ----
u1 = b.FindFootprintByReference("U1")
ep = sorted({L(p.GetPosition()) for p in u1.Pads() if p.GetNumber() == "41"})
xs = sorted({round(p[0], 2) for p in ep}); ys = sorted({round(p[1], 2) for p in ep})
ep_vias = 0
for i in range(len(xs) - 1):
    for j in range(len(ys) - 1):
        x, y = (xs[i] + xs[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2
        c = Point(x, y)
        if all(foreign[k].distance(c) >= VIA_D / 2 + CLR for k in LAYERS):
            add_via(x, y); ep_vias += 1
print("EP vias:", ep_vias)

# ---- 3) 全板缝合过孔（两层都有足够空地的地方） ----
stitch = []
step = 2.5
y = 1.5
while y < BH:
    x = 1.5 + (0 if int(y / step) % 2 == 0 else step / 2)
    while x < BW:
        if via_ok(x, y, clr=0.45) and all(Point(x, y).distance(p) > 1.6 for p, _ in new_holes):
            stitch.append(add_via(x, y))
        x += step
    y += step
print("stitch vias:", len(stitch))


# ---- 4) 禁布区 + 铺地 ----
def poly(points):
    sp = pcbnew.SHAPE_POLY_SET(); sp.NewOutline()
    for (px, py) in points:
        sp.Append(pcbnew.FromMM(OX + px), pcbnew.FromMM(OY + py))
    sp.thisown = False          # 交给 ZONE 管理，避免 Python 回收后悬空
    return sp


def rule_area(r, layers, tracks, vias, pour):
    z = pcbnew.ZONE(b)
    z.SetIsRuleArea(True)
    (getattr(z, "SetDoNotAllowZoneFills", None) or z.SetDoNotAllowCopperPour)(pour); z.SetDoNotAllowTracks(tracks); z.SetDoNotAllowVias(vias)  # KiCad 10 改名 ZoneFills
    z.SetDoNotAllowPads(False); z.SetDoNotAllowFootprints(False)
    ls = pcbnew.LSET()
    for l in layers:
        ls.AddLayer(l)
    z.SetLayerSet(ls)
    x0, y0, x1, y1 = r
    z.SetOutline(poly([(x0, y0), (x1, y0), (x1, y1), (x0, y1)]))
    b.Add(z)


x0, y0, x1, y1 = ANT
rule_area((max(x0, 0), max(y0, 0), min(x1, BW), y1), [pcbnew.F_Cu, pcbnew.B_Cu], True, True, True)
rule_area(EPK, [pcbnew.F_Cu, pcbnew.B_Cu], True, False, False)
rule_area((22.3, 33.8, 30.7, BH), [pcbnew.F_Cu], True, False, False)     # USB-C 外壳底下顶层不走线

zones = []
for layer in (pcbnew.F_Cu, pcbnew.B_Cu):
    z = pcbnew.ZONE(b)
    z.SetLayer(layer); z.SetNet(GND)
    z.SetMinThickness(pcbnew.FromMM(0.25))
    z.SetLocalClearance(pcbnew.FromMM(0.3))
    z.SetPadConnection(pcbnew.ZONE_CONNECTION_FULL)
    z.SetIslandRemovalMode(pcbnew.ISLAND_REMOVAL_MODE_ALWAYS)
    z.SetOutline(poly([(0.3, 0.3), (BW - 0.3, 0.3), (BW - 0.3, BH - 0.3), (0.3, BH - 0.3)]))
    b.Add(z); zones.append(z)
b.BuildConnectivity()
pcbnew.ZONE_FILLER(b).Fill(b.Zones())

# 缝合孔必须两层都落在铺铜里，否则删掉
removed = 0
for v in stitch:
    pos = v.GetPosition()
    if not all(z.HitTestFilledArea(zlay(z), pos) for z in zones):
        b.Remove(v); removed += 1
if removed:
    b.BuildConnectivity()
    pcbnew.ZONE_FILLER(b).Fill(b.Zones())
print("stitch removed:", removed, " kept:", len(stitch) - removed)
kept = {(round(mm(v.GetPosition().x) - OX, 3), round(mm(v.GetPosition().y) - OY, 3)) for v in b.GetTracks()
        if v.Type() == pcbnew.PCB_VIA_T}
new_holes[:] = [(p, r) for p, r in new_holes if (round(p.x, 3), round(p.y, 3)) in kept]


# ---- 5) 铺铜孤岛：用连通性找出没接到主地的铜皮，在里面补过孔接到另一层的主地 ----
def islands_all():
    out = []
    for z in zones:
        ps = z.GetFilledPolysList(zlay(z))
        for i in range(ps.OutlineCount()):
            o = ps.Outline(i)
            hs = [[L(ps.Hole(i, h).CPoint(j)) for j in range(ps.Hole(i, h).PointCount())] for h in range(ps.HoleCount(i))]
            out.append((b.GetLayerName(zlay(z)), Polygon([L(o.CPoint(j)) for j in range(o.PointCount())], hs).buffer(0)))
    return out


def gnd_components():
    isl = islands_all()
    par = list(range(len(isl)))

    def f(a):
        while par[a] != a:
            par[a] = par[par[a]]; a = par[a]
        return a
    links = []
    for t in b.GetTracks():
        if t.GetNetCode() != GND.GetNetCode():
            continue
        if t.Type() == pcbnew.PCB_VIA_T:
            p = Point(L(t.GetPosition())); links.append((p, p, None))
        else:
            links.append((Point(L(t.GetStart())), Point(L(t.GetEnd())), t.GetLayerName()))
    for fp in b.GetFootprints():
        for pad in fp.Pads():
            if pad.GetNetCode() == GND.GetNetCode() and pad.GetAttribute() == pcbnew.PAD_ATTRIB_PTH:
                p = Point(L(pad.GetPosition())); links.append((p, p, None))
    for p1, p2, ly in links:
        hit = [i for i, (l2, g) in enumerate(isl) if (ly is None or ly == l2) and (g.distance(p1) < 0.05 or g.distance(p2) < 0.05)]
        for h in hit[1:]:
            par[f(h)] = f(hit[0])
    comps = {}
    for i in range(len(isl)):
        comps.setdefault(f(i), []).append(i)
    main = max(comps.values(), key=lambda c: sum(isl[i][1].area for i in c))
    iso = [isl[i] for c in comps.values() if c is not main for i in c]
    mains = {"F.Cu": unary_union([isl[i][1] for i in main if isl[i][0] == "F.Cu"]),
             "B.Cu": unary_union([isl[i][1] for i in main if isl[i][0] == "B.Cu"])}
    return iso, mains


for it in range(5):
    iso, mains = gnd_components()
    if not iso:
        print(f"ground copper fully connected (pass {it})")
        break
    added = 0
    for ly, g in iso:
        other = mains["B.Cu" if ly == "F.Cu" else "F.Cu"]
        inner = g.buffer(-(VIA_D / 2 + 0.02))
        if inner.is_empty:
            continue
        x0_, y0_, x1_, y1_ = inner.bounds
        cands = []
        yy = y0_
        while yy <= y1_:
            xx = x0_
            while xx <= x1_:
                pt = Point(xx, yy)
                if inner.contains(pt):
                    cands.append((other.distance(pt), xx, yy))
                xx += 0.1
            yy += 0.1
        cands.sort()
        for dist, xx, yy in cands:
            if via_ok(xx, yy, clr=0.2):
                add_via(xx, yy); added += 1
                print(f"  bridge via on isolated {ly} island at {xx:.2f},{yy:.2f} (other-layer ground {dist:.2f} mm away)")
                break
        if added:
            break      # 一次补一个，重新铺铜再看
    if not added:
        for ly, g in iso:
            p = g.representative_point()
            print(f"  !! isolated {ly} island near {p.x:.1f},{p.y:.1f} area {g.area:.2f}: no via spot")
        break
    b.BuildConnectivity()
    pcbnew.ZONE_FILLER(b).Fill(b.Zones())

pcbnew.SaveBoard(DST, b)
print("saved", DST)
