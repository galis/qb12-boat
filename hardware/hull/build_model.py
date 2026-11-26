"""Boat QB12 双体船 3D 模型（单位 mm）
坐标：x 从船尾(0) 指向船头(240)，y 向左为正，z 向上。
输出：船身一体件 + 舱罩（打印用），以及装配展示件（桨、轴、彩条）。
"""
import json
import sys
import numpy as np
import trimesh
import manifold3d as m3d

OUT = sys.argv[1] if len(sys.argv) > 1 else "."

L = 240.0
HULL_Y = 55.0          # 两个浮体中心线
HALF_W = 27.0          # 浮体半宽 -> 浮体宽 54，总宽 164
WALL = 1.6             # 壁厚（光敏树脂）


# ---------- 浮体型线 ----------
def half_width(x):
    if x <= 110:
        return HALF_W
    u = min((x - 110) / 130.0, 1.0)
    return max(HALF_W * (1 - u ** 1.35) ** 0.8, 0.6)


def keel_z(x):
    if x <= 120:
        return 0.0
    u = min((x - 120) / 120.0, 1.0)
    return 34.0 * u ** 2.0


def top_z(x):
    if x <= 165:
        return 44.0
    u = min((x - 165) / 75.0, 1.0)
    return 44.0 + 10.0 * u ** 2


def ring(x, w, zk, zt, deadrise=12.0):
    """一个横截面：V 形底 + 竖直舷侧 + 平顶。返回 (n,2) 的 (y,z)，逆时针。"""
    zc = min(zk + deadrise, zt - 1.0)
    wc = w * 0.92          # 舭部比舷顶窄一点 = 舷侧外飘
    pts = []
    n_b = 7
    # 右舷底部：龙骨 -> 舭部
    for i in range(n_b):
        s = i / (n_b - 1)
        pts.append((wc * s, zk + (zc - zk) * s ** 1.4))
    # 右舷侧面：舭部 -> 舷顶（外飘）
    for u in (0.25, 0.5, 0.72, 0.86, 1.0):
        pts.append((wc + (w - wc) * u, zc + (zt - zc) * u))
    # 左舷侧面（镜像，往下）
    for u in (1.0, 0.86, 0.72, 0.5, 0.25):
        pts.append((-(wc + (w - wc) * u), zc + (zt - zc) * u))
    # 左舷底部：舭部 -> 龙骨（不含龙骨点）
    for i in range(n_b - 1, 0, -1):
        s = i / (n_b - 1)
        pts.append((-wc * s, zk + (zc - zk) * s ** 1.4))
    return np.array(pts)


def loft(xs, ring_fn, y_center):
    rings = [ring_fn(x) for x in xs]
    k = len(rings[0])
    verts = []
    for x, r in zip(xs, rings):
        for (yy, zz) in r:
            verts.append((x, y_center + yy, zz))
    faces = []
    for i in range(len(xs) - 1):
        a0, b0 = i * k, (i + 1) * k
        for j in range(k):
            j1 = (j + 1) % k
            faces.append((a0 + j, b0 + j, b0 + j1))
            faces.append((a0 + j, b0 + j1, a0 + j1))
    # 两端封口（扇形）
    verts = np.array(verts)
    for idx, x in ((0, xs[0]), (len(xs) - 1, xs[-1])):
        c = verts[idx * k: idx * k + k].mean(axis=0)
        ci = len(verts)
        verts = np.vstack([verts, c])
        for j in range(k):
            j1 = (j + 1) % k
            if idx == 0:
                faces.append((ci, idx * k + j1, idx * k + j))
            else:
                faces.append((ci, idx * k + j, idx * k + j1))
    mesh = trimesh.Trimesh(verts, np.array(faces), process=True)
    trimesh.repair.fix_normals(mesh)
    assert mesh.is_watertight and mesh.is_volume, "loft not a closed volume"
    return mesh


def to_manifold(mesh):
    return m3d.Manifold(m3d.Mesh(
        vert_properties=np.asarray(mesh.vertices, dtype=np.float32),
        tri_verts=np.asarray(mesh.faces, dtype=np.uint32)))


def to_trimesh(man):
    mm = man.to_mesh()
    return trimesh.Trimesh(np.asarray(mm.vert_properties)[:, :3], np.asarray(mm.tri_verts), process=True)


def prism(poly_xy, z0, z1, scale_top=(1.0, 1.0), about=None):
    poly = np.asarray(poly_xy, dtype=np.float64)
    c = poly.mean(axis=0) if about is None else np.asarray(about)
    cs = m3d.CrossSection([poly - c])
    man = m3d.Manifold.extrude(cs, z1 - z0, n_divisions=1, twist_degrees=0.0, scale_top=scale_top)
    return man.translate((c[0], c[1], z0))


def cylinder_between(p0, p1, r, seg=48):
    p0, p1 = np.asarray(p0, float), np.asarray(p1, float)
    v = p1 - p0
    h = np.linalg.norm(v)
    cyl = trimesh.creation.cylinder(radius=r, height=h, sections=seg)
    # trimesh 圆柱沿 z 轴、以原点为中心
    T = trimesh.geometry.align_vectors([0, 0, 1], v / h)
    cyl.apply_transform(T)
    cyl.apply_translation((p0 + p1) / 2)
    return cyl


# ---------- 外形 ----------
xs_outer = np.concatenate([np.linspace(0, 110, 12), np.linspace(114, 239.4, 48)])


def outer_ring(x):
    return ring(x, half_width(x), keel_z(x), top_z(x))


def inner_ring(x):
    w = max(half_width(x) - WALL, 1.0)
    return ring(x, w, keel_z(x) + 2.0, top_z(x) - 1.6, deadrise=11.0)


hull_outer = {s: loft(xs_outer, outer_ring, s * HULL_Y) for s in (1, -1)}
xs_inner = np.linspace(2.2, 226, 55)
hull_inner = {s: loft(xs_inner, inner_ring, s * HULL_Y) for s in (1, -1)}

# 桥甲板（船头方向带尖角），底面 z=26 形成两个浮体之间的隧道
deck_poly = [(22, -58), (178, -58), (214, 0), (178, 58), (22, 58)]
deck = prism(deck_poly, 30.0, 44.0)

# 电子舱（从顶面开口），与两个浮体内腔连通 = 走线通道
bay_poly = [(40, -38), (164, -38), (184, 0), (164, 38), (40, 38)]
bay = prism(bay_poly, 32.5, 45.0)

body = to_manifold(hull_outer[1]) + to_manifold(hull_outer[-1]) + deck

# 浮体内腔
# 桥甲板内部也掏空（上下皮各 1.8 mm），和电子舱、浮体内腔连成一个舱
deck_in_poly = [(23.8, -56.2), (176.2, -56.2), (210.5, 0), (176.2, 56.2), (23.8, 56.2)]
deck_in = prism(deck_in_poly, 31.8, 41.9)
cavity = to_manifold(hull_inner[1]) + to_manifold(hull_inner[-1]) + bay + deck_in

# 尾轴：Ø2 不锈钢轴，向后下方倾斜 SHAFT_ANG，从尾板底部穿出（出口 b 在尾板后 12 mm、z=-2.2，桨装在这里）。
# 11-11 改：内端口 a 抬到 z=TUBE_TOP_Z，比静水线（吃水 ≈23.7）高 6 mm 以上 → 水在管里最多升到水线，不靠油封也不进舱。
# 不用黄铜管：尾管座里直接打孔，两端各一段 Ø2.4 × 8 的轴承孔（SLA 小孔会偏小约 0.2，实际 ≈2.2，抹硅脂），中间 Ø3.4 让开不摩擦。
SHAFT_ANG = 15.0                      # 轴线与水平面夹角（度）
TUBE_TOP_Z = 30.0                     # 尾管内端口高度
SHAFT_EXIT = np.array([-12.0, -2.2])  # 出口 (x, z)
BUSH_D, BUSH_L, MID_D = 2.4, 8.0, 3.4  # 轴承孔径、长；中段让位孔径
SEAT_R = 4.2                          # 尾管座外半径（壁厚 ≥ 2.5）
_ax = SHAFT_EXIT[0] + (TUBE_TOP_Z - SHAFT_EXIT[1]) / np.tan(np.radians(SHAFT_ANG))
shaft_info = {}
holes = None
for s in (1, -1):
    y = s * HULL_Y
    a = (_ax, y, TUBE_TOP_Z)
    b = (SHAFT_EXIT[0], y, SHAFT_EXIT[1])
    shaft_info[s] = (a, b)
    A, B = np.asarray(a), np.asarray(b)
    f_ = (A - B) / np.linalg.norm(A - B)
    t0 = (0.0 - B[0]) / f_[0]                     # 轴线穿过尾板 x=0 处离 b 的距离
    t1 = np.linalg.norm(A - B)
    h = to_manifold(cylinder_between(tuple(A + f_ * 2.0), B - f_ * 2.0, BUSH_D / 2, seg=24))
    h = h + to_manifold(cylinder_between(tuple(B + f_ * (t0 + BUSH_L)), tuple(B + f_ * (t1 - BUSH_L)), MID_D / 2, seg=24))
    holes = h if holes is None else holes + h

# 尾管座：实心管座从尾板一直通到内端口 a，穿过浮体内腔（先掏空内腔再加，不被掏掉）；尾端凸出龙骨约 3.5 mm，像一个小尾鳍
tube_seat = None
for s in (1, -1):
    a, b = shaft_info[s]
    r_ = to_manifold(cylinder_between(a, b, SEAT_R, seg=36)) ^ m3d.Manifold.cube((a[0], 20.0, 50.0)).translate((0.0, s * HULL_Y - 10.0, -10.0))
    # 竖筋：管座下面一道 2 mm 厚的板连到船底，管座不再是 100 多 mm 的悬臂（联轴器那头不晃，打印也不用撑）
    zx = lambda x: b[2] + (x - b[0]) * np.tan(np.radians(SHAFT_ANG))
    xr = a[0] - 6.0
    web = m3d.Manifold.extrude(m3d.CrossSection([np.array([(0.0, -6.0), (xr, -6.0), (xr, zx(xr)), (0.0, zx(0.0))])]), 2.0)
    web = web.rotate((90.0, 0.0, 0.0)).translate((0.0, s * HULL_Y + 1.0, 0.0)) ^ to_manifold(hull_outer[s])
    r_ = r_ + web
    tube_seat = r_ if tube_seat is None else tube_seat + r_

body = body - cavity + tube_seat - holes
# 舱口围壁：电子舱一圈 2 mm 厚、8 mm 高的围壁，舱罩裙边插在里面，贴密封条防水
coaming_out = [(38, -40), (165.4, -40), (186.3, 0), (165.4, 40), (38, 40)]
coaming = prism(coaming_out, 36.0, 44.0) - prism(bay_poly, 35.0, 45.0)   # 分件后并进甲板（下沿 z=36 低于分缝）

# ---------- PCB 托盘：架高 4 mm 的 4 个托脚 + 挡条 + 4 个卡扣（板子上没有安装孔，不改 PCB）----------
# 板子 56.1 × 38.1 × 1.6。本地坐标 (xl, yl)：原点在板框左上角（KiCad 工程原点 100,100），xl 向右、yl 向下（从顶面看）。
# 位置依据：QB12_KiCad 的 3D 导出（kicad-cli pcb export glb --subst-models --include-pads）：
#   板底只有左边缘 xl<9.5 有凸出的焊脚（最长 1.26 mm），其余底面是平的 -> 托脚都放在 xl>=12；
#   左边缘是 J3/J4/J2 接线座（水平插拔）和 SW1（探出板框 1.0 mm）-> 左边不放挡条；
#   板顶四边净空：上边 xl 8..32、下边 xl 0..20、右边 yl 3..35 在板边 1 mm 内没有元件（上边 xl>=34 是天线，不放）-> 卡扣只放这些位置。
PCB_FLIP = True            # True：接线座一边朝船头（离电机最近，线短）；False：朝船尾
PCB_CX, PCB_CY = 88.0, 0.0  # 板子中心在船上的位置（舱口直段 x 40..164 的偏后处，前面留给电池）
PCB_W, PCB_H, PCB_T = 56.1, 38.1, 1.6
PCB_STAND = 4.0            # 架高
FLOOR_Z = 31.8             # 舱底（deck_in 下表面）
CLR = 0.4                  # 板边到挡条/卡扣的间隙（单边）
ZB = FLOOR_Z + PCB_STAND   # 板底
ZT = ZB + PCB_T            # 板顶


def pcb_pt(xl, yl):
    """板子本地坐标 -> 船体坐标"""
    dx, dy = xl - PCB_W / 2 + 0.05, yl - PCB_H / 2 + 0.05
    return (PCB_CX - dx, PCB_CY + dy) if PCB_FLIP else (PCB_CX + dx, PCB_CY - dy)


def pcb_box(x0, x1, y0, y1, z0, z1):
    """本地坐标下的长方块（xl x0..x1, yl y0..y1）"""
    a, b = pcb_pt(x0, y0), pcb_pt(x1, y1)
    lo = (min(a[0], b[0]), min(a[1], b[1]))
    hi = (max(a[0], b[0]), max(a[1], b[1]))
    return m3d.Manifold.cube((hi[0] - lo[0], hi[1] - lo[1], z1 - z0)).translate((lo[0], lo[1], z0))


def pcb_hook(edge, c, w):
    """沿板边的一个卡扣：edge 'top'|'bottom'|'right'，c = 沿边中心的本地坐标，w = 宽。
    截面（n 向板内为正，z 向上）：竖直弹片厚 1.0，顶端向内探出 0.5 压住板顶，上面是斜导入面。"""
    prof = [(-CLR - 1.0, FLOOR_Z - 0.4), (-CLR, FLOOR_Z - 0.4), (-CLR, ZT + 0.2), (0.5, ZT + 0.2), (0.5, ZT + 0.5),
            (-CLR, ZT + 1.5), (-CLR - 1.0, ZT + 1.5)]
    sol = m3d.Manifold.extrude(m3d.CrossSection([np.array(prof, float)]), w).rotate((90, 0, 0)).translate((0, w / 2, 0))
    # 现在：x=n（向板内），y=沿边，z=高；板边中点在原点。转到边的朝向
    if edge == "top":
        p0, nloc = (c, -0.05), (0, 1)
    elif edge == "bottom":
        p0, nloc = (c, PCB_H - 0.05), (0, -1)
    else:
        p0, nloc = (PCB_W - 0.05, c), (-1, 0)
    q = pcb_pt(*p0)
    q2 = pcb_pt(p0[0] + nloc[0], p0[1] + nloc[1])
    ang = np.degrees(np.arctan2(q2[1] - q[1], q2[0] - q[0]))
    return sol.rotate((0, 0, ang)).translate((q[0], q[1], 0))


tray = None
def add(t):
    global tray
    tray = t if tray is None else tray + t

# 4 个托脚（板底 xl>=12 无凸出物），顶面 = 板底
for (x0, x1, y0, y1) in ((12, 18, 3, 8), (12, 18, 30, 35), (46, 52, 4, 8), (46, 52, 30, 35)):
    add(pcb_box(x0, x1, y0, y1, FLOOR_Z - 0.4, ZB))
# 挡条（高到板顶）：右边两段、上边和下边各一段
RW = 1.2
for (x0, x1, y0, y1) in ((PCB_W + CLR, PCB_W + CLR + RW, 3, 16), (PCB_W + CLR, PCB_W + CLR + RW, 24, 35),
                         (17, 23, -CLR - RW, -CLR), (13, 19, PCB_H + CLR, PCB_H + CLR + RW)):
    add(pcb_box(x0, x1, y0, y1, FLOOR_Z - 0.4, ZT))
# 左边两个角上的端挡块（拔插头时板子不往后跑；挡在板框外，不碰接线座）
add(pcb_box(-CLR - 1.2, -CLR, -CLR - 1.2, 1.0, FLOOR_Z - 0.4, ZT))
add(pcb_box(-CLR - 1.2, -CLR, PCB_H - 1.0 + CLR, PCB_H + CLR + 1.2, FLOOR_Z - 0.4, ZT))
# 4 个卡扣
for (edge, c, w) in (("top", 13, 6), ("top", 27, 6), ("bottom", 9, 6), ("right", 20, 6)):
    add(pcb_hook(edge, c, w))
body = body + tray

# ---------- 电机舱口 + 卡扣托座（每个浮体一套，y 镜像）----------
# 电机：万宝至 RF-130CH-12250，10-27 实物卡尺量：铁壳 Ø17.18 × 22.79，后端接线片伸出 3.58，前端轴承凸台约 1.6，轴 Ø1.49 露出 6.8（官网 φ17.1×22.8）。圆形、没有平边。
# 11-11 改：不用压盖和螺丝。船体上直接打两个 C 形卡环（包 220°，开口朝上），电机从舱口往下一按卡进去；
# 卡环内径比电机小 CLIP_PRESS，靠夹紧力防转；前后各一个半圈挡块（只在下半圈，不挡放入），防电机前后窜。
MOTOR_D, MOTOR_FLAT, MOTOR_L = 17.18, 17.18, 22.79
SHAFT_D, SHAFT_LEN = 1.49, 6.8         # 实物量；联轴器用内径 1.3 的硅胶管
MOTOR_S0 = 12.0                       # 电机机身前端面离尾管内端口 a 的距离（中间是联轴器）
TAB_L, TAB_R = 3.58, 6.0              # 后端接线片伸出长度、按半径 6 让开
CLIP_S = (17.0, 29.5)                 # 两个卡环沿轴向的中心（都在机身 s=12..34.8 之内）
CLIP_T = 5.0                          # 卡环沿轴向的厚度
CLIP_WALL = 1.8                       # 卡环壁厚
CLIP_WRAP = 220.0                     # 包角（度）：开口弦长 2R·sin(70°)=16.1，比电机窄 1.0，每边撑开 0.5
CLIP_PRESS = 0.2                      # 卡环内径比电机小多少（直径）
STOP_T = 1.5                          # 前后挡块厚度
STOP_GAP = 0.4                        # 挡块离电机端面的间隙
# 11-11 晚：甲板和船体拆两件，抽拉盖板、导轨、舱口都取消；装电机时整块甲板掀开，电机上方甲板鼓包让位（见“分件”）


def axis_matrix(sgn, s):
    """局部坐标 (u 横向, v 垂直轴线向上, w 沿轴线向船头) -> 船体坐标，原点在轴线上离 a 为 s 处"""
    a, b = np.asarray(shaft_info[sgn][0], float), np.asarray(shaft_info[sgn][1], float)
    f = (a - b) / np.linalg.norm(a - b)
    lx, lz = np.array([0.0, 1.0, 0.0]), f
    ly = np.cross(lz, lx)
    P = a + f * s
    return np.column_stack([lx, ly, lz, P])


def axis_prism(sgn, s, thick, profile_uv):
    """截面（u,v）沿轴线拉伸 thick，中心在 s"""
    pr = np.asarray(profile_uv, float)
    if (pr[:, 0] * np.roll(pr[:, 1], -1) - np.roll(pr[:, 0], -1) * pr[:, 1]).sum() < 0:
        pr = pr[::-1]
    sol = m3d.Manifold.extrude(m3d.CrossSection([pr]), thick).translate((0, 0, -thick / 2))
    return sol.transform(axis_matrix(sgn, s))


def arc_band(ri, ro, deg0, deg1, n=40):
    """(u,v) 平面上的一段圆环，角度从 +u 轴逆时针量"""
    th = np.radians(np.linspace(deg0, deg1, n))
    return np.vstack([np.c_[ro * np.cos(th), ro * np.sin(th)], np.c_[ri * np.cos(th[::-1]), ri * np.sin(th[::-1])]])


R_M = MOTOR_D / 2
RI = R_M - CLIP_PRESS / 2
RO = RI + CLIP_WALL
_open = (360.0 - CLIP_WRAP) / 2       # 开口半角，以 +v 为中心


# 卡扣托座：分件后加到船体（后卡环开口两端高过 z=40，不能被分缝切掉）
cradle_parts = {1: None, -1: None}
for sgn in (1, -1):
    parts = []
    for s_c in CLIP_S:
        cring = arc_band(RI, RO, 90.0 + _open, 90.0 - _open + 360.0)
        ped = [(-5.0, -45.0), (5.0, -45.0), (5.0, -RI - 0.6), (-5.0, -RI - 0.6)]   # 下面的支柱一直到浮体底
        parts += [axis_prism(sgn, s_c, CLIP_T, cring), axis_prism(sgn, s_c, CLIP_T, ped)]
    # 前挡块：电机前端面前面，只做下半圈（u,v 平面 200°..340°），内半径让开轴承凸台
    parts.append(axis_prism(sgn, MOTOR_S0 - STOP_GAP - STOP_T / 2, STOP_T, arc_band(4.0, RO, 200.0, 340.0)))
    # 后挡块：电机后端面后面，下半圈，内半径让开接线片
    s_back = MOTOR_S0 + MOTOR_L + STOP_GAP + STOP_T / 2
    parts.append(axis_prism(sgn, s_back, STOP_T, arc_band(TAB_R + 0.8, RO, 200.0, 340.0)))
    # 挡块下面也要支柱连到卡环/浮体底
    for s_st in (MOTOR_S0 - STOP_GAP - STOP_T / 2, s_back):
        parts.append(axis_prism(sgn, s_st, STOP_T, [(-3.0, -45.0), (3.0, -45.0), (3.0, -RO + 0.5), (-3.0, -RO + 0.5)]))
    cp = parts[0]
    for q in parts[1:]:
        cp = cp + q
    cp = cp - m3d.Manifold.cylinder(MOTOR_L + 2 * STOP_GAP, RI, circular_segments=96).transform(axis_matrix(sgn, MOTOR_S0 - STOP_GAP))
    cradle_parts[sgn] = cp ^ to_manifold(hull_outer[sgn])   # 不伸出浮体外壳


# ---------- 电池仓：PCB 前面（x 大的一边），603450 型 6 × 34 × 50 mm，浅仓 + 绑带槽 + 给电池线留的缺口 ----------
BAT_L, BAT_W, BAT_T = 50.0, 34.0, 6.0     # 电池实物尺寸（量到实物再改）
BAT_CLR = 0.5                              # 单边余量
BAT_X0 = 122.0                             # 仓内后端（靠 PCB 一侧）；x0+L+2·CLR ≤ 174.2，否则船头收尖处放不下
BAT_WALL, BAT_WH = 1.2, 4.0                # 围墙厚、高
bx0, bx1 = BAT_X0, BAT_X0 + BAT_L + 2 * BAT_CLR
by = BAT_W / 2 + BAT_CLR
bat = (m3d.Manifold.cube((bx1 - bx0 + 2 * BAT_WALL, 2 * (by + BAT_WALL), BAT_WH)).translate((bx0 - BAT_WALL, -(by + BAT_WALL), FLOOR_Z - 0.5))
       - m3d.Manifold.cube((bx1 - bx0, 2 * by, BAT_WH + 2)).translate((bx0, -by, FLOOR_Z)))
# 电池线缺口：J2 在船体坐标约 y=13.7，从后墙穿出；缺口宽 10
bat = bat - m3d.Manifold.cube((BAT_WALL + 2, 10.0, BAT_WH + 2)).translate((bx0 - BAT_WALL - 1, 13.7 - 5.0, FLOOR_Z))
# 橡皮筋挂钩：长边墙外侧各两个蘑菇头小柱（电池长度的 1/3、2/3 处），橡皮筋从电池上面横跨；电池底下再贴一块双面泡棉胶
for fx in (1 / 3, 2 / 3):
    cx = bx0 + (bx1 - bx0) * fx
    for sy in (1, -1):
        py = sy * (by + BAT_WALL + 2.0)
        bat = bat + m3d.Manifold.cylinder(BAT_WH + 4.0, 1.3, circular_segments=24).translate((cx, py, FLOOR_Z - 0.5))   # 顶 z=39.3，低于分缝
        bat = bat + m3d.Manifold.cylinder(1.2, 2.3, circular_segments=24).translate((cx, py, FLOOR_Z - 0.5 + BAT_WH + 4.0 - 1.2))
body = body + bat

# 舱罩橡皮筋挂钩：舱罩两侧（船尾 x=60,y=±47；船头 x=182,y=±33）桥甲板上各一个蘑菇头柱，两根橡皮筋从舱罩顶上横跨压住
hooks = None
for (px, py) in ((60.0, 47.0), (182.0, 33.0)):
    for sy in (1, -1):
        hk = m3d.Manifold.cylinder(9.0, 1.5, circular_segments=24).translate((px, sy * py, 43.0))
        hk = hk + m3d.Manifold.cylinder(1.3, 2.5, circular_segments=24).translate((px, sy * py, 43.0 + 9.0 - 1.3))
        hooks = hk if hooks is None else hooks + hk

# ---------- 分件（11-11 晚）：z=SPLIT_Z 水平分缝，下面是船体（浮体、尾管、卡环、PCB 托盘、电池仓），上面是甲板 ----------
# 船体顶面一圈 RIM_W 宽的平台，中间开 1×3 泡棉条的槽；甲板往下伸一圈裙边插进平台内侧对位；
# 11-11 夜：不用螺丝。船头：两个浮体各一块插舌（甲板上）插进船体船头的横槽，槽顶的唇压住插舌；
# 船尾：两个旋钮扣（单独打印），旋钮下端的凸轮臂转 90° 伸到船体平台底下，臂顶两侧倒角当斜坡，转进去时把甲板往下拉、压扁泡棉条。
# 装：甲板往船尾错开 SLIDE 平着放下（插舌在槽口后面），往船头推 SLIDE，插舌滑进槽（槽口、插舌尖有导入倒角，推进去时把甲板压低、压扁泡棉条），
# 再转旋钮锁住；锁住后臂的后面有一块挡块，甲板不能往后退。拆：反过来。
# （先试过“船尾抬起、以槽口为支点放下”：甲板在槽口前面那段船头会往下转进船体，做不到）
# 裙边只留两侧直段（x 31..110）：船尾、隧道口、船头收窄处都去掉，否则甲板前后推不动。
SPLIT_Z = 40.0
RIM_W, RIM_H = 5.0, 3.0                # 平台宽（从外表面往里）、厚
GROOVE_IN, GROOVE_OUT, GROOVE_DEPTH = 1.0, 4.0, 0.6   # 密封槽：离外表面 1..4（宽 3），深 0.6；泡棉条 1 厚压到 0.6
SKIRT_GAP, SKIRT_T, SKIRT_D = 0.4, 1.6, 5.0           # 裙边离平台内沿 0.4、厚 1.6、往下伸 5
# 船头插舌（每个浮体一块，在浮体中线上，指向船头）
TONGUE_X0, POST_X1, POCKET_X0 = 207.0, 211.6, 212.0   # 插舌根部立柱 x 207..211.6（往上连甲板），船体横槽口在 x=212
TONGUE_X1, POCKET_X1 = 217.6, 218.0    # 插舌伸进槽 5.6，槽底留 0.4
TONGUE_W, POCKET_W = 6.4, 7.2          # 宽：插舌 6.4，槽 7.2（每边 0.4）
LIP_Z, TONGUE_T, TONGUE_GAP = 38.4, 1.6, 0.1   # 槽顶（唇下沿）z；插舌厚；插舌顶离唇 0.1（泡棉条把甲板顶起时由唇挡住 → 泡棉压 0.3）
POCKET_Z0 = 35.0                       # 槽底（放下甲板时插舌尖往下转，要留空）
BOW_BLOCK_X0 = 212.0                   # 船体船头这段 z 33..40 填实，槽开在里面
# 船尾旋钮扣（单独打印 2 个，相同）
KNOB_X, KNOB_IN = 14.0, 10.0           # 旋钮轴：x=14，离舷侧外表面 10
SHAFT_R, HOLE_R, SLEEVE_R = 2.3, 2.55, 4.5     # 轴 Ø4.6，甲板孔 Ø5.1，甲板孔周围实心套 Ø9
HEAD_R, HEAD_T = 9.0, 3.0              # 旋钮头 Ø18 × 3，压在甲板面上（盖住钥匙孔）
GRIP = (12.0, 2.4, 3.0)                # 头顶拧手：长 12、宽 2.4、高 3
ARM_REACH, ARM_W, ARM_T, ARM_CH = 7.7, 4.0, 1.6, 0.6   # 凸轮臂：从轴心伸出 7.7、宽 4、厚 1.6、顶两侧倒角 0.6（斜坡）
RIM_UNDER_GAP = 0.1                    # 臂顶离平台底 0.1（同插舌）
DETENT_R, DETENT_H, DETENT_RAD = 0.8, 0.4, 7.0  # 甲板面上的小凸点（锁住、松开两个位置各一个），旋钮头底面 0°、±90° 三道小槽
SLIDE = 6.0                            # 装甲板时往船头推的距离
LEAD = 1.0                             # 槽口、插舌尖导入倒角
BULGE_R, BULGE_CLR = 13.9, 12.3        # 电机鼓包外半径、内腔半径（卡环外半径 10.4；甲板错开 6 mm 放下时轴线垂直方向偏 1.6，所以放大）
BULGE_S = (-4.6, 46.8)                 # 鼓包沿轴线范围（联轴器到接线片后面，再加甲板错开时的 6.2）
BULGE_Y_IN = 42.6                      # 鼓包靠中线一侧切平（舱罩底边 y=±42）

outer_solid = to_manifold(hull_outer[1]) + to_manifold(hull_outer[-1]) + deck
S40 = outer_solid.slice(SPLIT_Z)
ring_cs = lambda o0, o1: S40.offset(-o0, m3d.JoinType.Round, 2.0, 32) - S40.offset(-o1, m3d.JoinType.Round, 2.0, 32)
big = 1000.0
below = m3d.Manifold.cube((big, big, SPLIT_Z + 100)).translate((-big / 2, -big / 2, -100))
above = m3d.Manifold.cube((big, big, 100)).translate((-big / 2, -big / 2, SPLIT_Z))


def outer_y(x):
    """z=SPLIT_Z 处浮体舷侧外表面的 y（+y 浮体）"""
    r = outer_ring(x)
    side = r[:12]          # 右舷：底 7 点 + 舷侧 5 点（到舷顶）
    k = np.where(side[:, 1] >= SPLIT_Z)[0][0]
    (y0, z0), (y1, z1) = side[k - 1], side[k]
    return HULL_Y + y0 + (y1 - y0) * (SPLIT_Z - z0) / (z1 - z0)


knobs = [(KNOB_X, sy * (outer_y(KNOB_X) - KNOB_IN)) for sy in (1, -1)]
RIM_Z0 = SPLIT_Z - RIM_H               # 平台底 z=37
ARM_Z1 = RIM_Z0 - RIM_UNDER_GAP        # 臂顶
ARM_Z0 = ARM_Z1 - ARM_T
TONGUE_Z1 = LIP_Z - TONGUE_GAP
TONGUE_Z0 = TONGUE_Z1 - TONGUE_T
box = lambda x0, x1, y0, y1, z0, z1: m3d.Manifold.cube((x1 - x0, y1 - y0, z1 - z0)).translate((x0, y0, z0))

hull = body ^ below
rim = m3d.Manifold.extrude(ring_cs(0.0, RIM_W), RIM_H).translate((0, 0, RIM_Z0)) ^ outer_solid
hull = hull + rim
for sgn in (1, -1):   # 船头：填实一段，开横槽
    cy = sgn * HULL_Y
    hull = hull + (box(BOW_BLOCK_X0, 245.0, cy - 15, cy + 15, 33.0, SPLIT_Z) ^ outer_solid)
hull = hull - m3d.Manifold.extrude(ring_cs(GROOVE_IN, GROOVE_OUT), GROOVE_DEPTH + 1).translate((0, 0, SPLIT_Z - GROOVE_DEPTH))
for sgn in (1, -1):
    cy = sgn * HULL_Y
    hull = hull - box(POCKET_X0 - 1.0, POCKET_X1, cy - POCKET_W / 2, cy + POCKET_W / 2, POCKET_Z0, LIP_Z)
    pt = lambda x, z: box(x, x + 0.01, cy - POCKET_W / 2, cy + POCKET_W / 2, z, z + 0.01)
    hull = hull - (pt(POCKET_X0 - 0.5, LIP_Z) + pt(POCKET_X0 + LEAD, LIP_Z) + pt(POCKET_X0 - 0.5, LIP_Z + LEAD + 0.5)).hull()   # 唇下沿导入倒角
hull = hull + cradle_parts[1] + cradle_parts[-1]
for (kx, ky) in knobs:   # 旋钮挡块：挂在平台底下、锁住时臂的后面（-x），挡甲板后退，也挡旋钮转过头
    sgn = 1 if ky > 0 else -1
    yo = sgn * outer_y(kx)
    y_in = yo - sgn * RIM_W
    hull = hull + (box(kx - ARM_W / 2 - 0.4 - 2.6, kx - ARM_W / 2 - 0.4, min(y_in, yo), max(y_in, yo), RIM_Z0 - 2.0, RIM_Z0 + 0.5) ^ outer_solid)

deck_part = (body ^ above) + coaming + hooks
skirt = m3d.Manifold.extrude(ring_cs(RIM_W + SKIRT_GAP, RIM_W + SKIRT_GAP + SKIRT_T), 30.0).translate((0, 0, SPLIT_Z - SKIRT_D)) ^ outer_solid
skirt = skirt ^ box(31.0, 110.0, -100, 100, 0, 60)           # 只留两侧直段（见上面说明）
for (kx, ky) in knobs:                                         # 凸轮臂扫过的地方，裙边下半截让开
    skirt = skirt - m3d.Manifold.cylinder(ARM_Z1 + 0.4 - 20.0, ARM_REACH + 0.5, circular_segments=48).translate((kx, ky, 20.0))
deck_part = deck_part + skirt
for sgn in (1, -1):   # 插舌：立柱从甲板下来，插舌往船头伸
    cy = sgn * HULL_Y
    deck_part = deck_part + (box(TONGUE_X0, POST_X1, cy - TONGUE_W / 2, cy + TONGUE_W / 2, TONGUE_Z0, 60.0) ^ outer_solid)
    tg = box(TONGUE_X0, TONGUE_X1, cy - TONGUE_W / 2, cy + TONGUE_W / 2, TONGUE_Z0, TONGUE_Z1)
    pt = lambda x, z: box(x, x + 0.01, cy - TONGUE_W / 2 - 1, cy + TONGUE_W / 2 + 1, z, z + 0.01)
    tg = tg - (pt(TONGUE_X1 - LEAD, TONGUE_Z1) + pt(TONGUE_X1 + 1, TONGUE_Z1) + pt(TONGUE_X1 + 1, TONGUE_Z1 - LEAD - 1)).hull()   # 插舌尖顶面倒角
    deck_part = deck_part + tg
for (kx, ky) in knobs:   # 旋钮轴的实心套
    deck_part = deck_part + (m3d.Manifold.cylinder(30.0, SLEEVE_R, circular_segments=40).translate((kx, ky, SPLIT_Z)) ^ outer_solid)
# 电机鼓包：沿轴线的圆柱，外 BULGE_R、内 BULGE_CLR，只取分缝以上；靠中线一侧切平
for sgn in (1, -1):
    yhalf = lambda y0: m3d.Manifold.cube((big, big, big)).translate((-big / 2, y0 if sgn > 0 else -big - y0, -big / 2))
    L_b = BULGE_S[1] - BULGE_S[0]
    shell = m3d.Manifold.cylinder(L_b, BULGE_R, circular_segments=72).transform(axis_matrix(sgn, BULGE_S[0]))
    inner = m3d.Manifold.cylinder(L_b - 2 * 1.6, BULGE_CLR, circular_segments=72).transform(axis_matrix(sgn, BULGE_S[0] + 1.6))
    deck_part = deck_part + (shell ^ above ^ yhalf(BULGE_Y_IN))
    deck_part = deck_part - (inner ^ yhalf(BULGE_Y_IN + 1.4))   # 内侧平壁厚 1.4


def arm_local():
    """凸轮臂（局部坐标：轴心在原点，臂指向 +x，z 为船体坐标）：截面是梯形（顶两侧倒角），头部圆"""
    def seg(w, z0, z1):
        b = m3d.Manifold.cube((ARM_REACH - w / 2, w, z1 - z0)).translate((0, -w / 2, z0))
        return b + m3d.Manifold.cylinder(z1 - z0, w / 2, circular_segments=32).translate((ARM_REACH - w / 2, 0, z0))
    lo = seg(ARM_W, ARM_Z0, ARM_Z1 - ARM_CH)
    hi = seg(ARM_W - 2 * ARM_CH * 2, ARM_Z1 - 0.01, ARM_Z1)
    return (lo + hi).hull() + m3d.Manifold.cylinder(ARM_T, ARM_W / 2 + 0.6, circular_segments=32).translate((0, 0, ARM_Z0))


def knob_local():
    """旋钮（臂指向 +x）：头压在甲板面 top_z(KNOB_X) 上"""
    zt = top_z(KNOB_X)
    k = m3d.Manifold.cylinder(zt - ARM_Z0, SHAFT_R, circular_segments=40).translate((0, 0, ARM_Z0))
    k = k + arm_local()
    k = k + m3d.Manifold.cylinder(HEAD_T, HEAD_R, circular_segments=64).translate((0, 0, zt))
    k = k + m3d.Manifold.cube(GRIP).translate((-GRIP[0] / 2, -GRIP[1] / 2, zt + HEAD_T))
    k = k + m3d.Manifold.cube((2.0, 2.0, 0.8)).translate((GRIP[0] / 2 - 2.0, -1.0, zt + HEAD_T + GRIP[2] - 0.01))   # 指示箭头：小凸起在臂的方向
    # 头底面一道小槽（对着臂的方向），落到甲板凸点上
    for a in (0.0, 90.0, -90.0):
        k = k - m3d.Manifold.cylinder(2 * DETENT_H, DETENT_R + 0.2, circular_segments=24).translate((DETENT_RAD, 0, zt - DETENT_H)).rotate((0, 0, a))
    return k


def place(m, kx, ky, ang):
    return m.rotate((0, 0, ang)).translate((kx, ky, 0))


lock_ang = {1: 90.0, -1: -90.0}         # 锁住：臂指向舷外；松开：臂指向船头（0°）；装进去：臂指向舷内（钥匙孔方向）
for (kx, ky) in knobs:
    sgn = 1 if ky > 0 else -1
    zt = top_z(kx)
    # 钥匙孔：轴孔 + 臂形状（指向舷内），旋钮头 Ø18 盖住
    keyhole = m3d.Manifold.cylinder(40.0, HOLE_R, circular_segments=40).translate((0, 0, SPLIT_Z - 5))
    keyhole = keyhole + m3d.Manifold.cube((ARM_REACH + 0.4, ARM_W + 0.8, 40.0)).translate((0, -(ARM_W + 0.8) / 2, SPLIT_Z - 5))
    deck_part = deck_part - place(keyhole, kx, ky, -lock_ang[sgn])
    for a in (0.0, lock_ang[sgn]):        # 甲板面上两个小凸点：松开、锁住
        deck_part = deck_part + place(m3d.Manifold.sphere(DETENT_R, 24).translate((DETENT_RAD, 0, zt + DETENT_H - DETENT_R)) ^ box(-50, 50, -50, 50, zt - 0.5, zt + 5), kx, ky, a)
knob_print = knob_local()
knobs_locked = None
knobs_open = None
for (kx, ky) in knobs:
    sgn = 1 if ky > 0 else -1
    a = place(knob_print, kx, ky, lock_ang[sgn]); b = place(knob_print, kx, ky, 0.0)
    knobs_locked = a if knobs_locked is None else knobs_locked + a
    knobs_open = b if knobs_open is None else knobs_open + b


def clean(man, name):
    m = to_trimesh(man)
    m.update_faces(m.nondegenerate_faces())   # 同轴圆柱相减会留下零面积三角形
    m.remove_unreferenced_vertices()
    print(name, "pieces:", len(m.split(only_watertight=False)), file=sys.stderr)
    return m


hull_mesh = clean(hull, "hull")
deck_mesh = clean(deck_part, "deck")
body_mesh = clean(hull + deck_part + knobs_locked, "assembled")   # 装配好的整船（检查和渲染用，不打印）

# ---------- 舱罩 ----------
canopy_poly = [(36, -42), (168, -42), (192, 0), (168, 42), (36, 42)]
cpoly = np.array(canopy_poly, float)
about = (cpoly[:, 0].min() + 20, 0.0)  # 以偏后位置为缩放中心 -> 前部斜下来
shell_out = prism(canopy_poly, 44.0, 66.0, scale_top=(0.72, 0.62), about=about)
inset = [(37.8, -40.4), (166.7, -40.4), (189.6, 0), (166.7, 40.4), (37.8, 40.4)]
shell_in = prism(inset, 42.0, 64.6, scale_top=(0.735, 0.64), about=about)
# 插入电子舱的裙边（单边间隙 0.5 mm，裙边厚 2 mm，深 6 mm）：原来 0.3，整船 ±0.3% 公差下 120 mm 长可能卡，整体往里收 0.2
PLUG_SHRINK = 0.2
_shrink = lambda poly: np.asarray(m3d.CrossSection([np.asarray(poly, float)]).offset(-PLUG_SHRINK, m3d.JoinType.Miter).to_polygons()[0])
plug_out = _shrink([(40.3, -37.7), (163.8, -37.7), (183.5, 0), (163.8, 37.7), (40.3, 37.7)])
plug_in = _shrink([(42.3, -35.7), (162.2, -35.7), (180.6, 0), (162.2, 35.7), (42.3, 35.7)])
plug = prism(plug_out, 38.0, 44.2) - prism(plug_in, 37.0, 45.0)
# 连接边：裙边和外壳内壁之间隔 2.7 mm，原来是两块分开的实体（嘉立创报"多壳体"）；底部加 1.5 mm 厚一圈把两者连起来，外形不变
flange = (prism(canopy_poly, 44.0, 45.5) ^ shell_out) - prism(plug_in, 43.0, 46.0)
canopy = (shell_out - shell_in) + plug + flange
# 舱罩不开孔：开机要手动取下舱罩拨 SW1（舱罩靠橡皮筋压着）
canopy_mesh = to_trimesh(canopy)

# ---------- 检查 ----------
report = {}
for name, m in (("hull", hull_mesh), ("deck", deck_mesh), ("canopy", canopy_mesh), ("knob", to_trimesh(knob_print))):
    report[name] = {
        "watertight": bool(m.is_watertight),
        "volume_cm3": round(m.volume / 1000, 1),
        "bounds_mm": np.round(m.bounds, 1).tolist(),
        "faces": int(len(m.faces)),
    }

RESIN = 1.15  # 光敏树脂 g/cm3
print_mass = (hull_mesh.volume + deck_mesh.volume + canopy_mesh.volume + 2 * knob_print.volume()) / 1000 * RESIN
electronics = {"电池 1S 1200mAh": 25, "130 电机 x2": 36, "主板": 8,
               "轴/轴套/桨/联轴器": 18, "线材/胶/泡棉条": 11}
total = print_mass + sum(electronics.values())

# 吃水：两个浮体外形在水线以下的排水体积 = 总重
hulls_only = to_manifold(hull_outer[1]) + to_manifold(hull_outer[-1])


def displaced(zw):
    box = m3d.Manifold.cube((400, 300, zw + 50)).translate((-80, -150, -50))
    return (hulls_only ^ box).volume() / 1000.0  # cm3 = g


lo, hi = 0.0, 40.0
for _ in range(40):
    mid = (lo + hi) / 2
    if displaced(mid) < total:
        lo = mid
    else:
        hi = mid
draft = (lo + hi) / 2
reserve = displaced(30.0) / total  # 到隧道底面前的储备浮力倍数

report["mass_g"] = {"print_resin": round(print_mass), "electronics": electronics, "total": round(total)}
report["draft_mm"] = round(draft, 1)
report["reserve_buoyancy_to_tunnel_x"] = round(reserve, 2)
print(json.dumps(report, ensure_ascii=False, indent=1))

def export_print(mesh, path):
    """打印件导出前检查：必须是 1 块实体、封闭、法向一致，否则报错不导出。"""
    pieces = len(mesh.split(only_watertight=False))
    if pieces != 1 or not mesh.is_watertight or not mesh.is_winding_consistent:
        sys.exit(f"{path}: 实体 {pieces} 块，watertight={mesh.is_watertight}，winding={mesh.is_winding_consistent}，不导出")
    mesh.export(path)


export_print(hull_mesh, f"{OUT}/QB12_hull.stl")
export_print(deck_mesh, f"{OUT}/QB12_deck.stl")
export_print(canopy_mesh, f"{OUT}/QB12_canopy.stl")
body_mesh.export(f"{OUT}/QB12_body_assembled.stl")   # 船体 + 甲板合在一起，只给检查和渲染用
# 泡棉密封条（展示用，压扁后在槽里的样子）：装配动画用
to_trimesh(m3d.Manifold.extrude(ring_cs(GROOVE_IN + 0.15, GROOVE_OUT - 0.15), GROOVE_DEPTH).translate((0, 0, SPLIT_Z - GROOVE_DEPTH))).export(f"{OUT}/QB12_gasket_placed.stl")
report["knobs_xy"] = [[round(x, 1), round(y, 1)] for (x, y) in knobs]
report["knob"] = {"lock_ang": lock_ang[1], "arm_z": [round(ARM_Z0, 2), round(ARM_Z1, 2)], "rim_z0": RIM_Z0, "top_z": round(top_z(KNOB_X), 2)}
report["slide"] = SLIDE
report["tongue"] = {"pivot": [POCKET_X0, LIP_Z], "x": [TONGUE_X0, TONGUE_X1], "z": [round(TONGUE_Z0, 2), round(TONGUE_Z1, 2)]}
# 旋钮：打印件（头朝下平放）和装配位置（锁住 / 松开）
_kf = knob_print.rotate((180.0, 0.0, 0.0)); _bb = _kf.bounding_box()
export_print(to_trimesh(_kf.translate((-(_bb[0] + _bb[3]) / 2, -(_bb[1] + _bb[4]) / 2, -_bb[2]))), f"{OUT}/QB12_knob.stl")
to_trimesh(knobs_locked).export(f"{OUT}/QB12_knobs_locked.stl")
to_trimesh(knobs_open).export(f"{OUT}/QB12_knobs_open.stl")
# 给 USDZ / 渲染用的装配件
np.save(f"{OUT}/shaft_info.npy", np.array([shaft_info[1], shaft_info[-1]]))
with open(f"{OUT}/report.json", "w") as f:
    json.dump(report, f, ensure_ascii=False, indent=1)
