"""从 netlist.py 画网络标号式原理图（SVG），再由浏览器渲染成 PNG / PDF。"""
import sys
from html import escape
from netlist import PARTS

W, H = 2400, 1680
PAPER = "#F7F8F6"
INK = "#1D2A2E"
MUTED = "#5E6E72"
POWER = {"VBUS": "#C2410C", "BAT+": "#C2410C", "BAT_SW": "#C2410C", "VSYS": "#C2410C", "3V3": "#B45309"}
SIG = "#0E7490"
PITCH = 30

out = []


def t(x, y, s, size=14, anchor="start", color=INK, weight=400, family="Noto Sans CJK SC, Noto Sans SC, sans-serif"):
    out.append(f'<text x="{x}" y="{y}" font-size="{size}" text-anchor="{anchor}" fill="{color}" '
               f'font-weight="{weight}" font-family="{family}">{escape(s)}</text>')


def mono(x, y, s, size=13, anchor="start", color=INK, weight=400):
    t(x, y, s, size, anchor, color, weight, "JetBrains Mono, DejaVu Sans Mono, monospace")


def line(x1, y1, x2, y2, w=2, color=INK):
    out.append(f'<path d="M{x1} {y1} L{x2} {y2}" stroke="{color}" stroke-width="{w}" fill="none" stroke-linecap="round"/>')


def gnd(x, y):
    """地符号，接点在 (x, y)，向下画。"""
    line(x, y, x, y + 10)
    line(x - 11, y + 10, x + 11, y + 10)
    line(x - 7, y + 15, x + 7, y + 15)
    line(x - 3, y + 20, x + 3, y + 20)


def netlabel(x, y, net, side):
    """side: 'left' 标签在接点左边；'right' 在右边；'up' 在上方；'down' 在下方。"""
    out.append(f'<g class="nl" data-net="{escape(net)}">')
    _netlabel(x, y, net, side)
    out.append('</g>')


def _netlabel(x, y, net, side):
    if net == "GND":
        if side in ("left", "right"):
            gnd(x, y)
        elif side == "down":
            gnd(x, y)
        else:  # up：地放在上方不常见，统一画在下方
            gnd(x, y)
        return
    if net == "NC":
        line(x - 6, y - 6, x + 6, y + 6, 2, MUTED)
        line(x - 6, y + 6, x + 6, y - 6, 2, MUTED)
        return
    color = POWER.get(net, SIG)
    w = 9 * len(net) + 18
    if side == "left":
        x0 = x - w
        out.append(f'<path d="M{x} {y} L{x-8} {y-11} L{x0} {y-11} L{x0} {y+11} L{x-8} {y+11} Z" fill="#FFFFFF" stroke="{color}" stroke-width="1.6"/>')
        mono(x0 + 7, y + 5, net, 13, "start", color, 600)
    elif side == "right":
        x1 = x + w
        out.append(f'<path d="M{x} {y} L{x+8} {y-11} L{x1} {y-11} L{x1} {y+11} L{x+8} {y+11} Z" fill="#FFFFFF" stroke="{color}" stroke-width="1.6"/>')
        mono(x + 13, y + 5, net, 13, "start", color, 600)
    elif side == "up":
        out.append(f'<rect x="{x - w/2}" y="{y-24}" width="{w}" height="22" rx="4" fill="#FFFFFF" stroke="{color}" stroke-width="1.6"/>')
        mono(x, y - 8, net, 13, "middle", color, 600)
        line(x, y - 2, x, y, 2, color)
    else:  # down
        out.append(f'<rect x="{x - w/2}" y="{y+2}" width="{w}" height="22" rx="4" fill="#FFFFFF" stroke="{color}" stroke-width="1.6"/>')
        mono(x, y + 18, net, 13, "middle", color, 600)


def ic(ref, x, y, w, stub=40):
    p = PARTS[ref]
    L, R = p.get("left", []), p.get("right", [])
    n = max(len(L), len(R), 1)
    h = n * PITCH + 20
    out.append(f'<g class="part" data-ref="{ref}">')
    out.append(f'<rect class="body" x="{x}" y="{y}" width="{w}" height="{h}" rx="4" fill="#FFFFFF" stroke="{INK}" stroke-width="2"/>')
    t(x + w / 2, y - 26, ref, 15, "middle", INK, 700)
    mono(x + w / 2, y - 9, p["value"], 12, "middle", MUTED)
    for i, (num, name, net) in enumerate(L):
        py = y + 25 + i * PITCH
        line(x - stub, py, x, py)
        mono(x - 4, py - 5, num, 11, "end", MUTED)
        mono(x + 7, py + 5, name, 12, "start", INK)
        netlabel(x - stub, py, net, "left")
    for i, (num, name, net) in enumerate(R):
        py = y + 25 + i * PITCH
        line(x + w, py, x + w + stub, py)
        mono(x + w + 4, py - 5, num, 11, "start", MUTED)
        mono(x + w - 7, py + 5, name, 12, "end", INK)
        netlabel(x + w + stub, py, net, "right")
    out.append('</g>')
    return h


def two(ref, x, y):
    """竖放两脚器件：上端 pins[0]，下端 pins[1]；接点 y 和 y+100。"""
    p = PARTS[ref]
    a, b = p["pins"]
    k = p["kind"]
    out.append(f'<g class="part" data-ref="{ref}">')
    out.append(f'<rect class="hit" x="{x-30}" y="{y-26}" width="{110 if k == "led" else 96}" height="152" fill="none"/>')
    line(x, y, x, y + 22)
    line(x, y + 78, x, y + 100)
    if k == "r":
        out.append(f'<rect x="{x-8}" y="{y+22}" width="16" height="56" rx="2" fill="#FFFFFF" stroke="{INK}" stroke-width="2"/>')
    elif k == "c":
        line(x, y + 22, x, y + 45)
        line(x, y + 55, x, y + 78)
        line(x - 14, y + 45, x + 14, y + 45, 2.5)
        line(x - 14, y + 55, x + 14, y + 55, 2.5)
    elif k in ("d", "led"):
        line(x, y + 22, x, y + 38)
        out.append(f'<path d="M{x-12} {y+38} L{x+12} {y+38} L{x} {y+58} Z" fill="{INK}"/>')
        line(x - 12, y + 59, x + 12, y + 59, 2.5)
        line(x, y + 59, x, y + 78)
        if k == "led":
            for dy in (40, 50):
                out.append(f'<path d="M{x+15} {y+dy} L{x+25} {y+dy-8}" stroke="{INK}" stroke-width="1.6"/>'
                           f'<path d="M{x+25} {y+dy-8} L{x+19} {y+dy-7} L{x+24} {y+dy-3} Z" fill="{INK}"/>')
    elif k == "sw":
        line(x, y + 22, x, y + 34)
        line(x, y + 66, x, y + 78)
        out.append(f'<circle cx="{x}" cy="{y+36}" r="3" fill="{INK}"/><circle cx="{x}" cy="{y+64}" r="3" fill="{INK}"/>')
        line(x - 14, y + 40, x - 14, y + 60, 2.5)
        line(x - 14, y + 50, x - 26, y + 50, 2)
        line(x - 20, y + 36, x - 20, y + 64, 0)
    netlabel(x, y, a, "up")
    netlabel(x, y + 100, b, "down")
    dx = 32 if k == "led" else 18
    t(x + dx, y + 46, ref, 14, "start", INK, 700)
    shown = p["desc"].replace(" 按键", "") if k == "sw" else p["value"]
    mono(x + dx, y + 64, shown, 12, "start", MUTED)
    if k in ("d", "led"):
        mono(x - 16, y + 30, "A", 10, "end", MUTED)
        mono(x - 16, y + 76, "K", 10, "end", MUTED)
    out.append('</g>')


def frame(x, y, w, h, title, sub=""):
    out.append(f'<rect class="blk" data-blk="{title[0]}" x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="none" stroke="#B9C4C2" stroke-width="1.5" stroke-dasharray="8 6"/>')
    out.append(f'<rect x="{x+16}" y="{y-14}" width="{12 + 17*len(title) + (9*len(sub) if sub else 0)}" height="28" fill="{PAPER}"/>')
    t(x + 24, y + 6, title, 18, "start", INK, 700)
    if sub:
        t(x + 34 + 17 * len(title), y + 6, sub, 13, "start", MUTED)


def note(x, y, lines, size=14, color=MUTED, lh=22):
    for i, s in enumerate(lines):
        t(x, y + i * lh, s, size, "start", color)


# ======================= 版面 =======================
t(40, 52, "Boat QB12 主控板 · 原理图", 26, "start", INK, 700)
mono(2360, 52, "Rev A · 2026-10-13 · 56×38mm 2层板", 14, "end", MUTED)

# A. USB 与充电
frame(40, 110, 1140, 700, "A  USB 接口与充电", "USB-C 供电 / 烧录，TP4056 给电池充电")
ic("J1", 90, 180, 150, stub=100)
ic("U5", 190, 560, 110)
two("R1", 470, 560)
two("R2", 550, 560)
ic("U4", 740, 180, 130)
ic("J2", 1060, 300, 90)
two("R3", 700, 560)
two("C1", 780, 560)
two("C2", 860, 560)
two("R4", 950, 440)
two("LED1", 950, 590)
two("R5", 1060, 440)
two("LED2", 1060, 590)

# B. 电源路径与稳压
frame(1220, 110, 1140, 700, "B  电源路径与 3.3V 稳压", "插 USB 走 USB，拔掉自动切回电池")
ic("SW1", 1320, 180, 110)
ic("Q2", 1680, 180, 110)
ic("U3", 2070, 180, 120)
two("R14", 1290, 420)
ic("Q1", 1560, 420, 110)
two("R13", 1800, 420)
two("D1", 1890, 420)
two("C3", 2020, 420)
two("C4", 2110, 420)
note(1260, 640, [
    "· 开关：SW1 拨到 ON 把 Q2 栅极接地，Q2 导通；拨到 OFF 由 R14 上拉，Q2 关断。SW1 只走栅极的微小电流，大电流全部经过 Q2。",
    "· 插着 USB：VBUS 经 D1 给 VSYS 供电，Q1 栅极为高电平而截止，电池只通过 TP4056 充电，不会被 USB 直接灌电。",
    "· 拔掉 USB：R13 把 Q1 栅极拉低，Q1 导通，电池经 Q2、Q1 给 VSYS 供电。",
    "· Q2 与 Q1 背靠背：关机时电池与负载完全断开。",
], 14, lh=24)

# C. 主控
frame(40, 850, 1140, 800, "C  主控 ESP32-S3", "蓝牙连接手柄 · PWM 控制电机")
ic("U1", 430, 920, 200)
two("C5", 110, 1280)
two("C6", 190, 1280)
two("R7", 290, 1280)
two("C7", 370, 1280)
two("SW3", 470, 1280)
two("R8", 590, 1280)
two("SW2", 690, 1280)
two("R6", 810, 1280)
two("LED3", 810, 1430)
two("R10", 930, 1280)
two("R17", 110, 1450)
two("R18", 190, 1450)
two("R11", 330, 1450)
two("R12", 430, 1450)
two("C8", 530, 1450)
note(60, 1600, ["· R11/R12 测电池电压（一半），R17/R18 检测 USB 是否插入；IO1、IO9 用 ADC 12 dB 衰减档读取。其余 GPIO 未使用，保持悬空。",
                "· SW3 = RESET，SW2 = BOOT（按住 BOOT 再按 RESET 进入下载模式；一般插 USB 可直接烧录）。"], 14, lh=24)

# D. 电机驱动
frame(1220, 850, 1140, 800, "D  电机驱动 DRV8833", "左电机 = A 路，右电机 = B 路")
ic("U2", 1660, 920, 170)
ic("J3", 2150, 940, 90)
ic("J4", 2150, 1060, 90)
two("R9", 1300, 1300)
two("C9", 1390, 1300)
two("C10", 1470, 1300)
two("C11", 1550, 1300)
two("C12", 1650, 1300)
two("C13", 1750, 1300)
two("C14", 1840, 1300)
two("C15", 1920, 1300)
two("R15", 2030, 1300)
two("R16", 2140, 1300)
note(1260, 1470, [
    "· C12 跨接在 VCP 与 VM 之间（电荷泵）。",
    "· R15/R16 = 0.2Ω：每路电流超过约 1A 时芯片自动斩波限流，防止起步电流拉垮电源。",
    "· VSYS 共 4 × 22µF 储能；每个电机两端另焊一颗 0.1µF 瓷片电容（焊在电机上）。",
    "· 散热焊盘打过孔到底层地。",
], 14, lh=24)

svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">'
       f'<rect width="{W}" height="{H}" fill="{PAPER}"/>' + "".join(out) + "</svg>")
open(sys.argv[1], "w").write(svg)
print("written", sys.argv[1], len(svg))
