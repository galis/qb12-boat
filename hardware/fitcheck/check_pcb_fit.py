"""PCB 和船体是否匹配：用真实文件量，不看截图。
  python check_pcb_fit.py [glb]   glb 由 KiCad 10 导出（见 CLAUDE.md 的 PCB 3D 一行：kicad-cli pcb export glb --subst-models --include-pads --grid-origin）
板子放在电子舱里的位置默认 x=60..116、y=±19（和 plan.png 一致），可用 BX、BY 环境变量改。
数据来源：hardware/hull/out 的 QB12_body_assembled.stl（船体 + 甲板装好）、QB12_hull.stl、QB12_deck.stl、QB12_canopy.stl、glb（板子和元件）、build_model.py 里的舱罩尺寸。"""
import os, sys
import numpy as np, trimesh
from scipy import ndimage as ndi
from shapely.geometry import Polygon, box

R = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
OUTD = os.environ.get("BOAT_OUT", f"{R}/hardware/hull/out")   # build_model.py 的输出目录
body = trimesh.load(f"{OUTD}/QB12_body_assembled.stl"); can = trimesh.load(f"{OUTD}/QB12_canopy.stl")
glb = sys.argv[1] if len(sys.argv) > 1 else None
BX, BY = float(os.environ.get("BX", 60)), float(os.environ.get("BY", 0))   # 板子左下角 x、板子中心 y（板长 56 沿 x，宽 38 沿 y）

# ---- 1. 电子舱平面尺寸（build_model.py 的 bay_poly 和舱罩裙边内口）----
bay = Polygon([(40, -38), (164, -38), (184, 0), (164, 38), (40, 38)])
plug_in = Polygon([(42.3, -35.7), (162.2, -35.7), (180.6, 0), (162.2, 35.7), (42.3, 35.7)])
pcb = box(BX, BY - 19.05, BX + 56.1, BY + 19.05)          # 板框 56.1 × 38.1（含 0.1 线宽），SW1 另外探出 1.0
sw1 = box(BX - 1.0, BY - 19.05, BX, BY + 19.05)
print(f"[1] 平面：板 {56.1}×{38.1} mm 放在 x={BX:.0f}..{BX+56.1:.0f}")
print("    舱口内壁直段 124×76（船头一端是尖的，到 x=184），舱罩裙边内口直段 120×71.4（x 42.3..162.2）")
print(f"    板在舱口内: {bay.contains(pcb)}  距舱口壁最小 {pcb.exterior.distance(bay.exterior):.1f} mm；板在裙边内口内: {plug_in.contains(pcb)}  最小 {pcb.exterior.distance(plug_in.exterior):.1f} mm")
print(f"    板子后面（x 小）剩 {BX-1-42.3:.1f} mm；前面直段剩 {162.2-(BX+56.1):.1f} mm（再往前是尖头），左右各剩 {35.7-19.05:.1f} mm（板子放在 y 居中时）")

# ---- 2. 高度（z）----
floor = 31.8   # 舱底：build_model.py 的 deck_in 下表面
h = []
for xy in [(BX + 28, BY), (BX + 5, BY + 17), (BX + 50, BY - 17), (BX + 5, BY - 17), (BX + 50, BY + 17)]:
    hit = can.ray.intersects_location([[xy[0], xy[1], 45.0]], [[0, 0, 1]])[0]
    h.append(float(hit[:, 2].min()) if len(hit) else np.nan)
print(f"[2] 舱底 z={floor}；舱罩顶内壁（板上方 5 个点）z={np.nanmin(h):.1f}..{np.nanmax(h):.1f}")
if glb:
    m = trimesh.load(glb).to_geometry(); V = m.vertices * 1000
    top, bot = V[:, 1].max(), V[:, 1].min()
    print(f"    板子 3D：元件最高 {top:.2f} mm（PCB 底面算 0），焊脚伸出板底 {-bot:.2f} mm，总厚 {top-bot:.2f} mm")
    for stand in (0, 4):
        ztop = floor + stand + top
        print(f"    架高 {stand} mm: 板底脚 z={floor+stand+bot:.1f}，最高元件 z={ztop:.1f}，距舱罩顶 {np.nanmin(h)-ztop:.1f} mm")
    X, Z, Y = V[:, 0], V[:, 1], 38 + V[:, 2]
    zb = lambda name, x0, x1, y0, y1: print(f"    {name}: 最高 {Z[(X>=x0)&(X<=x1)&(Y>=y0)&(Y<=y1)].max():.2f}")
    zb("USB-C J1 (x21.6..31.4, y30.5..38.8)", 21.6, 31.4, 30.5, 38.8)
    zb("ESP32 U1", 34.5, 53.5, 0.3, 26.4); zb("J2/J3/J4 接线座 (x0.5..9.7)", 0.5, 9.7, 1.4, 36.8)

# ---- 3. 电机能不能进浮体 ----
vg = body.voxelized(1.0).fill(); M = vg.matrix; org = vg.transform[:3, 3]
free = ~M; free[:, :, int((43.5 - org[2])):] = False; free[:6, :, :] = False   # 43.5 以上截掉；封住尾轴孔
lab, n = ndi.label(free)
reg = lab == lab[int(round(100 - org[0])), int(round(0 - org[1])), int(round(36 - org[2]))]
edt = ndi.distance_transform_edt(reg)
xi = int(round(80 - org[0])); ys = range(int(round(36 - org[1])), int(round(52 - org[1])))
slot = min(edt[xi, y, :].max() * 2 for y in ys)
print(f"[3] 电子舱 → 浮体的通道，最窄处能放下的圆柱直径（x=80，y=36..52）≈ {slot:.1f} mm（体素 1 mm，±1）；130 电机最窄 15 mm，{'进不去' if slot < 15 else '进得去'}")
print(f"    浮体里（80,55）能放下的圆柱直径 ≈ {2*edt[xi, int(round(55-org[1])), :].max():.0f} mm")

# ---- 4. PCB 托盘（build_model.py 里的 PCB_FLIP / PCB_CX / PCB_STAND）：板子和托盘有没有干涉、卡扣压住了没有 ----
if glb:
    import manifold3d as m3d
    M = m3d.Manifold(m3d.Mesh(vert_properties=np.asarray(body.vertices, dtype=np.float32), tri_verts=np.asarray(body.faces, dtype=np.uint32)))
    mm = (M ^ m3d.Manifold.cube((75, 50, 10)).translate((50, -25, 32.0))).to_mesh()      # 舱底 31.8 以上、板子周围 = 托盘
    T = trimesh.Trimesh(np.asarray(mm.vert_properties)[:, :3], np.asarray(mm.tri_verts))
    P = np.c_[88 - (X - 28 + 0.05), Y - 19 + 0.05, Z + 35.8]                               # 板子 3D 点转到船体坐标（接线座朝船头，架高 4）
    inside = T.voxelized(0.2).fill().is_filled(P).sum()
    slab = trimesh.creation.box(extents=(56.1, 38.1, 1.6)); slab.apply_translation((88, 0, 36.6)); S = slab.sample(20000)
    dd = lambda pts: trimesh.proximity.closest_point(T, pts)[1].min()
    print(f"[4] 托盘 {len(T.split(only_watertight=False))} 块；板上 {len(P)} 个 3D 点落进托盘实体里的有 {int(inside)} 个（要 0）")
    print(f"    板顶到卡扣钩头 {dd(S[S[:,2]>37.39]):.2f} mm，板侧到挡条 {dd(S[(S[:,2]>35.9)&(S[:,2]<37.3)]):.2f} mm，板底与托脚 {dd(S[S[:,2]<35.81]):.2f} mm（0 = 托住）")

# ---- 5. 电机舱口 + 卡扣托座（build_model.py 里的 MOTOR_* / HATCH_* / CLIP_*）：电机按得进、对得准、拿得出 ----
import json
import manifold3d as m3d
def man(path):
    t = trimesh.load(path)
    return m3d.Manifold(m3d.Mesh(vert_properties=np.asarray(t.vertices, dtype=np.float32), tri_verts=np.asarray(t.faces, dtype=np.uint32)))


MHULL = man(f"{OUTD}/QB12_hull.stl")
MDECK = man(f"{OUTD}/QB12_deck.stl")
MB = MHULL + MDECK                                # 装好的整船
SHAFTS = np.load(f"{OUTD}/shaft_info.npy")       # [2(左 +y, 右 -y), 2(a 内端口, b 出口), 3]
MOTOR_D, MOTOR_L, SHAFT_D, SHAFT_LEN, S0 = 17.18, 22.79, 1.49, 6.8, 12.0   # 万宝至 RF-130CH-12250 实物量（10-27）
TAB_L, TAB_D = 3.58, 12.0   # 后端接线片伸出 3.58，按 Ø12 圆柱算（比实物粗，偏保守）
CLIP_RO = MOTOR_D / 2 - 0.1 + 1.8   # 卡环外半径（build_model.py 的 RO）


def frame(sgn, s):
    a, b = SHAFTS[0 if sgn > 0 else 1]
    f = (a - b) / np.linalg.norm(a - b)
    lx = np.array([0, 1.0, 0]); ly = np.cross(f, lx)
    return a, b, f, lx, ly, np.column_stack([lx, ly, f, a + f * s])


def motor_local():
    m = m3d.Manifold.cylinder(MOTOR_L, MOTOR_D / 2, circular_segments=96)
    m = m + m3d.Manifold.cylinder(SHAFT_LEN, SHAFT_D / 2, circular_segments=24).translate((0, 0, -SHAFT_LEN))
    return m + m3d.Manifold.cylinder(TAB_L, TAB_D / 2, circular_segments=48).translate((0, 0, MOTOR_L))


motors = None
for sgn in (1, -1):
    a, b, f, lx, ly, Mx = frame(sgn, S0)
    motor = motor_local().transform(Mx)
    motors = motor if motors is None else motors + motor
    vol = (motor ^ MHULL).volume()
    # 卡环区（轴线周围 RO+0.6 的圆柱，电机全长）之外的船体：电机沿 +v（垂直轴线向上）提出来，全程不能碰
    zone = m3d.Manifold.cylinder(MOTOR_L + 8, CLIP_RO + 0.6, circular_segments=64).transform(frame(sgn, S0 - 4)[5])
    rest = MHULL - zone                          # 甲板拿掉，只剩船体
    worst, d = 0.0, 0.0
    while True:
        mv = motor.translate(tuple(ly * d))
        worst = max(worst, (mv ^ rest).volume())
        if mv.bounding_box()[2] > 52: break
        d += 1.0
    ctr = (Mx @ np.array([0, 0, MOTOR_L / 2, 1]))[:3]; dev = np.linalg.norm(np.cross(ctr - a, f))
    bb = motor.bounding_box()
    print(f"[5] {'左' if sgn > 0 else '右'}电机：与船体重叠 {vol:.2f} mm³（卡环过盈 0.1 mm 一圈，应在几十 mm³ 以内）；"
          f"沿垂直轴线方向提出 {d:.0f} mm，卡环以外全程最大重叠 {worst:.2f} mm³（应 0）；x {bb[0]:.1f}..{bb[3]:.1f}，顶 z={bb[5]:.1f}；轴线偏差 {dev:.3f} mm")
open_half = (360 - 220) / 2
chord = 2 * (MOTOR_D / 2 - 0.1) * np.sin(np.radians(open_half))
print(f"    卡环开口弦长 {chord:.2f} mm，比电机 Ø{MOTOR_D} 窄 {MOTOR_D - chord:.2f}，按进去每边撑开 {(MOTOR_D - chord) / 2:.2f} mm")

# ---- 6. 电池仓 + SW1（舱罩不开孔，开机要取下舱罩）----
CAN = os.environ.get("CANOPY_STL", f"{OUTD}/QB12_canopy.stl")
cm = trimesh.load(CAN)
MC = m3d.Manifold(m3d.Mesh(vert_properties=np.asarray(cm.vertices, dtype=np.float32), tri_verts=np.asarray(cm.faces, dtype=np.uint32)))
bat = m3d.Manifold.cube((50.0, 34.0, 6.0)).translate((122.5, -17.0, 31.8))      # 电池实物（603450），放在仓里居中
print(f"[6] 电池 50×34×6 放进电池仓：与船体重叠 {(bat ^ MB).volume():.2f} mm³、与舱罩重叠 {(bat ^ MC).volume():.2f} mm³（都应 0）；电池顶 z=37.8，舱罩裙边下沿 z=38.0")
# 线束通道：电池后墙缺口（y≈13.7）到 J2 之间，体素 0.5 mm 看能放下多粗的圆柱
box = (MB ^ m3d.Manifold.cube((20, 30, 14)).translate((108, -15, 31.0))).to_mesh()
Tb = trimesh.Trimesh(np.asarray(box.vert_properties)[:, :3], np.asarray(box.tri_verts))
vg = Tb.voxelized(0.5).fill(); PAD = 30; Mv = np.pad(vg.matrix, PAD); o = vg.transform[:3, 3] - PAD * 0.5
edt = ndi.distance_transform_edt(~Mv) * 0.5
ix = lambda v, ax: int(round((v - o[ax]) / 0.5))
xs = [x for x in np.arange(116.5, 121.0, 0.5)]
zz = [z for z in np.arange(32.5, 38.0, 0.5)]
best = max(edt[ix(x, 0), ix(13.7, 1), ix(z, 2)] for x in xs for z in zz)
print(f"    板前沿(x=116)到电池后墙(x=120.8)之间、y=13.7 处，托盘/船体之间最宽处能放下的线束直径 ≈ {2*best:.1f} mm（不含板子元件）")
if glb:
    sw = P[(P[:, 0] > 108) & (P[:, 0] < 119) & (P[:, 1] > -1) & (P[:, 1] < 10)]
    print(f"    SW1 一带最高点 z={sw[:, 2].max():.1f}，舱罩顶内面 z≈64.6（不开孔），SW1 点范围 x {sw[:,0].min():.1f}..{sw[:,0].max():.1f}、y {sw[:,1].min():.1f}..{sw[:,1].max():.1f}")

# ---- 7. 尾管座（build_model.py 的“尾轴”“尾管座”）：Ø2 轴的通道必须是空的；内端口要高出水线 ----
rep = json.load(open(f"{OUTD}/report.json"))
draft = rep["draft_mm"]
for sgn in (1, -1):
    a, b, f, lx, ly, _ = frame(sgn, 0)
    clip = m3d.Manifold.cube((float(a[0]), 20, 50)).translate((0, sgn * 55 - 10, -10))
    def tube(r, ext=5):
        n = np.linalg.norm(b - a) + ext
        return m3d.Manifold.cylinder(n, r, circular_segments=96).transform(np.column_stack([lx, ly, f, b - f * 5]))
    shaft = tube(1.0) ^ clip                   # Ø2 轴占的位置：必须是空的
    ring = (tube(2.7) - tube(1.7)) ^ clip      # 中段孔（Ø3.4）外 1 mm 一圈：必须整圈是实心
    print(f"[7] {'左' if sgn > 0 else '右'}尾管：Ø2 轴通道与船体重叠 {(shaft ^ MB).volume():.2f} mm³（应 0）；孔外 1 mm 圈实心 {(ring ^ MB).volume() / ring.volume() * 100:.1f}%（应 100）；"
          f"内端口 z={a[2]:.1f}，静水线 z={draft:.1f}，高出 {a[2] - draft:.1f} mm；倾角 {np.degrees(np.arcsin(f[2])):.1f}°；轴长至少 {np.linalg.norm(a - b) + 4 + 8:.0f} mm（管长 + 伸进联轴器 4 + 桨 8）")

# ---- 8. 甲板（11-11 分件，船头插舌 + 船尾旋钮）：装好时不碰电机、船体、舱罩；船头插好后放下船尾全程不碰 ----
rep2 = json.load(open(f"{OUTD}/report.json"))
KL, KO = man(f"{OUTD}/QB12_knobs_locked.stl"), man(f"{OUTD}/QB12_knobs_open.stl")
print(f"[8] 电机顶 z={motors.bounding_box()[5]:.1f}；甲板与电机重叠 {(MDECK ^ motors).volume():.2f} mm³（应 0）；"
      f"甲板与船体重叠 {(MDECK ^ MHULL).volume():.2f} mm³（应 0）；甲板与舱罩重叠 {(MDECK ^ MC).volume():.2f} mm³（舱罩坐在甲板上的接触面）")
hit = [d for d in np.arange(0.0, 3.01, 0.05) if (MDECK.translate((0, 0, -d)) ^ motors).volume() > 0.01]
print(f"    甲板往下压 {hit[0]:.2f} mm 才碰到电机（鼓包内腔余量）" if hit else "    甲板往下压 3 mm 内都碰不到电机（鼓包内腔余量 > 3 mm）")
up = [d for d in np.arange(0.05, 1.01, 0.05) if (MDECK.translate((0, 0, d)) ^ MHULL).volume() > 0.01]
print(f"    甲板（插舌在槽里）往上最多抬 {up[0] - 0.05:.2f} mm 就被船头槽唇挡住（设计 0.1；泡棉条高出平台 0.4，所以被压 ≥0.3）" if up else "    甲板往上抬 1 mm 都不碰：插舌没压住！")
# 装甲板：旋钮在松开位置；甲板往船尾错开 SLIDE 从上面平着放下，再往船头推 SLIDE（插舌进槽）
SL = rep2["slide"]
DK = MDECK + KO
drop = max((DK.translate((-SL, 0, dz)) ^ MHULL).volume() for dz in np.arange(20.0, -0.01, -0.5))
push = max((DK.translate((dx, 0, 0)) ^ MHULL).volume() for dx in np.arange(-SL, 0.01, 0.25))
t_in = rep2['tongue']['x'][1] - rep2['tongue']['pivot'][0]          # 插舌伸进槽的长度
push_hi = max((DK.translate((dx, 0, 0.3)) ^ MHULL).volume() for dx in np.arange(-SL, -t_in + 1.0 + 0.01, 0.25))
lead = (DK.translate((-t_in + 0.5, 0, 0.3)) ^ MHULL).volume()
print(f"    装甲板：往船尾错开 {SL:.0f} mm 平着放下（z 从 +20 到 0）最大重叠 {drop:.2f} mm³；往船头推 {SL:.0f} mm 最大重叠 {push:.2f} mm³（都应 0）")
print(f"    推的时候甲板被泡棉顶高 0.3 mm：插舌尖碰到槽口倒角之前最大重叠 {push_hi:.2f} mm³（应 0）；插舌尖进倒角 0.5 mm 时重叠 {lead:.2f} mm³（倒角让插舌尖滑进去，再往里靠倒角把甲板压低）")
back = [d for d in np.arange(0.1, 3.01, 0.1) if ((MDECK + KL).translate((-d, 0, 0)) ^ MHULL).volume() > 0.01]
fwd = [d for d in np.arange(0.1, 3.01, 0.1) if (MDECK.translate((d, 0, 0)) ^ MHULL).volume() > 0.01]
print(f"    锁住后甲板往后最多退 {back[0] - 0.1:.1f} mm（旋钮臂顶挡块）、往前最多 {fwd[0] - 0.1:.1f} mm（插舌顶槽底）；插舌伸进槽 {rep2['tongue']['x'][1] - rep2['tongue']['pivot'][0]:.1f} mm" if back and fwd else f"    甲板前后挡不住：back={back[:1]} fwd={fwd[:1]}")

# ---- 9. 旋钮：锁住 / 松开 / 中间转动都不碰；锁住时臂压在平台底下 ----
kz0, kz1 = rep2["knob"]["arm_z"]
print(f"[9] 旋钮 2 个：位置 {rep2['knobs_xy']}；臂 z {kz0}..{kz1}，平台底 z={rep2['knob']['rim_z0']}")
for name, K in (("锁住", KL), ("松开", KO)):
    print(f"    {name}：与船体重叠 {(K ^ MHULL).volume():.2f}、与甲板重叠 {(K ^ MDECK).volume():.2f}、与电机 {(K ^ motors).volume():.2f} mm³（都应 0）")
sweep = 0.0
kxy = rep2["knobs_xy"]
for ang in np.arange(0.0, 90.01, 5.0):
    for (kx, ky) in kxy:
        sg = 1 if ky > 0 else -1
        one = KO ^ m3d.Manifold.cylinder(43.5 - 25, 10.0, circular_segments=32).translate((kx, ky, 25))   # 只看甲板面以下（头擦过甲板凸点是设计的咔哒手感）
        rot = one.translate((-kx, -ky, 0)).rotate((0, 0, sg * ang)).translate((kx, ky, 0))
        sweep = max(sweep, (rot ^ MHULL).volume(), (rot ^ MDECK).volume())
print(f"    从松开转到锁住（每 5°）：与船体 / 甲板最大重叠 {sweep:.2f} mm³（应 0；臂顶离平台底 0.1，倒角斜坡负责把甲板往下拉）")
eng = []
for (kx, ky) in kxy:
    armcs = (KL ^ m3d.Manifold.cube((30, 30, 40)).translate((kx - 15, ky - 15, 0))).slice(kz0 + 0.3)
    rimcs = MHULL.slice(rep2["knob"]["rim_z0"] + 0.5)
    eng.append(round((armcs ^ rimcs).area(), 1))
print(f"    锁住时臂伸到平台底下的面积 {eng} mm²（臂宽 4，约 3.7 mm 伸进去）")
print(f"    船体与舱罩重叠 {(MHULL ^ MC).volume():.2f} mm³（应 0）")
