"""去掉铺铜 -> 导出 DSN（补天线禁布区）-> Freerouting -> 导回 SES -> 加禁布区和两层地 -> 填充 -> 保存。"""
import sys, subprocess, pcbnew

SRC, DST, JAR = sys.argv[1], sys.argv[2], sys.argv[3]
passes = sys.argv[4] if len(sys.argv) > 4 else "60"
OX, OY, BW, BH = 100.0, 100.0, 50.0, 35.0
ANT = (30.0, -1.0, 51.0, 7.4)   # 天线禁布区（板子本地坐标）

b = pcbnew.LoadBoard(SRC)
for z in list(b.Zones()):
    b.Remove(z)
b.SynchronizeNetsAndNetClasses(True)
print("VSYS class:", b.FindNet("VSYS").GetNetClassName(), " 3V3 class:", b.FindNet("3V3").GetNetClassName())
MOD = (31.7, 7.6, 48.3, 24.9)   # 模组底下（焊盘圈以内）顶层不许走线

dsn = DST.replace(".kicad_pcb", ".dsn")
ses = DST.replace(".kicad_pcb", ".ses")
assert pcbnew.ExportSpecctraDSN(b, dsn), "DSN export failed"
txt = open(dsn).read()
x0, y0, x1, y1 = ANT
k = (f'    (keepout "antenna" (rect signal {int((OX+x0)*1000)} {-int((OY+y1)*1000)} {int((OX+x1)*1000)} {-int((OY+y0)*1000)}))\n'
     f'    (via_keepout "antenna_v" (rect signal {int((OX+x0)*1000)} {-int((OY+y1)*1000)} {int((OX+x1)*1000)} {-int((OY+y0)*1000)}))\n')
mx0, my0, mx1, my1 = MOD
k += (f'    (keepout "module" (rect F.Cu {int((OX+mx0)*1000)} {-int((OY+my1)*1000)} {int((OX+mx1)*1000)} {-int((OY+my0)*1000)}))\n')
i = txt.index("    (via ")
txt = txt[:i] + k + txt[i:]
open(dsn, "w").write(txt)

cmd = ["java", "-Djava.awt.headless=true", "-jar", JAR, "--gui.enabled=false",
       "-de", dsn, "-do", ses, "-mp", passes, "-mt", "1"]
r = subprocess.run(cmd, capture_output=True, text=True, timeout=1700)
log = (r.stdout + r.stderr).strip().splitlines()
print("\n".join([l for l in log if "unrouted" in l.lower() or "completed" in l.lower() or "error" in l.lower()][-8:]))
assert pcbnew.ImportSpecctraSES(b, ses), "SES import failed"


def poly(points):
    sp = pcbnew.SHAPE_POLY_SET(); sp.NewOutline()
    for (x, y) in points:
        sp.Append(pcbnew.FromMM(OX + x), pcbnew.FromMM(OY + y))
    return sp


ka = pcbnew.ZONE(b)
ka.SetIsRuleArea(True)
(getattr(ka, "SetDoNotAllowZoneFills", None) or ka.SetDoNotAllowCopperPour)(True); ka.SetDoNotAllowTracks(True); ka.SetDoNotAllowVias(True)
ka.SetDoNotAllowPads(False); ka.SetDoNotAllowFootprints(False)
ls = pcbnew.LSET(); ls.AddLayer(pcbnew.F_Cu); ls.AddLayer(pcbnew.B_Cu)
ka.SetLayerSet(ls)
ka.SetOutline(poly([(x0, y0), (x1, y0), (x1, y1), (x0, y1)]))
b.Add(ka)
km = pcbnew.ZONE(b)
km.SetIsRuleArea(True)
(getattr(km, "SetDoNotAllowZoneFills", None) or km.SetDoNotAllowCopperPour)(False); km.SetDoNotAllowTracks(True); km.SetDoNotAllowVias(True)
km.SetDoNotAllowPads(False); km.SetDoNotAllowFootprints(False)
km.SetLayer(pcbnew.F_Cu)
km.SetOutline(poly([(mx0, my0), (mx1, my0), (mx1, my1), (mx0, my1)]))
b.Add(km)

gnd = b.FindNet("GND")
for layer in (pcbnew.F_Cu, pcbnew.B_Cu):
    z = pcbnew.ZONE(b)
    z.SetLayer(layer)
    z.SetNet(gnd)
    z.SetMinThickness(pcbnew.FromMM(0.25))
    z.SetLocalClearance(pcbnew.FromMM(0.3))
    z.SetThermalReliefGap(pcbnew.FromMM(0.4))
    z.SetThermalReliefSpokeWidth(pcbnew.FromMM(0.5))
    z.SetPadConnection(pcbnew.ZONE_CONNECTION_FULL)
    z.SetIslandRemovalMode(pcbnew.ISLAND_REMOVAL_MODE_ALWAYS)
    z.SetOutline(poly([(0.3, 0.3), (BW - 0.3, 0.3), (BW - 0.3, BH - 0.3), (0.3, BH - 0.3)]))
    b.Add(z)
pcbnew.ZONE_FILLER(b).Fill(b.Zones())
pcbnew.SaveBoard(DST, b)
print("saved", DST)
