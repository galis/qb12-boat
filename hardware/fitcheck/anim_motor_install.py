# 旧一体船体版，11-11 起不再使用
"""电机/尾轴装配动画：沿 y=55 的纵剖面，几何取自 outputs/QB12/QB12_body.stl 和 build_model.py 的参数。运行：python anim_motor_install.py [输出.gif]"""
import os, sys, trimesh, numpy as np, matplotlib
matplotlib.use('Agg'); import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation, PillowWriter
from matplotlib.patches import Polygon
plt.rcParams['font.sans-serif'] = ['PingFang SC', 'Arial Unicode MS', 'Heiti SC']
R = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
m = trimesh.load(f'{R}/outputs/QB12/QB12_body.stl')
sec = m.section(plane_origin=(0, 55, 0), plane_normal=(0, 1, 0))
a = np.array([80., 14.]); b = np.array([-12., -2.2]); f = (a - b) / np.linalg.norm(a - b); n = np.array([-f[1], f[0]])
def P(s, u): return a + f * s + n * u
def box(s0, s1, r0, r1=None):
    r1 = r0 if r1 is None else r1
    return np.array([P(s0, -r0), P(s1, -r0), P(s1, r1), P(s0, r1)])
fig, ax = plt.subplots(figsize=(11, 6.2))
STEPS = [  # (标题, 帧数)
 ("0  准备：船体纵剖面（y=55），舱口在 x 82..118", 10),
 ("1  铜管从船尾穿进尾管座，环氧胶粘牢", 24),
 ("2  尾轴从船尾穿进铜管，前端停在管口里 1.5 mm（让出电机的位置）", 28),
 ("3  电机（联轴器已套上一半）从舱口垂直放进 V 形托座", 30),
 ("4  从船尾把尾轴往船头推 5 mm，插进联轴器", 16),
 ("5  压盖压住电机，每个拧 1 颗 M2 螺丝（螺丝刀从舱口外侧伸进去）", 14),
 ("6  船尾：先套垫片，再装桨", 22),
 ("7  盖板从船头方向沿导轨推进，咔一下卡住（不用螺丝）", 20)]
total = sum(k for _, k in STEPS)
def clamp(t): return float(min(max(t, 0), 1))
def ease(t): t = clamp(t); return t * t * (3 - 2 * t)
def draw(i):
    ax.clear()
    for e in sec.entities:
        p = sec.vertices[e.points]; ax.plot(p[:, 0], p[:, 2], color='#556', lw=1.2)
    k = i; si = 0
    while k >= STEPS[si][1] and si < len(STEPS) - 1: k -= STEPS[si][1]; si += 1
    t = ease(k / max(STEPS[si][1] - 1, 1))
    # 状态
    tube_off = (1 - t) * -45 if si == 1 else (0 if si > 1 else -45)       # 沿轴线（向船尾为负）
    tube_vis = si >= 1
    shaft_end = 3.5                                                         # 轴头位置 s（装好时）
    shaft_vis = si >= 2
    shaft_off = 0.0
    if si == 2: shaft_off = -88.5 + (88.5 - 5) * t                           # 从船尾推进来，停在 -5（轴头在 s=-1.5）
    if si == 3: shaft_off = -5
    if si == 4: shaft_off = -5 * (1 - t)
    if si >= 5: shaft_off = 0
    mot_dz = 0; mot_vis = si >= 3
    if si == 3: mot_dz = 30 * (1 - t)
    # 铜管（s=-81..0，外 Ø4 内 Ø2.1 画成实心条）
    if tube_vis:
        ax.add_patch(Polygon(box(-85 + tube_off, 0 + tube_off, 2.0), fc='#c9a24a', ec='#7a5c10', lw=.8, zorder=4))
    # 尾轴
    if shaft_vis:
        ax.add_patch(Polygon(box(shaft_end - 108 + shaft_off, shaft_end + shaft_off, 1.0), fc='#c8ccd2', ec='#556', lw=.6, zorder=5))
    # 电机
    if mot_vis:
        off = np.array([0, mot_dz])
        ax.add_patch(Polygon(box(12, 34.8, 8.55) + off, fc='#d9534f', ec='#722', lw=1, alpha=.92, zorder=6))
        ax.add_patch(Polygon(box(5, 12, 1.0) + off, fc='#c8ccd2', ec='#556', lw=.6, zorder=6))
        ax.add_patch(Polygon(box(2, 12, 1.9) + off, fc='#4aa3df', ec='#135', lw=.8, alpha=.85, zorder=7))
        ax.text(*(P(23, 0) + off), "电机", ha='center', va='center', color='w', fontsize=11, zorder=8)
    if si >= 5:  # 扎带
        for s in (16, 30):
            ax.add_patch(Polygon(box(s - 2.5, s + 2.5, -8.55, 10.55 - 0.0) if False else np.array([P(s - 2.5, 8.55), P(s + 2.5, 8.55), P(s + 2.5, 10.55), P(s - 2.5, 10.55)]), fc='#f0a030', ec='#842', zorder=9))
    if si >= 6:  # 垫片 + 桨
        d = -12 * (1 - t) if si == 6 else 0
        ax.add_patch(Polygon(box(-96.5 + d, -95.5 + d, 4.0), fc='#aaa', ec='#444', zorder=6))
        ax.add_patch(Polygon(box(-100 + 2 * d, -96.5 + 2 * d, 1.5, 11), fc='#2b8a6a', ec='#154', zorder=6))
    if si >= 7:
        hx = np.array([[74, 44], [126, 44], [126, 46], [74, 46]], float)
        d = 14 * (1 - t); hx[:, 1] += d
        ax.add_patch(Polygon(hx, fc='#2b8a6a', ec='#154', zorder=8))
    ax.set_aspect('equal'); ax.set_xlim(-32, 135); ax.set_ylim(-12, 52); ax.grid(alpha=.2)
    ax.set_title(STEPS[si][0], fontsize=16, loc='left'); ax.set_xlabel('x（船尾 0 → 船头）  mm'); ax.set_ylabel('z  mm')
    ax.text(133, -10, '左=船尾  右=船头', ha='right', fontsize=10, color='#666')
out = sys.argv[1] if len(sys.argv) > 1 else f'{R}/docs/img/电机装配动画.gif'
FuncAnimation(fig, draw, frames=total, interval=90).save(out, writer=PillowWriter(fps=11))
print(out)
