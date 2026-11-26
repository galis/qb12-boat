"""根据 netlist.py 生成 KiCad 板子：放器件、分配网络、板框、天线禁布区、底层地平面。
坐标：板子本地 mm，左上角 (0,0)，x 向右、y 向下；KiCad 旋转角为逆时针（屏幕上）。"""
import sys
import pcbnew
from netlist import PARTS, pin_list

LIB = sys.argv[1]
OUT = sys.argv[2]
BW, BH = 56.0, 38.0
OX, OY = 100.0, 100.0


def P(x, y):
    return pcbnew.VECTOR2I(pcbnew.FromMM(OX + x), pcbnew.FromMM(OY + y))


FP = {
    "U1": "WIRELM-SMD_ESP32-S3-WROOM-1",
    "U2": "TSSOP-16_L5.0-W4.4-P0.65-LS6.4-BL-EP",
    "U3": "SOT-23-5_L3.0-W1.7-P0.95-LS2.8-BL",
    "U4": "ESOP-8_L4.9-W3.9-P1.27-LS6.0-BL-EP",
    "U5": "SOT-23-6_L2.9-W1.6-P0.95-LS2.8-BL",
    "Q1": "SOT-23_L2.9-W1.3-P1.90-LS2.4-BR", "Q2": "SOT-23_L2.9-W1.3-P1.90-LS2.4-BR",
    "D1": "SMA_L4.3-W2.6-LS5.2-RD",
    "LED1": "LED-SMD_L1.6-W0.8-R-RD", "LED2": "LED0805-R-RD", "LED3": "LED0805-R-RD",
    "J1": "USB-C_SMD-TYPE-C-31-M-12_1",
    "J2": "CONN-SMD_2P-P2.00_XUNPU_WAFER-PH2.0-2PWB", "J3": "CONN-SMD_2P-P2.00_XUNPU_WAFER-PH2.0-2PWB",
    "J4": "CONN-SMD_2P-P2.00_XUNPU_WAFER-PH2.0-2PWB",
    "SW1": "SW-TH_MSK12C02",
    "SW2": "SW-SMD_4P-L5.1-W5.1-P3.70-LS6.5-TL_H1.5", "SW3": "SW-SMD_4P-L5.1-W5.1-P3.70-LS6.5-TL_H1.5",
}


def fp_name(ref):
    if ref in FP:
        return FP[ref]
    p = PARTS[ref]
    if p["fp"] == "1206":
        return "R1206"
    if p["fp"] == "0805":
        return "C0805"
    return ("R0603" if ref.startswith("R") else "C0603")


def pad_map(ref, num):
    """网表引脚号 -> 封装焊盘号列表。"""
    if ref == "J1":
        return {"A4,A9,B4,B9": ["A4B9", "B4A9"], "A1,A12,B1,B12": ["A1B12", "B1A12"],
                "A6,B6": ["A6", "B6"], "A7,B7": ["A7", "B7"], "SH": ["1", "2", "3", "4"]}.get(num, [num])
    if ref == "U1" and num == "1,40,41":
        return ["1", "40", "41"]
    if ref == "U2" and num == "EP":
        return ["17"]
    if ref == "U4" and num == "EP":
        return ["9"]
    if ref == "D1":          # 网表：1 = 阳极 VBUS，2 = 阴极 VSYS；封装：1 = K，2 = A
        return {"1": ["2"], "2": ["1"]}[num]
    if ref in ("SW2", "SW3"):  # 对角两脚，不管内部怎么配对都成立
        return {"1": ["1"], "2": ["4"]}[num]
    return [num]


# ---------------- 摆放（中心 x, y, 旋转角） ----------------
PLACE = {
    "U1": (44.0, 16.8, 0),
    "J3": (5.1, 5.6, 270),
    "J4": (5.1, 14.6, 270),
    "J2": (5.1, 32.65, 270),
    "LED1": (14.6, 25.6, 0),
    "R4": (18.2, 25.6, 180),
    "LED2": (14.6, 27.5, 0),
    "R5": (18.2, 27.5, 180),
    "U2": (14.5, 11.0, 270),
    "R15": (13.6, 6.0, 0),
    "R16": (13.6, 16.0, 0),
    "R9": (12.0, 3.0, 0),
    "C13": (21.6, 8.3, 0),
    "C11": (21.6, 10.0, 0),
    "C12": (21.6, 12.6, 0),
    "C9": (15.0, 19.6, 0),
    "C10": (15.0, 21.7, 0),
    "C14": (21.4, 19.6, 0),
    "C15": (21.4, 21.7, 0),
    "SW1": (2.4, 23.6, 270),
    "Q2": (7.0, 23.6, 0),
    "R14": (10.0, 23.6, 270),
    "Q1": (7.0, 20.3, 0),
    "R13": (10.0, 20.3, 90),
    "D1": (26.4, 17.0, 0),
    "U3": (25.5, 21.0, 0),
    "C3": (23.6, 24.4, 0),
    "C4": (28.0, 20.2, 90),
    "C6": (31.6, 7.6, 90),
    "C5": (31.6, 10.5, 90),
    "R7": (31.6, 13.4, 90),
    "C7": (31.6, 16.3, 90),
    "R10": (31.6, 19.2, 90),
    "J1": (26.5, 33.6, 0),
    "U5": (26.5, 27.6, 180),
    "R1": (22.2, 29.6, 0),
    "R2": (30.9, 29.6, 0),
    "U4": (13.8, 32.9, 0),
    "R3": (18.2, 33.0, 90),
    "C1": (18.2, 36.1, 90),
    "C2": (18.2, 29.9, 90),
    "R17": (32.6, 28.2, 0),
    "R18": (38.8, 30.7, 0),
    "R11": (41.8, 30.7, 0),
    "R12": (44.8, 30.7, 0),
    "C8": (47.8, 30.7, 0),
    "R8": (50.8, 30.7, 0),
    "SW2": (38.7, 35.0, 0),
    "SW3": (45.9, 35.0, 0),
    "R6": (50.4, 35.0, 90),
    "LED3": (52.4, 35.0, 90),
}

board = pcbnew.BOARD()
ds = board.GetDesignSettings()
ds.m_TrackMinWidth = pcbnew.FromMM(0.15)
ds.m_ViasMinSize = pcbnew.FromMM(0.5)
ds.m_MinThroughDrill = pcbnew.FromMM(0.3)
ds.m_CopperEdgeClearance = pcbnew.FromMM(0.3)
ds.SetCopperLayerCount(2)

# 网络
netinfo = {}
for ref in PARTS:
    for num, name, net in pin_list(ref):
        if net != "NC" and net not in netinfo:
            ni = pcbnew.NETINFO_ITEM(board, net)
            board.Add(ni)
            netinfo[net] = ni

# 器件
missing = []
for ref, p in PARTS.items():
    name = fp_name(ref)
    fp = pcbnew.FootprintLoad(LIB, name)
    fp.SetReference(ref)
    fp.SetValue(p["value"])
    fp.SetFPID(pcbnew.LIB_ID("QB12", name))
    try:
        fp.SetField("LCSC", p["lcsc"])
        field = getattr(fp, "GetFieldByName", fp.GetField)  # KiCad 10 去掉了 GetFieldByName
        field("LCSC").SetVisible(False)
        # 封装库自带的 "LCSC Part" 是该封装的默认料号，改成本位号的真实料号（和交付板一致）
        lp = field("LCSC Part")
        if lp:
            lp.SetText(p["lcsc"])
    except Exception:
        pass
    board.Add(fp)
    if ref not in PLACE:
        missing.append(ref)
        continue
    x, y, rot = PLACE[ref]
    fp.SetPosition(P(x, y))
    fp.SetOrientationDegrees(rot)
    # 定位柱：没编号的金属化孔改成非金属化孔
    if ref in ("J1", "SW1"):
        for pad in fp.Pads():
            if pad.GetNumber() == "" and pad.GetAttribute() == pcbnew.PAD_ATTRIB_PTH:
                pad.SetAttribute(pcbnew.PAD_ATTRIB_NPTH)
                d = pad.GetDrillSize()
                pad.SetSize(d)
                pad.SetLayerSet(pad.UnplatedHoleMask())
    if ref == "J1":
        for pad in fp.Pads():
            pad.SetLocalClearance(pcbnew.FromMM(0.1))
    # 散热焊盘里没编号的过孔并入 EP，并去掉这些过孔上的钢网开口（底面不出锡膏）
    if ref == "U2":
        for pad in fp.Pads():
            if pad.GetNumber() == "" and pad.GetAttribute() == pcbnew.PAD_ATTRIB_PTH:
                pad.SetNumber("17")
                # 先复制：KiCad 10 的 AllCuMask() 返回全局静态对象，直接 AddLayer 会改掉它，之后存盘所有通孔都丢 *.Mask
                ls_ = pcbnew.LSET(pcbnew.LSET.AllCuMask()); ls_.AddLayer(pcbnew.F_Mask); ls_.AddLayer(pcbnew.B_Mask)
                pad.SetLayerSet(ls_)
    # 大散热焊盘锡膏缩到约 50%（窗格效果），避免芯片浮起
    if ref in ("U2", "U4"):
        for pad in fp.Pads():
            if pad.GetAttribute() == pcbnew.PAD_ATTRIB_SMD and pcbnew.ToMM(pad.GetSize().x) > 2:
                pad.SetLocalSolderPasteMarginRatio(-0.15)
    # USB-C 外壳插脚：加锡膏开口（通孔回流），保证外壳焊牢
    if ref == "J1":
        for pad in fp.Pads():
            if pad.GetAttribute() == pcbnew.PAD_ATTRIB_PTH and pad.GetNumber() in ("1", "2", "3", "4"):
                ls_ = pad.GetLayerSet(); ls_.AddLayer(pcbnew.F_Paste); pad.SetLayerSet(ls_)
    # 网络
    for num, name_, net in pin_list(ref):
        if net == "NC":
            continue
        targets = pad_map(ref, num)
        hit = 0
        for pad in fp.Pads():
            if pad.GetNumber() in targets:
                pad.SetNet(netinfo[net])
                hit += 1
        if hit == 0:
            print(f"!! {ref} 引脚 {num} -> 焊盘 {targets} 没找到")
    fp.Reference().SetTextSize(pcbnew.VECTOR2I(pcbnew.FromMM(0.8), pcbnew.FromMM(0.8)))
    fp.Reference().SetTextThickness(pcbnew.FromMM(0.12))
    fp.Value().SetVisible(False)
if missing:
    print("未摆放：", missing)

# 板框（圆角矩形）
def seg(a, b):
    s = pcbnew.PCB_SHAPE(board)
    s.SetShape(pcbnew.SHAPE_T_SEGMENT)
    s.SetStart(a); s.SetEnd(b)
    s.SetLayer(pcbnew.Edge_Cuts); s.SetWidth(pcbnew.FromMM(0.1))
    board.Add(s)


def arc(center, start, angle):
    s = pcbnew.PCB_SHAPE(board)
    s.SetShape(pcbnew.SHAPE_T_ARC)
    s.SetCenter(center); s.SetStart(start)
    s.SetArcAngleAndEnd(pcbnew.EDA_ANGLE(angle, pcbnew.DEGREES_T), True)
    s.SetLayer(pcbnew.Edge_Cuts); s.SetWidth(pcbnew.FromMM(0.1))
    board.Add(s)


r = 2.0
seg(P(r, 0), P(BW - r, 0)); seg(P(BW, r), P(BW, BH - r))
seg(P(BW - r, BH), P(r, BH)); seg(P(0, BH - r), P(0, r))
arc(P(BW - r, r), P(BW - r, 0), 90); arc(P(BW - r, BH - r), P(BW, BH - r), 90)
arc(P(r, BH - r), P(r, BH), 90); arc(P(r, r), P(0, r), 90)


# USB-C 两个 VBUS 焊盘：各自往上打一个过孔，底层短线连通（自动布线很难从两侧同时接进去）
def pre_track(net, a, b_, w, layer):
    t = pcbnew.PCB_TRACK(board)
    t.SetStart(a); t.SetEnd(b_); t.SetWidth(pcbnew.FromMM(w)); t.SetLayer(layer)
    t.SetNet(netinfo[net]); t.SetLocked(True)
    board.Add(t)


def pre_via(net, p):
    v = pcbnew.PCB_VIA(board)
    v.SetPosition(p); v.SetWidth(pcbnew.FromMM(0.6)); v.SetDrill(pcbnew.FromMM(0.3))
    v.SetLayerPair(pcbnew.F_Cu, pcbnew.B_Cu); v.SetNet(netinfo[net]); v.SetLocked(True)
    board.Add(v)


j1 = board.FindFootprintByReference("J1")
vb = sorted([p.GetPosition() for p in j1.Pads() if p.GetNumber() in ("A4B9", "B4A9")], key=lambda q: q.x)
vias = []
for p in vb:
    up = pcbnew.VECTOR2I(p.x, p.y - pcbnew.FromMM(1.4))
    pre_track("VBUS", p, up, 0.5, pcbnew.F_Cu)
    pre_via("VBUS", up)
    vias.append(up)
pre_track("VBUS", vias[0], vias[1], 0.5, pcbnew.B_Cu)

# DRV8833 VM 脚（0.65 mm 间距）：先用 0.35 mm 细线引出 1.9 mm，粗电源线再接到线头上
u2 = board.FindFootprintByReference("U2")
vm = [p for p in u2.Pads() if p.GetNumber() == "12"][0].GetPosition()
pre_track("VSYS", vm, pcbnew.VECTOR2I(vm.x + pcbnew.FromMM(1.9), vm.y), 0.35, pcbnew.F_Cu)

# 电池开关 Q2 漏极 -> Q1 漏极：大电流短直连，0.8 mm（BAT_SW 其余分支只是分压采样，走细线）
qd = [[p for p in board.FindFootprintByReference(q).Pads() if p.GetNumber() == "3"][0].GetPosition() for q in ("Q2", "Q1")]
pre_track("BAT_SW", qd[0], qd[1], 0.8, pcbnew.F_Cu)
# VSYS 短接：C9（靠 Q1 一侧）直接连到 C14（靠 U2/D1 一侧），让大电容就近给电机驱动供电
c9 = [p for p in board.FindFootprintByReference("C9").Pads() if p.GetNumber() == "1"][0].GetPosition()
c14 = [p for p in board.FindFootprintByReference("C14").Pads() if p.GetNumber() == "1"][0].GetPosition()
yy = c9.y - pcbnew.FromMM(1.3)
for a_, b_ in ((c9, pcbnew.VECTOR2I(c9.x, yy)), (pcbnew.VECTOR2I(c9.x, yy), pcbnew.VECTOR2I(c14.x, yy)), (pcbnew.VECTOR2I(c14.x, yy), c14)):
    pre_track("VSYS", a_, b_, 0.8, pcbnew.F_Cu)
# 分压采样从 Q2 漏极往下引出，打孔到底层，再由自动布线接到 R11
esc = pcbnew.VECTOR2I(qd[0].x, qd[0].y + pcbnew.FromMM(2.0))
pre_track("BAT_SW", qd[0], esc, 0.25, pcbnew.F_Cu)
pre_via("BAT_SW", esc)

pcbnew.SaveBoard(OUT, board)
print("saved", OUT, "footprints:", len(board.GetFootprints()))
