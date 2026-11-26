# 旧一体船体版，11-11 起不再使用
"""从 outputs/QB12 的 STL 切出试件，用来在代打印前先验证间隙、孔径、压盖弹性。
用法：python make_coupon.py [输出目录]   默认 ../../outputs/QB12
试件 = 右侧浮体的一段（含卡扣托座、舱口导轨和矮墙、尾管内端口）+ 1 块盖板
     + 电子舱底板一块（PCB 托盘卡扣 + 电池仓 + 舱口围壁船头那段）
"""
import sys, os, numpy as np, trimesh, manifold3d as m3d

d = os.path.join(os.path.dirname(__file__), "../../outputs/QB12")
out = sys.argv[1] if len(sys.argv) > 1 else d
os.makedirs(out, exist_ok=True)

def man(path):
    t = trimesh.load(path)
    return m3d.Manifold(m3d.Mesh(vert_properties=np.array(t.vertices, np.float32), tri_verts=np.array(t.faces, np.uint32)))

def to_tm(mf):
    mm = mf.to_mesh()
    t = trimesh.Trimesh(np.array(mm.vert_properties)[:, :3], np.array(mm.tri_verts))
    t.update_faces(t.nondegenerate_faces()); t.remove_unreferenced_vertices()
    return t

body = man(f"{d}/QB12_body.stl")
box = lambda x0, x1, y0, y1, z0, z1: m3d.Manifold.cube((x1 - x0, y1 - y0, z1 - z0)).translate((x0, y0, z0))
# 右侧（y>0）浮体，x 96..160：尾管内端口、卡扣托座、舱口导轨（11-11 改版）；y 从桥甲板内缘 38 到外壁
seg = body ^ box(96, 160, 38, 75, -6, 56)
seg_t = to_tm(seg)
# 电子舱底板 x 54..190、y ±38：托盘 x 60..116、电池仓 x 122..174；z 29 以下是浮体内壁，切掉
tray_t = to_tm(body ^ box(54, 190, -38, 38, 29, 46))
cover = trimesh.load(f"{d}/QB12_hatch_cover.stl")
for name, t in (("QB12_coupon_float_segment.stl", seg_t), ("QB12_coupon_cover.stl", cover), ("QB12_coupon_tray_battery.stl", tray_t)):
    t.export(os.path.join(out, name))
    parts = len(t.split(only_watertight=False))
    print(f"{name}: 体积 {t.volume/1000:.2f} cm³，尺寸 {np.round(t.extents,1).tolist()} mm，水密 {t.is_watertight}，{parts} 块")
