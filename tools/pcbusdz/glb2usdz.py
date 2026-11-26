"""KiCad GLB -> merged-by-material GLB (preview) + USDZ (iPhone/iPad/Mac Quick Look, real size, Y up, meters)."""
import sys, numpy as np, trimesh, collections
from pxr import Usd, UsdGeom, UsdShade, Sdf, Gf, Vt, UsdUtils
src, out = sys.argv[1], sys.argv[2]          # out = folder
BOARD = sys.argv[3] if len(sys.argv) > 3 else None   # board.json -> split copper into exposed pads vs copper under mask
import os
SCHEME = os.environ.get('MASK', 'black')
MASK, CU_UNDER = {'black': ((18, 20, 23, 255), (40, 45, 51, 255)), 'green': ((22, 88, 50, 255), (52, 124, 66, 255))}[SCHEME]
PAD = (214, 178, 92, 255); SOLDER = (205, 208, 210, 255)
sc = trimesh.load(src, force='scene')
pads = []
if BOARD:
    import json
    bj = json.load(open(BOARD))
    for f in bj['footprints']:
        for p in f['pads']:
            if p.get('t') == 'npth': continue
            if p.get('mask') is False: continue
            w, h = p['w'], p['h']
            if p.get('poly'):
                pp = np.array(p['poly'], dtype=object)
                flat = np.array([v for v in np.array(p['poly']).reshape(-1)], float).reshape(-1, 2)
                w, h = np.ptp(flat[:, 0]), np.ptp(flat[:, 1])
            pads.append((p['x'], p['y'], w / 2 + 0.03, h / 2 + 0.03, np.radians(p.get('a', 0)), p.get('cu', 'F')))
    # exposed thermal vias inside pad openings are covered by the pad test already
def in_pad(px, py, top):
    hit = np.zeros(len(px), bool)
    for (x, y, hw, hh, a, cu) in pads:
        if top and 'F' not in cu: continue
        if not top and 'B' not in cu: continue
        dx, dy = px - x, py - y
        ca, sa = np.cos(a), np.sin(a)
        u = dx * ca - dy * sa; v = dx * sa + dy * ca      # KiCad angle is CCW with y down
        hit |= (np.abs(u) <= hw) & (np.abs(v) <= hh)
    return hit
groups = collections.defaultdict(list)
info = {}
for node in sc.graph.nodes_geometry:
    T, gname = sc.graph[node]
    g = sc.geometry[gname]
    m = getattr(g.visual, 'material', None)
    col = np.array(getattr(m, 'baseColorFactor', None) if m is not None and getattr(m, 'baseColorFactor', None) is not None else [200, 200, 200, 255], float)
    if col.max() <= 1.0: col = col * 255
    met = float(getattr(m, 'metallicFactor', 0) or 0); rough = getattr(m, 'roughnessFactor', None)
    rough = 0.5 if rough is None else float(rough)
    key = (tuple(int(round(c)) for c in col[:4]), round(met, 2), round(rough, 2))
    gg = g.copy(); gg.apply_transform(T)
    if BOARD and key[0] == (20, 51, 36, 255):
        key = (MASK, 0.0, 0.4)
    if BOARD and key[0] == (173, 161, 134, 255):       # KiCad paste layer -> solder after reflow
        key = (SOLDER, 0.9, 0.25)
    if BOARD and key[0] == (128, 128, 128, 255):       # KiCad 10 --include-pads 把焊盘单独导成灰色，当铜处理（KiCad 8 焊盘本来就在铜色网格里）
        key = ((178, 156, 0, 255),) + key[1:]
    if BOARD and key[0] == (178, 156, 0, 255):
        cen = gg.triangles_center
        bx = cen[:, 0] * 1000 - 100; by = cen[:, 2] * 1000 - 100; top = cen[:, 1] * 1000 > 0.8
        hit = np.zeros(len(cen), bool)
        hit[top] = in_pad(bx[top], by[top], True); hit[~top] = in_pad(bx[~top], by[~top], False)
        if hit.any():
            groups[(PAD, 1.0, 0.3)].append(gg.submesh([np.where(hit)[0]], append=True))
        if (~hit).any():
            groups[(CU_UNDER, 0.0, 0.4)].append(gg.submesh([np.where(~hit)[0]], append=True))
        continue
    groups[key].append(gg)
# centre: x/z on the board centre, bottom of the board at y=0
allv = np.vstack([gg.vertices for L in groups.values() for gg in L])
lo, hi = allv.min(0), allv.max(0)
c = np.array([(lo[0] + hi[0]) / 2, lo[1], (lo[2] + hi[2]) / 2])
print('extent mm', ((hi - lo) * 1000).round(2), 'groups', len(groups))
stage = Usd.Stage.CreateNew(f'{out}/QB12_PCB.usdc')
UsdGeom.SetStageUpAxis(stage, UsdGeom.Tokens.y); UsdGeom.SetStageMetersPerUnit(stage, 1.0)
root = UsdGeom.Xform.Define(stage, '/QB12_PCB'); stage.SetDefaultPrim(root.GetPrim())
Usd.ModelAPI(root.GetPrim()).SetKind('component')
prev = trimesh.Scene()
tot = 0
for i, (key, L) in enumerate(sorted(groups.items(), key=lambda kv: -sum(len(g.faces) for g in kv[1]))):
    (r, g_, b, a), met, rough = key
    mx, mn = max(r, g_, b), min(r, g_, b)
    if r > 140 and b < 60 and r - b > 100:            # gold / copper (pads, ENIG, pins)
        met, rough = 1.0, 0.32
    elif mx - mn < 14 and 120 < mx < 222:              # greys: tin-plated pins, USB shell, shields (not white plastic / silk)
        met, rough = 0.9, 0.3
    elif (r, g_, b) in ((20, 51, 36), MASK[:3], CU_UNDER[:3]):  # solder mask (over bare board / over copper)
        met, rough = 0.0, 0.38
    elif (r, g_, b) == PAD[:3]:
        met, rough = 1.0, 0.3
    elif (r, g_, b) == SOLDER[:3]:
        met, rough = 0.9, 0.25
    else:
        met, rough = 0.0, 0.55
    mesh = trimesh.util.concatenate(L)
    mesh.vertices = mesh.vertices - c
    mesh.merge_vertices(merge_tex=True, merge_norm=True)
    mesh = trimesh.graph.smooth_shade(mesh, angle=np.radians(25))   # split normals at sharp edges (flat CAD faces stay flat)
    tot += len(mesh.faces)
    name = f'M{i:02d}_{r:02x}{g_:02x}{b:02x}'
    um = UsdGeom.Mesh.Define(stage, f'/QB12_PCB/{name}')
    pts = mesh.vertices.astype(np.float32)
    um.CreatePointsAttr(Vt.Vec3fArray.FromNumpy(pts))
    um.CreateFaceVertexCountsAttr(Vt.IntArray([3] * len(mesh.faces)))
    um.CreateFaceVertexIndicesAttr(Vt.IntArray.FromNumpy(mesh.faces.reshape(-1).astype(np.int32)))
    um.CreateNormalsAttr(Vt.Vec3fArray.FromNumpy(mesh.vertex_normals.astype(np.float32)))
    um.SetNormalsInterpolation(UsdGeom.Tokens.vertex)
    um.CreateSubdivisionSchemeAttr(UsdGeom.Tokens.none)
    um.CreateDoubleSidedAttr(True)
    um.CreateExtentAttr(Vt.Vec3fArray([Gf.Vec3f(*map(float, pts.min(0))), Gf.Vec3f(*map(float, pts.max(0)))]))
    mat = UsdShade.Material.Define(stage, f'/QB12_PCB/Looks/{name}')
    sh = UsdShade.Shader.Define(stage, f'/QB12_PCB/Looks/{name}/PBR'); sh.CreateIdAttr('UsdPreviewSurface')
    lin = lambda v: (v / 255.0) ** 2.2   # glTF baseColorFactor is linear already; KiCad writes sRGB-looking values -> keep as is
    L = [float((v / 255.0) ** 2.2) for v in (r, g_, b)]
    sh.CreateInput('diffuseColor', Sdf.ValueTypeNames.Color3f).Set(Gf.Vec3f(*L))
    sh.CreateInput('metallic', Sdf.ValueTypeNames.Float).Set(met)
    sh.CreateInput('roughness', Sdf.ValueTypeNames.Float).Set(rough)
    if a < 255: sh.CreateInput('opacity', Sdf.ValueTypeNames.Float).Set(a / 255)
    mat.CreateSurfaceOutput().ConnectToSource(sh.ConnectableAPI(), 'surface')
    UsdShade.MaterialBindingAPI.Apply(um.GetPrim()).Bind(mat)
    pm = mesh.copy()
    pm.visual = trimesh.visual.TextureVisuals(material=trimesh.visual.material.PBRMaterial(baseColorFactor=[L[0], L[1], L[2], a / 255], metallicFactor=met, roughnessFactor=rough))
    prev.add_geometry(pm, geom_name=name)
    print(name, 'faces', len(mesh.faces), 'met', met, 'rough', rough, 'alpha', a)
stage.GetRootLayer().Save()
ok = UsdUtils.CreateNewUsdzPackage(Sdf.AssetPath(f'{out}/QB12_PCB.usdc'), f'{out}/QB12_PCB_{SCHEME}.usdz')
prev.export(f'{out}/QB12_PCB_merged_{SCHEME}.glb')
print('usdz', ok, 'faces', tot)
