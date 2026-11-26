import sys, pcbnew
b = pcbnew.LoadBoard(sys.argv[1])
OX, OY = 100.0, 100.0
boxes = []
for fp in b.GetFootprints():
    bb = fp.GetBoundingBox(False, False)
    x0, y0 = pcbnew.ToMM(bb.GetX()) - OX, pcbnew.ToMM(bb.GetY()) - OY
    boxes.append((fp.GetReference(), x0, y0, x0 + pcbnew.ToMM(bb.GetWidth()), y0 + pcbnew.ToMM(bb.GetHeight())))
m = 0.15
bad = 0
for i in range(len(boxes)):
    for j in range(i + 1, len(boxes)):
        a, b2 = boxes[i], boxes[j]
        if a[1] < b2[3] - m and b2[1] < a[3] - m and a[2] < b2[4] - m and b2[2] < a[4] - m:
            ox = min(a[3], b2[3]) - max(a[1], b2[1]); oy = min(a[4], b2[4]) - max(a[2], b2[2])
            print(f"重叠 {a[0]:5s} {b2[0]:5s}  {ox:.2f} x {oy:.2f} mm"); bad += 1
for r, x0, y0, x1, y1 in boxes:
    if x0 < -0.01 or y0 < -0.01 or x1 > 56.01 or y1 > 38.01:
        print(f"出板 {r:5s} ({x0:.1f},{y0:.1f})-({x1:.1f},{y1:.1f})")
print("overlaps:", bad)
