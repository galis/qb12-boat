import sys, pcbnew
from shapely.geometry import Point, Polygon, LineString
OX = OY = 100.0
mm = pcbnew.ToMM
b = pcbnew.LoadBoard(sys.argv[1])
G = b.FindNet("GND").GetNetCode()
zlay = lambda z: z.GetLayerSet().Seq()[0]
L = lambda v: (mm(v.x) - OX, mm(v.y) - OY)
isl = []
for z in b.Zones():
    if z.GetIsRuleArea() or z.GetNetCode() != G: continue
    ps = z.GetFilledPolysList(zlay(z))
    for i in range(ps.OutlineCount()):
        o = ps.Outline(i)
        holes = [[L(ps.Hole(i, h).CPoint(j)) for j in range(ps.Hole(i, h).PointCount())] for h in range(ps.HoleCount(i))]
        isl.append((b.GetLayerName(zlay(z)), Polygon([L(o.CPoint(j)) for j in range(o.PointCount())], holes).buffer(0)))
par = list(range(len(isl)))
def f(a):
    while par[a] != a: par[a] = par[par[a]]; a = par[a]
    return a
def u(a, c): par[f(a)] = f(c)
links = []
for t in b.GetTracks():
    if t.GetNetCode() != G: continue
    if t.Type() == pcbnew.PCB_VIA_T:
        links.append([Point(L(t.GetPosition()))] * 2 + ["via"])
    else:
        links.append([Point(L(t.GetStart())), Point(L(t.GetEnd())), t.GetLayerName()])
for fp in b.GetFootprints():
    for p in fp.Pads():
        if p.GetNetCode() == G and p.GetAttribute() == pcbnew.PAD_ATTRIB_PTH:
            links.append([Point(L(p.GetPosition()))] * 2 + ["via"])
for a_, b_, kind in links:
    hit = [i for i, (ly, g) in enumerate(isl) if (kind == "via" or kind == ly) and (g.distance(a_) < 0.05 or g.distance(b_) < 0.05)]
    for h in hit[1:]: u(hit[0], h)
comps = {}
for i in range(len(isl)): comps.setdefault(f(i), []).append(i)
main = max(comps.values(), key=lambda c: sum(isl[i][1].area for i in c))
for c in comps.values():
    if c is main: continue
    for i in c:
        ly, g = isl[i]; p = g.representative_point()
        print(f"isolated {ly} island area {g.area:.2f} at {p.x:.2f},{p.y:.2f} bounds {[round(v,1) for v in g.bounds]}")
print("islands", len(isl), "components", len(comps))
from shapely.ops import unary_union
for ly in ("F.Cu","B.Cu"):
    gs=[isl[i][1] for i in main if isl[i][0]==ly]
    u=unary_union(gs)
    print(ly, len(gs), round(u.area,1), u.is_valid, u.geom_type)
