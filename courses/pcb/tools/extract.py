"""从真实设计文件抽取 QB12 PCB 课用的数据（只读，不改任何设计文件）。

用法：source ../../tools/kicad_env.sh && "$KPY" tools/extract.py（KiCad 10 自带的 Python，带 pcbnew）
输出：
  data/board.json          板子全部几何 + 网络 + 规则 + 统计 + DRC 摘要 + 生产文件摘要
  data/layers/<L>.svg      各层 SVG（kicad-cli 导出后统一到板子本地坐标，viewBox = 板框外包）
坐标系：板子本地 mm，原点 = 板框左上角（KiCad 里的 (100,100)），x 向右、y 向下。
"""
import json, math, os, re, csv, subprocess, sys, collections
import pcbnew

S = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))  # = 仓库根
PCB = f"{S}/hardware/pcb/out/QB12.kicad_pcb"
PRO = f"{S}/hardware/pcb/out/QB12.kicad_pro"
DRC = f"{S}/hardware/pcb/out/QB12_drc.json"
COURSE = f"{S}/courses/circuit/data.json"
FRLOG = f"{S}/hardware/pcb/r3/fr19.log"
RUN19 = f"{S}/hardware/pcb/r3/run19.sh"
JLC = f"{S}/hardware/pcb/jlc"
BOMCSV = f"{S}/hardware/pcb/QB12_BOM_嘉立创SMT.csv"
KCLI = os.environ.get("KCLI", "kicad-cli")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
OUT = os.path.abspath(OUT)
os.makedirs(f"{OUT}/layers", exist_ok=True)
sys.path.insert(0, f"{S}/hardware/pcb")
from netlist import PARTS  # noqa: E402  只读引用：位号 -> 封装简称 / 描述

OX, OY = 100.0, 100.0
mm = pcbnew.ToMM


def r3(v):
    return round(float(v), 3)


def L(v):
    return [r3(mm(v.x) - OX), r3(mm(v.y) - OY)]


b = pcbnew.LoadBoard(PCB)
b.BuildConnectivity()
ds = b.GetDesignSettings()
pro = json.load(open(PRO))
course = json.load(open(COURSE))

# ---------------- 网络 ----------------
names = sorted([str(n) for n in b.GetNetsByName().keys() if str(n) != ""])
NI = {n: i for i, n in enumerate(names)}


def nid(item):
    n = item.GetNetname()
    return NI.get(n, -1)


# 网络类（项目文件里的类定义 + 匹配规则）
ns = pro["net_settings"]
pat = {p["pattern"]: p["netclass"] for p in ns["netclass_patterns"]}
classes = []
for c in ns["classes"]:
    members = [n for n in names if pat.get(n, "Default") == c["name"]]
    classes.append(dict(name=c["name"], track=c["track_width"], clearance=c["clearance"],
                        via=[c["via_diameter"], c["via_drill"]], nets=members))
# 固定顺序：KiCad 10 存项目文件时会重排网络类，课程里按这个顺序讲
_ORDER = ["Default", "Power", "Motor", "Rail", "Batt"]
classes.sort(key=lambda c: _ORDER.index(c["name"]) if c["name"] in _ORDER else len(_ORDER))

# ---------------- 板框 ----------------
edges = [d for d in b.GetDrawings() if d.GetLayer() == pcbnew.Edge_Cuts]
eb = b.GetBoardEdgesBoundingBox()
frame = dict(x=r3(mm(eb.GetX()) - OX), y=r3(mm(eb.GetY()) - OY), w=r3(mm(eb.GetWidth())), h=r3(mm(eb.GetHeight())))
outline_ps = pcbnew.SHAPE_POLY_SET()
try:
    b.GetBoardPolygonOutlines(outline_ps, False)  # KiCad 10：第二个参数 aInferOutlineIfNecessary
except TypeError:
    b.GetBoardPolygonOutlines(outline_ps)  # KiCad 8
o = outline_ps.Outline(0)
outline = [L(o.CPoint(i)) for i in range(o.PointCount())]
edge_w = r3(mm(edges[0].GetWidth()))
W = r3(max(p[0] for p in outline) - min(p[0] for p in outline))
H = r3(max(p[1] for p in outline) - min(p[1] for p in outline))
corner_r = None
for d in edges:
    if d.GetShape() == pcbnew.SHAPE_T_ARC:
        corner_r = r3(mm(d.GetRadius()))
        break

# ---------------- 器件 + 焊盘 ----------------
SHAPE = {pcbnew.PAD_SHAPE_CIRCLE: "circle", pcbnew.PAD_SHAPE_RECT: "rect", pcbnew.PAD_SHAPE_OVAL: "oval",
         pcbnew.PAD_SHAPE_TRAPEZOID: "trapezoid", pcbnew.PAD_SHAPE_ROUNDRECT: "roundrect",
         pcbnew.PAD_SHAPE_CHAMFERED_RECT: "chamfered", pcbnew.PAD_SHAPE_CUSTOM: "custom"}
ATTR = {pcbnew.PAD_ATTRIB_PTH: "pth", pcbnew.PAD_ATTRIB_SMD: "smd", pcbnew.PAD_ATTRIB_CONN: "conn", pcbnew.PAD_ATTRIB_NPTH: "npth"}


def poly_of(ps):
    out = []
    for i in range(ps.OutlineCount()):
        oo = ps.Outline(i)
        out.append([L(oo.CPoint(j)) for j in range(oo.PointCount())])
    return out


fps = []
pad_by_net = collections.defaultdict(list)
for f in sorted(b.GetFootprints(), key=lambda f: (re.match(r"[A-Z]+", f.GetReference()).group(0), int(re.search(r"\d+", f.GetReference()).group(0)))):
    ref = f.GetReference()
    cp = course["parts"].get(ref, {})
    crt = f.GetCourtyard(pcbnew.F_CrtYd)
    crt_poly = poly_of(crt)[0] if crt.OutlineCount() else None
    bb = crt.BBox() if crt.OutlineCount() else f.GetBoundingBox(False, False)
    fields = {fl.GetName(): fl.GetText() for fl in f.GetFields()}
    pads = []
    for p in f.Pads():
        sh = SHAPE.get(p.GetShape(), "rect")
        ls = p.GetLayerSet()
        cu = "".join(k for k, l in (("F", pcbnew.F_Cu), ("B", pcbnew.B_Cu)) if ls.Contains(l))
        d = dict(n=p.GetNumber(), net=nid(p), t=ATTR[p.GetAttribute()], s=sh,
                 x=L(p.GetPosition())[0], y=L(p.GetPosition())[1],
                 w=r3(mm(p.GetSize().x)), h=r3(mm(p.GetSize().y)), a=r3(p.GetOrientationDegrees()), cu=cu)
        if sh == "roundrect":
            d["rr"] = r3(p.GetRoundRectCornerRadius())
            d["rr"] = r3(mm(p.GetRoundRectCornerRadius()))
        if sh in ("custom", "chamfered", "trapezoid"):
            ps = pcbnew.SHAPE_POLY_SET()
            p.TransformShapeToPolygon(ps, pcbnew.F_Cu if "F" in cu else pcbnew.B_Cu, 0, pcbnew.FromMM(0.005))
            d["poly"] = poly_of(ps)
        if p.GetDrillSize().x > 0:
            d["drill"] = [r3(mm(p.GetDrillSize().x)), r3(mm(p.GetDrillSize().y))]
        mk = "".join(k for k, l in (("F", pcbnew.F_Mask), ("B", pcbnew.B_Mask)) if ls.Contains(l))
        if mk:
            d["mask"] = mk
        if ls.Contains(pcbnew.F_Paste):
            d["paste"] = 1
        lc = p.GetLocalClearance()
        if lc:
            d["clr"] = r3(mm(lc))                      # 焊盘自己的间距（J1 设成 0.1 mm）
        pr = p.GetLocalSolderPasteMarginRatio()
        if pr:
            d["pasteRatio"] = r3(pr)                   # 钢网开口缩放（U2/U4 散热焊盘 -0.15）
        pads.append(d)
        if d["net"] >= 0:
            pad_by_net[d["net"]].append(f"{ref}.{p.GetNumber()}" if p.GetNumber() else ref)
    np_ = PARTS.get(ref, {})
    fps.append(dict(ref=ref, value=f.GetValue(), fp=str(f.GetFPID().GetLibItemName()), pkg=np_.get("fp", ""),
                    x=L(f.GetPosition())[0], y=L(f.GetPosition())[1], rot=r3(f.GetOrientationDegrees()),
                    side="top" if f.GetLayer() == pcbnew.F_Cu else "bottom",
                    bbox=[r3(mm(bb.GetLeft()) - OX), r3(mm(bb.GetTop()) - OY), r3(mm(bb.GetRight()) - OX), r3(mm(bb.GetBottom()) - OY)],
                    crt=crt_poly, lcsc=cp.get("lcsc", fields.get("LCSC", "")), lcsc_field=fields.get("LCSC", ""),
                    lcsc_part_field=fields.get("LCSC Part", ""),
                    desc=cp.get("desc", ""), kind=cp.get("kind", np_.get("kind", "")), lib=np_.get("lib", ""),
                    refShown=bool(f.Reference().IsVisible()), tht=bool(f.GetAttributes() & pcbnew.FP_THROUGH_HOLE),
                    pins=cp.get("pins", []), pads=pads))

# ---------------- 走线 + 过孔 ----------------
tracks, vias = [], []
seg_len = collections.defaultdict(float)
seg_cnt = collections.Counter()
widths = collections.Counter()
for t in b.GetTracks():
    if t.Type() == pcbnew.PCB_VIA_T:
        vias.append(dict(net=nid(t), x=L(t.GetPosition())[0], y=L(t.GetPosition())[1], d=r3(mm(t.GetWidth())),
                         drill=r3(mm(t.GetDrill())), locked=int(t.IsLocked())))
    elif t.Type() == pcbnew.PCB_TRACE_T:
        s, e = L(t.GetStart()), L(t.GetEnd())
        w = r3(mm(t.GetWidth()))
        tracks.append([nid(t), 0 if t.GetLayer() == pcbnew.F_Cu else 1, w, s[0], s[1], e[0], e[1], int(t.IsLocked())])
        seg_len[nid(t)] += mm(t.GetLength())
        seg_cnt[nid(t)] += 1
        widths[w] += 1
    else:
        raise SystemExit("arc tracks not handled")

# 过孔分类（依据 route_b.py 的做法）：信号孔 / 散热孔（在 U2、U4 散热焊盘里）/ 模组接地孔（U1 中间 3x3 接地焊盘之间）
# / 扇出孔（布线前就锁定的接地孔）/ 缝合孔（2.5 mm 交错网格上的）/ 补孔（铺铜孤岛补连接，其余接地孔）
GND = NI["GND"]


def in_pad(ref, num, x, y):
    f = b.FindFootprintByReference(ref)
    for p in f.Pads():
        if p.GetNumber() == num and p.GetAttribute() == pcbnew.PAD_ATTRIB_SMD and mm(p.GetSize().x) > 2:
            c = L(p.GetPosition())
            return abs(x - c[0]) <= mm(p.GetSize().x) / 2 + 1e-6 and abs(y - c[1]) <= mm(p.GetSize().y) / 2 + 1e-6
    return False


u1ep = [L(p.GetPosition()) for p in b.FindFootprintByReference("U1").Pads() if p.GetNumber() == "41"]
ux = sorted({p[0] for p in u1ep}); uy = sorted({p[1] for p in u1ep})


def on_stitch_grid(x, y):
    step = 2.5
    j = round((y - 1.5) / step)
    if abs(1.5 + j * step - y) > 1e-3:
        return False
    x0 = 1.5 + (0 if int((1.5 + j * step) / step) % 2 == 0 else step / 2)
    k = round((x - x0) / step)
    return abs(x0 + k * step - x) < 1e-3


roles = collections.Counter()
for v in vias:
    x, y = v["x"], v["y"]
    if v["net"] != GND:
        role = "signal"
    elif in_pad("U2", "17", x, y) or in_pad("U4", "9", x, y):
        role = "thermal"
    elif ux[0] < x < ux[-1] and uy[0] < y < uy[-1]:
        role = "module"
    elif v["locked"]:
        role = "fanout"
    elif on_stitch_grid(x, y):
        role = "stitch"
    else:
        role = "bridge"
    v["role"] = role
    roles[role] += 1

# ---------------- 铺铜 / 禁布区 ----------------
KEEPOUT_INFO = {  # 来自 route_a.py / route_b.py 的注释
    "antenna": ("天线禁布区", "ESP32 模组的板载天线下面两层都不许有铜：不走线、不打孔、不铺铜（route_a.py ANT）"),
    "module": ("模组接地焊盘区", "U1 中间 3×3 接地焊盘一圈：两层都不许走线，留给接地过孔（route_a.py MOD）"),
    "usb": ("USB-C 外壳下方", "USB-C 金属外壳底下：顶层不走线（route_a.py USB）"),
}
zones = []
for z in b.Zones():
    ls = [b.GetLayerName(l) for l in z.GetLayerSet().Seq()]
    ol = z.Outline()
    outline_z = [L(ol.CVertex(i)) for i in range(ol.TotalVertices())]
    bbz = z.GetBoundingBox()
    box = [r3(mm(bbz.GetLeft()) - OX), r3(mm(bbz.GetTop()) - OY), r3(mm(bbz.GetRight()) - OX), r3(mm(bbz.GetBottom()) - OY)]
    d = dict(net=z.GetNetname() or None, layers=ls, rule=bool(z.GetIsRuleArea()), outline=outline_z, bbox=box)
    if z.GetIsRuleArea():
        d["keepout"] = dict(tracks=bool(z.GetDoNotAllowTracks()), vias=bool(z.GetDoNotAllowVias()),
                            pour=bool((getattr(z, "GetDoNotAllowZoneFills", None) or z.GetDoNotAllowCopperPour)()), pads=bool(z.GetDoNotAllowPads()),
                            footprints=bool(z.GetDoNotAllowFootprints()))
        key = "antenna" if box[0] == 34.0 else ("module" if abs(box[0] - 39.9) < 1e-6 else "usb")
        d["id"] = key
        d["label"], d["why"] = KEEPOUT_INFO[key]
    else:
        lc = z.GetLocalClearance()
        d["clearance"] = r3(mm(lc)) if lc is not None else None
        d["min_width"] = r3(mm(z.GetMinThickness()))
        d["pad_connection"] = {pcbnew.ZONE_CONNECTION_FULL: "solid", pcbnew.ZONE_CONNECTION_THERMAL: "thermal",
                               pcbnew.ZONE_CONNECTION_NONE: "none"}.get(z.GetPadConnection(), str(z.GetPadConnection()))
        d["island_removal"] = {pcbnew.ISLAND_REMOVAL_MODE_ALWAYS: "always", pcbnew.ISLAND_REMOVAL_MODE_NEVER: "never",
                               pcbnew.ISLAND_REMOVAL_MODE_AREA: "area"}.get(z.GetIslandRemovalMode(), "?")
        fill = {}
        for l in z.GetLayerSet().Seq():
            ps = z.GetFilledPolysList(l)
            area = ps.Area() / 1e12
            g = pcbnew.SHAPE_POLY_SET(ps)
            if hasattr(pcbnew.SHAPE_POLY_SET, "PM_FAST"):  # KiCad 8
                g.Unfracture(pcbnew.SHAPE_POLY_SET.PM_FAST)
                g.Simplify(pcbnew.SHAPE_POLY_SET.PM_FAST)
            else:  # KiCad 10：去掉了 POLYGON_MODE 参数
                g.Unfracture()
                g.Simplify()
            polys = []
            for i in range(g.OutlineCount()):
                rings = [g.Outline(i)] + [g.Hole(i, h) for h in range(g.HoleCount(i))]
                polys.append([[L(rr.CPoint(j)) for j in range(rr.PointCount())] for rr in rings])
            fill[b.GetLayerName(l)] = dict(area=r3(area), polys=polys)
        d["fill"] = fill
    zones.append(d)

# ---------------- 飞线（示意）：按最终摆放位置，每个网络的焊盘做最小生成树 ----------------
rats = []
for net, ni in NI.items():
    pts = []
    for f in fps:
        seen = set()
        for p in f["pads"]:
            if p["net"] == ni:
                k = (p["x"], p["y"])
                if k not in seen:
                    seen.add(k); pts.append(k)
    if len(pts) < 2:
        continue
    used = [False] * len(pts); used[0] = True
    dist = [math.dist(pts[0], q) for q in pts]; par = [0] * len(pts)
    for _ in range(len(pts) - 1):
        j = min((i for i in range(len(pts)) if not used[i]), key=lambda i: dist[i])
        used[j] = True
        rats.append([ni, pts[par[j]][0], pts[par[j]][1], pts[j][0], pts[j][1]])
        for i in range(len(pts)):
            if not used[i]:
                dd = math.dist(pts[j], pts[i])
                if dd < dist[i]:
                    dist[i] = dd; par[i] = j

# ---------------- 文字（背面丝印说明） ----------------
texts = []
for d in b.GetDrawings():
    if d.GetClass() == "PCB_TEXT":
        texts.append(dict(text=d.GetText(), layer=d.GetLayerName(), x=L(d.GetPosition())[0], y=L(d.GetPosition())[1],
                          h=r3(mm(d.GetTextHeight())), mirrored=bool(d.IsMirrored())))

# ---------------- 规则 ----------------
rules = dict(pro["board"]["design_settings"]["rules"])
rules = {k: v for k, v in rules.items() if not k.startswith("min_microvia") and k != "use_height_for_length_calcs"}
rules["solder_mask_expansion"] = r3(mm(ds.m_SolderMaskExpansion))
rules["board_thickness"] = r3(mm(ds.GetBoardThickness()))

# ---------------- DRC 摘要 ----------------
drc = json.load(open(DRC))
cnt = collections.Counter((v["severity"], v["type"]) for v in drc["violations"])
DRC_ZH = {"silk_overlap": "丝印互相重叠", "lib_footprint_issues": "封装库没在库表里登记", "silk_over_copper": "丝印被阻焊开窗裁掉",
          "silk_edge_clearance": "丝印离板边太近"}
items = []
for v in drc["violations"]:
    it = v["items"][0]
    items.append([v["type"], r3(it["pos"]["x"] - OX), r3(it["pos"]["y"] - OY), " / ".join(i["description"] for i in v["items"])])
drc_sum = dict(date=drc["date"], kicad=drc["kicad_version"], errors=sum(c for (s, t), c in cnt.items() if s == "error"),
               warnings=sum(c for (s, t), c in cnt.items() if s == "warning"),
               by_type=[dict(severity=s, type=t, zh=DRC_ZH.get(t, t), n=c) for (s, t), c in sorted(cnt.items(), key=lambda x: -x[1])],
               unconnected=len(drc["unconnected_items"]), schematic_parity=len(drc.get("schematic_parity", [])),
               items=items)

# ---------------- 自动布线日志 ----------------
log = open(FRLOG, encoding="utf-8", errors="replace").read()
run19 = open(RUN19).read()
fr = dict(version=re.search(r"Freerouting v([\d.]+)", log).group(1),
          passes=int(re.search(r"-mp (\d+)", run19).group(1)),
          route_s=float(re.search(r"Auto-routing was completed in ([\d.]+) seconds", log).group(1)),
          optimize=re.search(r"Route optimization was completed in ([^.]+?\d+\.\d+ seconds)", log).group(1),
          improved_pct=float(re.search(r"improved the design by ~([\d.]+)%", log).group(1)))

# ---------------- 生产文件 ----------------
gdir = f"{JLC}/gerber"
gerb = []
for fn in sorted(os.listdir(gdir)):
    if fn.endswith((".gbrjob",)) or "drl_map" in fn:
        continue
    gerb.append(dict(file=fn, bytes=os.path.getsize(f"{gdir}/{fn}")))


def drill_table(fn):
    t = open(f"{gdir}/{fn}").read()
    tools = {m.group(1): float(m.group(2)) for m in re.finditer(r"^T(\d+)C([\d.]+)", t, re.M)}
    func = {}
    lines = t.splitlines()
    for i, line in enumerate(lines):
        m = re.match(r"^T(\d+)C", line)
        if m and i > 0 and "AperFunction" in lines[i - 1]:
            func[m.group(1)] = lines[i - 1].split(",")[-1]
    cur = None; hits = collections.Counter(); slots = collections.Counter()
    body = t.split("%", 1)[1]
    for line in body.splitlines():
        m = re.match(r"^T(\d+)$", line)
        if m:
            cur = m.group(1); continue
        if cur and line.startswith("X"):
            hits[cur] += 1
            if "G85" in line:
                slots[cur] += 1
    return [dict(tool=k, d=tools[k], n=hits[k], slots=slots[k], kind=func.get(k, "")) for k in sorted(tools, key=int)]


bom = list(csv.reader(open(BOMCSV, encoding="utf-8-sig")))
cpl = list(csv.reader(open(f"{JLC}/QB12_CPL_坐标文件.csv", encoding="utf-8-sig")))
fab = dict(gerbers=gerb, pth=drill_table("QB12-PTH.drl"), npth=drill_table("QB12-NPTH.drl"),
           bom_header=bom[0], bom=bom[1:], cpl_header=cpl[0], cpl=cpl[1:],
           zip_bytes=os.path.getsize(f"{JLC}/QB12_Gerber.zip"),
           origin="drill/place origin = 板子左下角 (aux origin)；CPL 的 Y 轴向上")
# Gerber 格式：从 export_jlc.sh 的参数读出来（嘉立创国内站只收 RS-274X）
_ej = open(f"{S}/hardware/pcb/export_jlc.sh", encoding="utf-8").read()
fab["gerber_format"] = ("RS-274X（export_jlc.sh 带 --no-x2 --no-netlist，KiCad %s 导出）" % pcbnew.Version()
                        if "--no-x2" in _ej else "Gerber X2（KiCad %s 默认）" % pcbnew.Version())

# ---------------- 区域（课程注释：导览用） ----------------
REG = [
    ("connectors", "左边一排插座", ["J3", "J4", "J2"]),
    ("mcu", "主控 ESP32-S3 模组", ["U1", "C5", "C6", "C7", "R7", "R10"]),
    ("antenna", "天线禁布区", None),
    ("switch", "电源开关与自动切换", ["SW1", "Q1", "Q2", "R13", "R14"]),
    ("power", "储能电容、二极管与 3.3V 稳压", ["C9", "C10", "C14", "C15", "D1", "U3", "C3", "C4"]),
    ("motor", "电机驱动", ["U2", "R15", "R16", "C11", "C12", "C13", "R9"]),
    ("charge", "锂电池充电", ["U4", "R3", "C1", "C2", "LED1", "LED2", "R4", "R5"]),
    ("usb", "USB-C 接口", ["J1", "U5", "R1", "R2", "R17"]),
    ("buttons", "按键、状态灯与电压检测", ["SW2", "SW3", "R8", "R6", "LED3", "R18", "R11", "R12", "C8"]),
]
FPI = {f["ref"]: f for f in fps}
regions = []
for key, label, refs in REG:
    if refs is None:
        z = [z for z in zones if z.get("id") == "antenna"][0]
        box = [max(z["bbox"][0], 0), max(z["bbox"][1], 0), min(z["bbox"][2], W), min(z["bbox"][3], H)]
        refs = []
    else:
        bxs = [FPI[r]["bbox"] for r in refs]
        box = [min(x[0] for x in bxs), min(x[1] for x in bxs), max(x[2] for x in bxs), max(x[3] for x in bxs)]
    regions.append(dict(id=key, label=label, refs=refs, bbox=[r3(v) for v in box]))

# ---------------- 网络表 ----------------
nets = []
for n in names:
    i = NI[n]
    nv = sum(1 for v in vias if v["net"] == i)
    wl = collections.Counter(t[2] for t in tracks if t[0] == i)
    nets.append(dict(name=n, cls=pat.get(n, "Default"), pads=pad_by_net[i], segs=seg_cnt[i], len=r3(seg_len[i]),
                     vias=nv, widths={str(k): v for k, v in sorted(wl.items())}))

area = abs(sum(outline[i][0] * outline[i - 1][1] - outline[i - 1][0] * outline[i][1] for i in range(len(outline)))) / 2
stats = dict(
    size=[W, H], frame=[frame["w"], frame["h"]], thickness=rules["board_thickness"], copper_layers=b.GetCopperLayerCount(),
    corner_r=corner_r, edge_width=edge_w, area=r3(area),
    footprints=len(fps), footprints_top=sum(1 for f in fps if f["side"] == "top"), pads=sum(len(f["pads"]) for f in fps),
    smd_pads=sum(1 for f in fps for p in f["pads"] if p["t"] == "smd"),
    nets=len(names), tracks=len(tracks), tracks_F=sum(1 for t in tracks if t[1] == 0), tracks_B=sum(1 for t in tracks if t[1] == 1),
    track_len=r3(sum(seg_len.values())), track_len_F=r3(sum(math.dist(t[3:5], t[5:7]) for t in tracks if t[1] == 0)),
    track_len_B=r3(sum(math.dist(t[3:5], t[5:7]) for t in tracks if t[1] == 1)),
    widths=[[w, c] for w, c in sorted(widths.items(), key=lambda x: -x[1])],
    vias=len(vias), via_sizes=[[d, dr, c] for (d, dr), c in collections.Counter((v["d"], v["drill"]) for v in vias).most_common()],
    via_roles=dict(roles), gnd_vias=sum(1 for v in vias if v["net"] == GND),
    locked_tracks=sum(t[7] for t in tracks), locked_vias=sum(v["locked"] for v in vias),
    holes=sum(x["n"] for x in fab["pth"]) + sum(x["n"] for x in fab["npth"]),
    zones_fill=sum(1 for z in zones if not z["rule"]), keepouts=sum(1 for z in zones if z["rule"]),
    gnd_area={l: v["area"] for z in zones if not z["rule"] for l, v in z["fill"].items()},
    min_track=min(widths), refs_hidden=[f["ref"] for f in fps if not f["refShown"]],
)

process = dict(
    tools=dict(kicad=pcbnew.Version(), freerouting=fr),
    steps=[
        dict(script="netlist.py", what="唯一的网表来源：每个元件的值、立创编号、每个引脚接哪个网络"),
        dict(script="build_board.py", what="按网表放封装、写坐标表摆放、画 56×38 mm 圆角板框、预画几段关键走线"),
        dict(script="route_b.py … fanout", what="布线前给接地焊盘打扇出过孔（锁定），U2/U4 散热焊盘打阵列过孔"),
        dict(script="route_a.py", what="去掉铺铜、导出 DSN；GND 不交给自动布线；写入天线/模组/USB 禁布区"),
        dict(script="r3/run19.sh", what=f"Freerouting {fr['version']} 自动布线（-mp {fr['passes']}）"),
        dict(script="route_b.py", what="导回 SES、拆 T 形接头、模组接地孔、缝合孔、禁布区 + 两层整面铺地、补孤岛"),
        dict(script="drc.sh", what="kicad-cli 跑 DRC，出 JSON 报告（交付的 QB12_drc.json 是 finalize 之后的板子跑的）"),
        dict(script="finalize.py", what="摆位号丝印、背面接口说明、订单号位置、坐标原点设到左下角、重新铺铜"),
        dict(script="export_jlc.sh", what="导出 Gerber + 钻孔（打包 zip）、坐标文件 CPL；BOM 由 make_bom.py 从网表生成"),
    ],
    keepouts=dict(antenna=[34.0, -1.0, 57.0, 7.4], usb=[22.3, 33.8, 30.7, 38.5], module=[39.9, 13.0, 45.1, 18.2]),
    gnd=dict(via=[0.6, 0.3], via_clearance=0.2, hole_gap=0.3, stitch_step=2.5, stitch_clearance=0.45,
             zone_clearance=0.3, zone_min_width=0.25, pad_connection="solid", island_removal="always"),
)

board = dict(
    meta=dict(source="pcb/out/QB12.kicad_pcb", kicad=pcbnew.Version(), units="mm",
              coords="板子本地坐标：原点 = 板框左上角，x 向右，y 向下（KiCad 内部坐标减去 (100,100)）",
              frame=frame, title="Boat QB12", rev="Rev A  2026-10"),
    board=dict(w=W, h=H, outline=outline, corner_r=corner_r, edge_width=edge_w, thickness=rules["board_thickness"],
               copper_layers=b.GetCopperLayerCount()),
    rules=rules, classes=classes, nets=nets, footprints=fps,
    tracks_fmt="[net, layer(0=F.Cu,1=B.Cu), width, x1, y1, x2, y2, locked]", tracks=tracks, vias=vias,
    zones=zones, ratsnest_fmt="[net, x1, y1, x2, y2]（按最终摆放位置算的最小生成树，示意）", ratsnest=rats,
    texts=texts, regions=regions, stats=stats, drc=drc_sum, fab=fab, process=process,
)
js = json.dumps(board, ensure_ascii=False, separators=(",", ":"))
open(f"{OUT}/board.json", "w").write(js)
print("board.json", len(js), "bytes")
print(json.dumps(stats, ensure_ascii=False))

# ---------------- 各层 SVG ----------------
LAY = [("F.Cu", "F.Cu"), ("B.Cu", "B.Cu"), ("F.SilkS", "F.Silkscreen"), ("B.SilkS", "B.Silkscreen"),
       ("F.Mask", "F.Mask"), ("B.Mask", "B.Mask"), ("F.Paste", "F.Paste"), ("B.Paste", "B.Paste"), ("Edge.Cuts", "Edge.Cuts")]
tmp = f"{OUT}/../_raw"
os.makedirs(tmp, exist_ok=True)
raw = {}
for short, kname in LAY:
    fn = f"{tmp}/{kname}.svg"
    # 孔：只在铜层画实际孔形（KiCad 8 的默认效果）；KiCad 10 默认每层都画，所以显式指定
    drill = "2" if kname.endswith(".Cu") else "0"
    subprocess.run([KCLI, "pcb", "export", "svg", "-l", kname, "--page-size-mode", "2", "--exclude-drawing-sheet",
                    "--black-and-white", "--drill-shape-opt", drill, "--mode-single", "-o", fn, PCB],
                   check=True, capture_output=True)
    raw[short] = open(fn).read()
# 用板框求平移量：Edge.Cuts 路径里最小的 x / y 就是板子本地 0
ex = [float(a) for a, _ in re.findall(r"(-?\d+\.\d+) (-?\d+\.\d+)", raw["Edge.Cuts"].split("<path", 1)[1])]
ey = [float(c) for _, c in re.findall(r"(-?\d+\.\d+) (-?\d+\.\d+)", raw["Edge.Cuts"].split("<path", 1)[1])]
dx, dy = min(ex), min(ey)
print("svg offset", dx, dy)


import xml.etree.ElementTree as ET
SVGNS = "{http://www.w3.org/2000/svg}"


def rnd(s):
    return re.sub(r"-?\d+\.\d+", lambda m: ("%.3f" % float(m.group(0))).rstrip("0").rstrip("."), s)


def sty(s):
    """KiCad 的 style 串 -> 精简版：颜色换成 currentColor，只留 fill / stroke / stroke-width / fill-rule。"""
    d = {}
    for kv in s.replace("\n", " ").split(";"):
        if ":" in kv:
            k, v = kv.split(":", 1); d[k.strip()] = v.strip()
    out = []
    if "fill" in d:
        out.append("fill:" + ("none" if d["fill"] == "none" else "currentColor"))
    if "stroke" in d:
        out.append("stroke:" + ("none" if d["stroke"] == "none" else "currentColor"))
    if "stroke-width" in d and d.get("stroke") != "none":
        out.append("stroke-width:" + rnd(d["stroke-width"]))
    if d.get("fill-rule"):
        out.append("fill-rule:" + d["fill-rule"])
    return ";".join(out)


def clean(svg):
    """去掉 title/desc/隐藏的 text，展开 stroked-text 组，同一个组里没有自带样式的 path 合成一条，数字保留 3 位小数。"""
    root = ET.fromstring(svg.split("?>", 1)[1].split(">", 1)[1] if svg.lstrip().startswith("<?xml") else svg)
    out = []

    def emit_group(style, kids):
        parts = []
        dacc = []
        for k in kids:
            tag = k.tag.replace(SVGNS, "")
            if tag == "path" and "style" not in k.attrib:
                dacc.append(rnd(" ".join(k.attrib["d"].split())))
                continue
            if dacc:
                parts.append('<path d="%s"/>' % " ".join(dacc)); dacc = []
            if tag == "path":
                parts.append('<path style="%s" d="%s"/>' % (sty(k.attrib["style"]), rnd(" ".join(k.attrib["d"].split()))))
            elif tag == "circle":
                a = " ".join('%s="%s"' % (n, rnd(k.attrib[n])) for n in ("cx", "cy", "r"))
                if "style" in k.attrib:
                    a += ' style="%s"' % sty(k.attrib["style"])
                parts.append("<circle %s/>" % a)
            elif tag in ("polyline", "polygon"):
                parts.append('<%s points="%s"/>' % (tag, rnd(" ".join(k.attrib["points"].split()))))
            elif tag == "rect":
                a = " ".join('%s="%s"' % (n, rnd(k.attrib[n])) for n in ("x", "y", "width", "height") if n in k.attrib)
                parts.append("<rect %s/>" % a)
        if dacc:
            parts.append('<path d="%s"/>' % " ".join(dacc))
        if parts:
            out.append('<g style="%s">%s</g>' % (sty(style), "".join(parts)))

    def flat(g):
        kids = []
        for k in g:
            tag = k.tag.replace(SVGNS, "")
            if tag in ("title", "desc", "text"):
                continue
            if tag == "g" and "style" not in k.attrib:
                kids.extend(flat(k))
            else:
                kids.append(k)
        return kids

    for g in root:
        tag = g.tag.replace(SVGNS, "")
        if tag != "g":
            continue
        kids = flat(g)
        sub = [k for k in kids if k.tag.replace(SVGNS, "") == "g"]
        if sub:
            raise SystemExit("nested styled group")
        emit_group(g.attrib.get("style", ""), kids)
    # 相邻、样式相同的组合并
    merged = []
    for s in out:
        m = re.match(r'<g style="([^"]*)">(.*)</g>$', s, re.S)
        if merged and merged[-1][0] == m.group(1):
            merged[-1][1].append(m.group(2))
        else:
            merged.append([m.group(1), [m.group(2)]])
    res = []
    for st, bodies in merged:
        body = "".join(bodies)
        while True:
            nb = re.sub(r'<path d="([^"]*)"/><path d="', r'<path d="\1 ', body)
            if nb == body:
                break
            body = nb
        # 首尾相接的线段连成折线：“L x y M x y L …” -> “L x y L …”
        body = re.sub(r"(L ?(-?[\d.]+)[ ,](-?[\d.]+)) M ?\2[ ,]\3 ", r"\1 ", body)
        body = body.replace('<path style="fill:currentColor;stroke:none;fill-rule:evenodd" d=', '<path class="f" d=')
        res.append('<g style="%s">%s</g>' % (st, body))
    return "".join(res)


vb = f"{frame['x']} {frame['y']} {frame['w']} {frame['h']}"
inner = {}
for short, _ in LAY:
    body = clean(raw[short])
    # kicad-cli 的根 <svg> 写着 stroke-linecap:round; stroke-linejoin:round，抽成片段时要带上，否则线头是平头
    g = f'<g transform="translate({-dx:.3f} {-dy:.3f})" style="stroke-linecap:round;stroke-linejoin:round">{body}</g>'
    inner[short] = g
    open(f"{OUT}/layers/{short}.svg", "w").write(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{frame["w"]}mm" height="{frame["h"]}mm" style="color:#000"><style>.f{{fill:currentColor;stroke:none;fill-rule:evenodd}}</style>{g}</svg>\n')

# 钻孔层：从 board.json 画（过孔 + 焊盘孔 + 槽孔），金属化 = 实心，非金属化 = 空心圈
parts = []
for v in vias:
    parts.append(f'<circle cx="{v["x"]}" cy="{v["y"]}" r="{v["drill"]/2:.3f}"/>')
for f in fps:
    for p in f["pads"]:
        if "drill" in p:
            w_, h_ = p["drill"]
            if abs(w_ - h_) < 1e-6:
                el = f'<circle cx="{p["x"]}" cy="{p["y"]}" r="{w_/2:.3f}"/>'
            else:
                # 槽孔：drill 尺寸在焊盘自身坐标里，随焊盘角度旋转
                ln = max(w_, h_) - min(w_, h_); th = min(w_, h_)
                ang = p["a"] if w_ > h_ else p["a"] + 90
                ca, sa = math.cos(math.radians(-ang)), math.sin(math.radians(-ang))
                x1, y1 = p["x"] - ca * ln / 2, p["y"] - sa * ln / 2
                x2, y2 = p["x"] + ca * ln / 2, p["y"] + sa * ln / 2
                el = f'<line x1="{x1:.3f}" y1="{y1:.3f}" x2="{x2:.3f}" y2="{y2:.3f}" stroke-width="{th:.3f}" stroke="currentColor" stroke-linecap="round"/>'
            if p["t"] == "npth":
                el = el.replace("/>", ' class="npth"/>')
            parts.append(el)
drill = '<g fill="currentColor">' + "".join(parts) + "</g>"
inner["Drill"] = drill
open(f"{OUT}/layers/Drill.svg", "w").write(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{frame["w"]}mm" height="{frame["h"]}mm" style="color:#000">'
    f'<style>.npth{{fill:none;stroke:currentColor;stroke-width:.08}}</style>{drill}</svg>\n')
json.dump(inner, open(f"{OUT}/layers.json", "w"), ensure_ascii=False, separators=(",", ":"))
print({k: len(v) for k, v in inner.items()}, "layers.json", os.path.getsize(f"{OUT}/layers.json"))
