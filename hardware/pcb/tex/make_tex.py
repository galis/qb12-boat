import cairosvg, io, sys
from PIL import Image, ImageChops, ImageFilter
import numpy as np
D = sys.argv[1]
PX = 40            # 每毫米像素
X0, Y0, BW, BH = 100.0, 100.0, 56.0, 38.0
def layer(name):
    png = cairosvg.svg2png(url=f"{D}/{name}.svg", scale=1.0, output_width=None)
    # 按 mm 缩放：先读 viewBox 尺寸
    import re
    s = open(f"{D}/{name}.svg").read()
    vb = [float(v) for v in re.search(r'viewBox="([^"]*)"', s).group(1).split()]
    W = int(vb[2] * PX); H = int(vb[3] * PX)
    png = cairosvg.svg2png(url=f"{D}/{name}.svg", output_width=W, output_height=H, background_color="white")
    im = Image.open(io.BytesIO(png)).convert("L")
    box = (int((X0 - vb[0]) * PX), int((Y0 - vb[1]) * PX), int((X0 - vb[0] + BW) * PX), int((Y0 - vb[1] + BH) * PX))
    a = np.array(im.crop(box)) < 128      # True = 有图形
    return a
cu, mask_open, silk, edge = (layer(n) for n in ("F.Cu", "F.Mask", "F.Silkscreen", "Edge.Cuts"))
import os
if os.path.exists(f"{D}/F.Cu_nodrill.svg"):
    # KiCad 10：铜层用"小孔"画法时，非金属化孔中间会多一个小点；和不画孔的铜层取交集，非金属化孔处就没有铜了
    cu = cu & layer("F.Cu_nodrill")
H, W = cu.shape
img = np.zeros((H, W, 3), np.float32)
sub = np.array([20, 23, 25]); cum = np.array([40, 46, 49]); pad = np.array([214, 214, 206]); silkc = np.array([245, 245, 240])
img[:] = sub
img[cu] = cum
img[mask_open & cu] = pad
img[mask_open & ~cu] = np.array([150, 130, 70])      # 露出的基材（几乎没有）
img[silk & ~mask_open] = silkc
# 板外透明 + 圆角
out = Image.fromarray(img.astype(np.uint8)).convert("RGBA")
alpha = Image.new("L", (W, H), 0)
from PIL import ImageDraw
ImageDraw.Draw(alpha).rounded_rectangle([0, 0, W - 1, H - 1], radius=int(2 * PX), fill=255)
out.putalpha(alpha)
out.save(f"{D}/top_tex.png")
print("tex", out.size)
