import pcbnew, sys, os
lib = sys.argv[1]
for fn in sorted(os.listdir(lib)):
    name = fn[:-10]
    fp = pcbnew.FootprintLoad(lib, name)
    bb = fp.GetBoundingBox(False, False)
    pads = []
    for p in fp.Pads():
        pos = p.GetPosition(); sz = p.GetSize()
        pads.append(f"{p.GetNumber() or '∅'}@({pcbnew.ToMM(pos.x):.2f},{pcbnew.ToMM(pos.y):.2f}){'TH' if p.GetAttribute()==pcbnew.PAD_ATTRIB_PTH else ('NP' if p.GetAttribute()==pcbnew.PAD_ATTRIB_NPTH else '')}[{pcbnew.ToMM(sz.x):.1f}x{pcbnew.ToMM(sz.y):.1f}]")
    print(f"== {name}  bbox {pcbnew.ToMM(bb.GetWidth()):.1f}x{pcbnew.ToMM(bb.GetHeight()):.1f} at ({pcbnew.ToMM(bb.GetX()):.1f},{pcbnew.ToMM(bb.GetY()):.1f})  npads={len(pads)}")
    if len(pads) <= 20:
        print("   ", " ".join(pads))
    else:
        print("   ", " ".join(pads[:6]), "...", " ".join(pads[-6:]))
