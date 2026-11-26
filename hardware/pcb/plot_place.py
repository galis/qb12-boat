import sys, pcbnew
from PIL import Image, ImageDraw, ImageFont
b = pcbnew.LoadBoard(sys.argv[1]); out = sys.argv[2]
K = 24; OX, OY = 100.0, 100.0; M = 30
W, H = int(56 * K + 2 * M), int(38 * K + 2 * M)
im = Image.new("RGB", (W, H), (16, 26, 28)); d = ImageDraw.Draw(im)
import glob, os
# DejaVu Sans：Linux 系统字体；Mac 上用仓库 .venv 里 matplotlib 自带的那份
_here = os.path.dirname(os.path.abspath(__file__))
_dirs = ["/usr/share/fonts/truetype/dejavu"] + glob.glob(os.path.join(_here, "../../.venv/lib/python*/site-packages/matplotlib/mpl-data/fonts/ttf"))
_dir = next((d for d in _dirs if os.path.exists(os.path.join(d, "DejaVuSans-Bold.ttf"))), None)
try:
    f = ImageFont.truetype(os.path.join(_dir, "DejaVuSans-Bold.ttf"), 13)
    fs = ImageFont.truetype(os.path.join(_dir, "DejaVuSans.ttf"), 9)
except Exception:
    f = fs = ImageFont.load_default()
def T(x, y): return (M + (x - OX) * K, M + (y - OY) * K)
d.rectangle([T(OX, OY), T(OX + 56, OY + 38)], outline=(79, 209, 217), width=2)
d.rectangle([T(OX + 34, OY + 0), T(OX + 56, OY + 7.4)], outline=(255, 90, 90), width=1)
cols = {"GND": (90, 100, 100)}
for t in b.Tracks():
    if t.GetClass() == "PCB_TRACK":
        s, e = t.GetStart(), t.GetEnd()
        c = (255, 140, 60) if t.GetLayer() == pcbnew.F_Cu else (80, 160, 255)
        d.line([T(pcbnew.ToMM(s.x), pcbnew.ToMM(s.y)), T(pcbnew.ToMM(e.x), pcbnew.ToMM(e.y))], fill=c, width=max(1, int(pcbnew.ToMM(t.GetWidth()) * K)))
    else:
        p = t.GetPosition(); x, y = T(pcbnew.ToMM(p.x), pcbnew.ToMM(p.y)); r = pcbnew.ToMM(t.GetWidth()) * K / 2
        d.ellipse([x - r, y - r, x + r, y + r], fill=(220, 220, 220))
for fp in b.GetFootprints():
    bb = fp.GetBoundingBox(False, False)
    x0, y0 = pcbnew.ToMM(bb.GetX()), pcbnew.ToMM(bb.GetY())
    d.rectangle([T(x0, y0), T(x0 + pcbnew.ToMM(bb.GetWidth()), y0 + pcbnew.ToMM(bb.GetHeight()))], outline=(150, 170, 170), width=1)
    for pad in fp.Pads():
        pb = pad.GetBoundingBox()
        px, py = pcbnew.ToMM(pb.GetX()), pcbnew.ToMM(pb.GetY())
        net = pad.GetNetname()
        c = cols.get(net, (200, 170, 60) if net else (70, 70, 70))
        d.rectangle([T(px, py), T(px + pcbnew.ToMM(pb.GetWidth()), py + pcbnew.ToMM(pb.GetHeight()))], fill=c)
    p = fp.GetPosition(); cx, cy = T(pcbnew.ToMM(p.x), pcbnew.ToMM(p.y))
    d.text((cx, cy), fp.GetReference(), fill=(255, 255, 255), font=f, anchor="mm", stroke_width=2, stroke_fill=(0, 0, 0))
for i in range(0, 57, 5):
    d.text(T(OX + i, OY - 0.9), str(i), fill=(150, 150, 150), font=fs, anchor="mm")
for i in range(0, 39, 5):
    d.text(T(OX - 0.8, OY + i), str(i), fill=(150, 150, 150), font=fs, anchor="mm")
im.save(out)
