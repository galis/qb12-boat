"""把打印件 + 展示件（彩条、甲板色、轴、桨）组装成 USDZ（Mac/iPhone 预览）和 GLB（渲染用）。"""
import sys
import numpy as np
import trimesh
import manifold3d as m3d
from pxr import Usd, UsdGeom, UsdShade, Sdf, Gf, Vt, UsdUtils

OUT = sys.argv[1]
hull = trimesh.load(f"{OUT}/QB12_hull.stl")
deck = trimesh.load(f"{OUT}/QB12_deck.stl")     # 11-11 分件：甲板（含电机鼓包），抽拉盖板取消
canopy = trimesh.load(f"{OUT}/QB12_canopy.stl")
knobs = trimesh.load(f"{OUT}/QB12_knobs_locked.stl")   # 船尾旋钮扣（锁住位置）
gasket = trimesh.load(f"{OUT}/QB12_gasket_placed.stl")  # 泡棉密封条（展示用）
shafts = np.load(f"{OUT}/shaft_info.npy")  # [2, 2, 3]


def prism(poly_xy, z0, z1):
    poly = np.asarray(poly_xy, float)
    man = m3d.Manifold.extrude(m3d.CrossSection([poly]), z1 - z0).translate((0, 0, z0))
    mm = man.to_mesh()
    return trimesh.Trimesh(np.asarray(mm.vert_properties)[:, :3], np.asarray(mm.tri_verts))


def cyl(p0, p1, r, seg=40):
    p0, p1 = np.asarray(p0, float), np.asarray(p1, float)
    v = p1 - p0
    h = np.linalg.norm(v)
    c = trimesh.creation.cylinder(radius=r, height=h, sections=seg)
    c.apply_transform(trimesh.geometry.align_vectors([0, 0, 1], v / h))
    c.apply_translation((p0 + p1) / 2)
    return c


# 舷侧彩条
stripes = []
for s in (1, -1):
    for (z0, z1, x1) in ((33.0, 37.0, 104.0), (29.0, 30.6, 90.0)):
        zm = (z0 + z1) / 2
        yo = 55.0 + 27.0 * (0.92 + 0.08 * (zm - 12.0) / 32.0) + 0.15   # 外飘舷侧表面
        b = trimesh.creation.box(extents=(x1 - 12, 0.5, z1 - z0))
        b.apply_translation(((12 + x1) / 2, s * yo, zm))
        stripes.append(b)
stripe_mesh = trimesh.util.concatenate(stripes)

# 轴、双叶桨（左右旋向相反）；11-11 起不用铜轴套
metal, props = [], []
for k, s in enumerate((1, -1)):
    a, b = shafts[k]
    d = (b - a) / np.linalg.norm(b - a)
    metal.append(cyl(a, b + d * 10, 1.0))        # 不锈钢轴
    c = b + d * 6.0
    hub = cyl(c - d * 4, c + d * 4, 3.2)
    blades = []
    for side in (1, -1):
        bl = trimesh.creation.box(extents=(1.4, 8.0, 12.0))
        bl.apply_translation((0, 0, side * 9.0))
        bl.apply_transform(trimesh.transformations.rotation_matrix(np.radians(28 * s * side), [0, 0, 1], [0, 0, side * 9.0]))
        blades.append(bl)
    blade = trimesh.util.concatenate(blades)
    # 局部坐标：轴向 = x，转到轴的方向
    blade.apply_transform(trimesh.geometry.align_vectors([1, 0, 0], d))
    blade.apply_translation(c)
    props.append(trimesh.util.concatenate([hub, blade]))
metal_mesh = trimesh.util.concatenate(metal)
prop_mesh = trimesh.util.concatenate(props)

# 舱罩前挡风玻璃面
cn = canopy.face_normals
cc = canopy.triangles_center
wind = np.where((cn[:, 0] > 0.45) & (cc[:, 2] > 46))[0]

parts = {
    "Hull": (hull, (0.91, 0.93, 0.92), 0.45, 0.0),
    "Deck": (deck, (0.106, 0.176, 0.196), 0.6, 0.0),
    "Knobs": (knobs, (0.85, 0.35, 0.25), 0.5, 0.0),
    "Gasket": (gasket, (0.94, 0.54, 0.14), 0.9, 0.0),
    "Canopy": (canopy, (0.133, 0.22, 0.243), 0.3, 0.0),
    "Stripes": (stripe_mesh, (1.0, 0.478, 0.239), 0.4, 0.0),
    "Shafts": (metal_mesh, (0.79, 0.65, 0.35), 0.3, 1.0),
    "Props": (prop_mesh, (1.0, 0.478, 0.239), 0.35, 0.2),
}

# ---------- 坐标：mm, z 向上  ->  m, y 向上；船头朝 +X；最低点落地 ----------
all_v = np.vstack([p[0].vertices for p in parts.values()])
zmin = all_v[:, 2].min()
xc = 120.0


def conv(v):
    v = np.asarray(v, float)
    return np.column_stack([(v[:, 0] - xc) * 0.001, (v[:, 2] - zmin) * 0.001, -v[:, 1] * 0.001])


def conv_n(n):
    n = np.asarray(n, float)
    return np.column_stack([n[:, 0], n[:, 2], -n[:, 1]])


usdc = f"{OUT}/QB12.usdc"
stage = Usd.Stage.CreateNew(usdc)
UsdGeom.SetStageUpAxis(stage, UsdGeom.Tokens.y)
UsdGeom.SetStageMetersPerUnit(stage, 1.0)
root = UsdGeom.Xform.Define(stage, "/QB12")
stage.SetDefaultPrim(root.GetPrim())
Usd.ModelAPI(root.GetPrim()).SetKind("component")


def make_mat(name, rgb, rough, metal, opacity=1.0):
    mat = UsdShade.Material.Define(stage, f"/QB12/Looks/{name}")
    sh = UsdShade.Shader.Define(stage, f"/QB12/Looks/{name}/PBR")
    sh.CreateIdAttr("UsdPreviewSurface")
    sh.CreateInput("diffuseColor", Sdf.ValueTypeNames.Color3f).Set(Gf.Vec3f(*rgb))
    sh.CreateInput("roughness", Sdf.ValueTypeNames.Float).Set(rough)
    sh.CreateInput("metallic", Sdf.ValueTypeNames.Float).Set(metal)
    if opacity < 1.0:
        sh.CreateInput("opacity", Sdf.ValueTypeNames.Float).Set(opacity)
    mat.CreateSurfaceOutput().ConnectToSource(sh.ConnectableAPI(), "surface")
    return mat


glb_scene = trimesh.Scene()
for name, (mesh, rgb, rough, metal) in parts.items():
    sm = trimesh.graph.smooth_shade(mesh, angle=np.radians(28))
    pts = conv(sm.vertices)
    nrm = conv_n(sm.vertex_normals)
    um = UsdGeom.Mesh.Define(stage, f"/QB12/{name}")
    um.CreatePointsAttr(Vt.Vec3fArray.FromNumpy(pts.astype(np.float32)))
    um.CreateFaceVertexCountsAttr(Vt.IntArray([3] * len(sm.faces)))
    um.CreateFaceVertexIndicesAttr(Vt.IntArray.FromNumpy(sm.faces.reshape(-1).astype(np.int32)))
    um.CreateNormalsAttr(Vt.Vec3fArray.FromNumpy(nrm.astype(np.float32)))
    um.SetNormalsInterpolation(UsdGeom.Tokens.vertex)
    um.CreateSubdivisionSchemeAttr(UsdGeom.Tokens.none)
    um.CreateDoubleSidedAttr(False)
    um.CreateExtentAttr(Vt.Vec3fArray([Gf.Vec3f(*pts.min(0)), Gf.Vec3f(*pts.max(0))]))
    mat = make_mat(name + "Mat", rgb, rough, metal)
    if name == "Canopy":
        # smooth_shade 会复制顶点但保持面的顺序，挡风玻璃面索引仍然有效
        glass = make_mat("GlassMat", (0.31, 0.82, 0.85), 0.08, 0.0)
        wind_sm = np.where((sm.face_normals[:, 0] > 0.45) & (sm.triangles_center[:, 2] > 46))[0]
        rest = np.setdiff1d(np.arange(len(sm.faces)), wind_sm)
        s1 = UsdGeom.Subset.CreateGeomSubset(um, "shell", UsdGeom.Tokens.face, Vt.IntArray.FromNumpy(rest.astype(np.int32)), "materialBind", UsdGeom.Tokens.partition)
        s2 = UsdGeom.Subset.CreateGeomSubset(um, "windshield", UsdGeom.Tokens.face, Vt.IntArray.FromNumpy(wind_sm.astype(np.int32)), "materialBind", UsdGeom.Tokens.partition)
        UsdShade.MaterialBindingAPI.Apply(s1.GetPrim()).Bind(mat)
        UsdShade.MaterialBindingAPI.Apply(s2.GetPrim()).Bind(glass)
        UsdShade.MaterialBindingAPI.Apply(um.GetPrim())
    else:
        UsdShade.MaterialBindingAPI.Apply(um.GetPrim()).Bind(mat)

    # GLB（渲染用，保持 mm、z 向上）
    col = np.array([*(np.array(rgb) * 255), 255], dtype=np.uint8)
    pieces = [(name, sm)]
    if name == "Canopy":
        pieces = [("Canopy", sm.submesh([rest], append=True)), ("Glass", sm.submesh([wind_sm], append=True))]
    for pname, g in pieces:
        g = g.copy()
        g.visual = trimesh.visual.ColorVisuals(g, face_colors=np.tile(col, (len(g.faces), 1)))
        g.vertex_normals  # 缓存法线，导出时带上
        glb_scene.add_geometry(g, geom_name=pname)

stage.GetRootLayer().Save()
usdz = f"{OUT}/QB12.usdz"
ok = UsdUtils.CreateNewUsdzPackage(Sdf.AssetPath(usdc), usdz)
print("usdz packaged:", ok)

# 手动检查：重新打开 usdz，确认能读、坐标轴、单位、材质绑定
st = Usd.Stage.Open(usdz)
print("defaultPrim:", st.GetDefaultPrim().GetPath(), "upAxis:", UsdGeom.GetStageUpAxis(st), "mpu:", UsdGeom.GetStageMetersPerUnit(st))
for p in st.Traverse():
    if p.IsA(UsdGeom.Mesh):
        m = UsdGeom.Mesh(p)
        bound = UsdShade.MaterialBindingAPI(p).ComputeBoundMaterial()[0]
        print(" ", p.GetName(), "faces", len(m.GetFaceVertexCountsAttr().Get()), "material", bound.GetPath().name if bound else "(subsets)")
import zipfile
with zipfile.ZipFile(usdz) as z:
    print("package:", [(i.filename, i.compress_type, i.header_offset) for i in z.infolist()])
glb_scene.export(f"{OUT}/QB12_render.glb", include_normals=True)
print("bounds (m):", conv(all_v).min(0).round(3), conv(all_v).max(0).round(3))
