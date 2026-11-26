"""第一步：去掉铺铜，导出 DSN；地线不交给自动布线；补天线/模组禁布区；去掉非 ASCII 字符。
用法：python3.12 route_a.py SRC.kicad_pcb OUT.dsn"""
import sys, re, pcbnew

SRC, DSN = sys.argv[1], sys.argv[2]
OX, OY = 100.0, 100.0
ANT = (34.0, -1.0, 57.0, 7.4)     # 天线禁布区（板子本地坐标，两层都不许有铜）
USB = (22.3, 33.8, 30.7, 38.5)     # USB-C 金属壳底下：顶层不走线
MOD = (39.9, 13.0, 45.1, 18.2)     # 模组中间接地焊盘一圈：两层都不许走线（留给接地过孔）

b = pcbnew.LoadBoard(SRC)
for z in list(b.Zones()):
    b.Remove(z)
b.SynchronizeNetsAndNetClasses(True)
for n in ("VSYS", "ML+", "3V3", "GND"):
    print(n, "->", b.FindNet(n).GetNetClassName())

# 预先打好的接地扇出（短线 + 过孔）：从板子里拿掉，改成 DSN 里的禁布形状，让自动布线绕开
from shapely.geometry import LineString, Point
gnd_code = b.FindNet("GND").GetNetCode()
fan_keepouts = []
KCLR = 0.2
for t in list(b.GetTracks()):
    if t.GetNetCode() != gnd_code:
        continue
    if t.Type() == pcbnew.PCB_VIA_T:
        p = t.GetPosition()
        fan_keepouts.append(("signal", Point(pcbnew.ToMM(p.x), pcbnew.ToMM(p.y)).buffer(pcbnew.ToMM(t.GetWidth()) / 2 + KCLR, 8)))
    else:
        s, e = t.GetStart(), t.GetEnd()
        g = LineString([(pcbnew.ToMM(s.x), pcbnew.ToMM(s.y)), (pcbnew.ToMM(e.x), pcbnew.ToMM(e.y))]).buffer(
            pcbnew.ToMM(t.GetWidth()) / 2 + KCLR, 4)
        fan_keepouts.append((t.GetLayerName(), g))
    b.Remove(t)
print("fanout keepouts:", len(fan_keepouts))
assert pcbnew.ExportSpecctraDSN(b, DSN), "DSN export failed"

txt = open(DSN, encoding="utf-8", errors="replace").read()
txt = txt.replace("Ω", "R").replace("µ", "u")
txt = txt.encode("ascii", "replace").decode("ascii")

# 1) 去掉 GND 网络（network 段里的 (net GND (pins ...)) 整块）
i = txt.index("    (net GND\n")
depth = 0
j = i
while True:
    c = txt[j]
    if c == "(":
        depth += 1
    elif c == ")":
        depth -= 1
        if depth == 0:
            break
    j += 1
txt = txt[:i] + txt[j + 1:].lstrip("\n")
# 2) 从 class 列表里去掉 GND
txt = re.sub(r"(\(class Power[^\n]*?) GND( |\n)", r"\1\2", txt)
assert " GND " not in txt.split("(network")[1].split("(wiring")[0], "GND still in network"

# 3) 禁布区
def rect(x0, y0, x1, y1):
    return f"{int((OX+x0)*1000)} {-int((OY+y1)*1000)} {int((OX+x1)*1000)} {-int((OY+y0)*1000)}"

k = (f'    (keepout "antenna" (rect signal {rect(*ANT)}))\n'
     f'    (via_keepout "antenna_v" (rect signal {rect(*ANT)}))\n'
     f'    (keepout "module" (rect signal {rect(*MOD)}))\n'
     f'    (keepout "usbbody" (rect F.Cu {rect(*USB)}))\n')
for n, (lay, g) in enumerate(fan_keepouts):
    pts = " ".join(f"{int(x*1000)} {-int(y*1000)}" for x, y in list(g.exterior.coords))
    k += f'    (keepout "gfan{n}" (polygon {lay} 0 {pts}))\n'
i = txt.index("    (via ")
txt = txt[:i] + k + txt[i:]
open(DSN, "w").write(txt)
print("DSN ready:", DSN, len(txt))
