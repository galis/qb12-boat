# QB12 PCB 课 — framework for lesson authors

One self-contained HTML page, `qb12-pcb-course.html`, built from a skeleton, a shared board viewer, data extracted from the real
design files, and one fragment set per lesson. It is the sequel to the circuit course (`../circuit/qb12-circuit-course.html`)
and copies its look exactly (tokens, typography, components). **Everything the reader sees is Simplified Chinese.**

```
courses/pcb/
  build.py                 stitches everything into qb12-pcb-course.html (+ _preview.html for testing)
  src.html                 page skeleton: <title>, CSS tokens/components, header + nav, 9 lesson slots, core JS (C.*)
  viewer/boardviewer.js    BoardViewer module (API documented at the top of the file and below)
  viewer/boardviewer.css   viewer styles (all classes bv-*, dark + light palettes)
  lessons/pN.html|js|css   lesson fragments (N = 0…8). p0.* is written; the rest are placeholders until you add files
  assets/                  images etc., inlined with @@ASSET:name@@  (pcb3d_hero.webp, pcb3d_top.webp, schematic.webp)
  data/board.json          everything about the board (schema below)
  data/layers.json         per-layer SVG fragments used by the viewer (same content as data/layers/*.svg)
  data/layers/*.svg        F.Cu B.Cu F.SilkS B.SilkS F.Mask B.Mask F.Paste B.Paste Edge.Cuts Drill — one frame, cropped to the board
  tools/extract.py         re-creates data/ from the design files (read-only; python3.12 + pcbnew + kicad-cli)
  tools/assets.py          re-creates assets/*.webp from the existing renders
  tools/test.py            Playwright test: desktop dark 1280, phone light 400, reduced motion
  tools/vtest.py           quick viewer screenshots (all modes)
  facts.md, raw/           external fact sheet (JLCPCB / KiCad 8 menus, with sources) from a separate research pass — not
                           written by this framework; cite it for anything that is not in the design files
```

## Build and test

```bash
cd courses/pcb
python3 build.py                 # writes qb12-pcb-course.html and _preview.html, prints size + warnings
python3 build.py --strict        # exit 1 on any warning (use before handing off)
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers python3 tools/test.py    # never run `playwright install`
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers python3 tools/test_pN.py --page _preview.html   # a lesson's own checks on the full page (shots → _shots/full/pN/)
```
The published page is a fragment (starts with `<title>`, no doctype) exactly like the circuit course; `_preview.html` wraps
it in a doctype + viewport meta for local testing. Current size ≈ 3.6 MB with all 9 lessons; the limit is 5 MB.

## Splice mechanism (how 8 authors work in parallel without colliding)

Write up to three files for lesson N in `lessons/`:

| file | required | rules |
|---|---|---|
| `pN.html` | yes | exactly one `<section class="lesson" id="pN"> … </section>`. Every `id` inside starts with `pN-`. No `<script>`/`<style>`. Start with the same header as the circuit course: `<div class="lhead"><span class="lnum">N</span><div><h2>…</h2><p>学完能说清：…</p></div></div>`, then `<div class="sec"><h3><span class="k">N.1</span>…</h3>…</div>` blocks, ending with a 3-question quiz. |
| `pN.css` | no | every selector starts with `#pN` or `.pN-` (inside `@media` too); `@keyframes pN-…`. Do not restyle shared classes globally. |
| `pN.js` | no | build.py wraps it as `(function(){ 'use strict'; try { … } catch(e){ console.error('[pN]', e) } })();`, so top-level `const`s are private. Do not assign globals. It runs after the DOM, the data (`QB`), the helpers (`C`) and `BoardViewer.autoInit()`. |

* Assets: put a file in `assets/` and write `@@ASSET:file.webp@@` wherever a URL goes (HTML `src`, CSS `url()`, JS string).
  Each occurrence inlines the bytes again, so reference a big image once and copy its `src` in JS if you need it twice.
* Nav: build.py writes the nav from its `LESSONS` table; a lesson shows as "ready" once `pN.html` exists. Titles live in
  `build.py` → `LESSONS` (don't change them without telling the lead).
* build.py warns about: missing/duplicate section, ids without the `pN-` prefix, CSS selectors outside `#pN`/`.pN-`,
  un-replaced markers, duplicate ids across the page, page > 5 MB.
* Never edit `qb12-pcb-course.html` by hand; it is regenerated.

### Shared look (use these classes, they are the circuit course's)
`.sec` + `h3 .k` section heads · `.txt` (68ch prose) · `.card` · `.tip` (cyan side note) · `.howto` (dashed "KICAD 里自己做"
box: `<div class="howto"><b>KICAD 里自己做</b><span>…</span></div>`) · `.widget` + `.ctrls` + `.btn` / `.btn.primary` /
`aria-pressed` · `.readout` + `.ro` (`small` / `b` / `b.good|warn|bad`) · `.status` · `.stage` (figure + `.card.explain` with
`.states` rows) · `.two` (1.35fr / 1fr) · `.tbl > table` · `.code` (`.cm .kw .n`) · `.quiz > details > summary + .ans`
(+ `button.show`) · `.next > a.card` · `.legendrow` · `.fig` (image + caption) · inline: `.net`, `.net.p` (power, orange),
`.net.s` (signal, cyan), `.pow`, `.sig`, `<kbd>`, `.menu` (a menu path like `文件 → 制造输出`).
Colours: `--sig` cyan = signal, `--pow` orange = power, `--ok`, `--hl` highlight yellow, `--c1 --c2 --c3` extra series.

### Core helpers (`window.C`, same as the circuit course)
`C.el(tag, attrs, parent, text)` SVG element · `C.h(tag, attrs, parent, html)` HTML element ·
`C.flow(parent, d, cls, speed, gap, r)` dots flowing along a path (returns `{remove()}`) · `C.tickers.add((t, dt) => …)`
per-frame callback · `C.pressOne(sel, attr, val)` · `C.RM` reduced motion · `C.countUp(el, to, {dur, dec})` ·
`C.onVisible(el, fn, margin)`. The animation loop does not run under reduced motion — always render a correct static state.

### Data helpers (`window.QB`)
`QB.board` (= data/board.json) · `QB.layers` (SVG fragments) · `QB.fp('U2')` · `QB.net('VSYS')` · `QB.netIndex('VSYS')` ·
`QB.region('motor')` · `QB.netCls(name)` → `'p'` power / `'g'` GND / `'s'` signal.
**Rule: every number shown to the reader comes from these files (compute it in JS from `QB.board`, as p0.js does).**

## data/board.json

Coordinates: **board-local mm, origin = top-left of the outline, x right, y down** (KiCad internal minus (100,100)).
Outline 56 × 38 mm (frame incl. 0.1 mm edge line: x −0.05…56.05, y −0.05…38.05). The CPL / drill files use the
bottom-left aux origin with Y up — convert with `y_cpl = 38 − y`.

| key | content |
|---|---|
| `meta` | source file, KiCad version, coordinate note, `frame {x,y,w,h}` |
| `board` | `w h outline[[x,y]…] corner_r edge_width thickness copper_layers` |
| `rules` | project design rules (`min_clearance 0.15`, `min_track_width 0.15`, `min_via_diameter 0.5`, `min_through_hole_diameter 0.3`, `min_copper_edge_clearance 0.3`, `min_hole_clearance`, `min_hole_to_hole`, `min_via_annular_width`, `min_text_height`, `solder_mask_expansion 0`, `board_thickness`) |
| `classes[]` | net classes `{name, track, clearance, via:[d,drill], nets[]}` — Default 0.2, Power (GND, VBUS) 0.5, Motor 0.4, Rail (3V3) 0.3, Batt (BAT+, VSYS) 0.8 |
| `nets[]` | index = net id used everywhere. `{name, cls, pads:['U2.12',…], segs, len, vias, widths:{'0.8':38,…}}` |
| `footprints[]` | `{ref, value, fp (library name), pkg (short), x, y, rot, side, bbox[x0,y0,x1,y1] (courtyard), crt [[x,y]…], lcsc, lcsc_field, lcsc_part_field, desc, kind, lib (基础/扩展), refShown, tht, pins [[num(s), name, net]…], pads[]}` |
| `pads[]` | `{n, net, t: smd/pth/npth, s: rect/roundrect/oval/circle/custom, x, y, w, h, a (abs. degrees, CCW), cu 'F'/'B'/'FB', rr?, poly?, drill?[w,h], mask?, paste?, clr? (local clearance), pasteRatio?}` |
| `tracks[]` | `[net, layer(0=F.Cu,1=B.Cu), width, x1, y1, x2, y2, locked]` (391 segments, no arcs) |
| `vias[]` | `{net, x, y, d, drill, locked, role}` role ∈ `signal stitch fanout thermal module` (classified from route_b.py's logic) |
| `zones[]` | GND fills: `{net, layers, rule:false, clearance 0.3, min_width 0.25, pad_connection 'solid', island_removal 'always', fill:{'F.Cu':{area, polys:[[outer, hole…]…]}}}`; keepouts: `{rule:true, id: antenna/module/usb, label, why, layers, keepout:{tracks,vias,pour,pads,footprints}, bbox}` |
| `ratsnest[]` | `[net, x1,y1,x2,y2]` — MST per net from final pad positions (illustrative "飞线", not stored in KiCad) |
| `texts[]` | back-side silkscreen labels (L MOTOR, BATTERY 1S, BOOT, RESET, Boat QB12, …) |
| `regions[]` | tour regions `{id, label, refs, bbox}`: connectors mcu antenna switch power motor charge usb buttons |
| `stats` | all headline numbers (size, pads, tracks, widths histogram, vias, via roles, locked counts, holes, GND areas, …) |
| `drc` | `{date, kicad, errors, warnings, by_type[{type, zh, n}], unconnected, schematic_parity, items[[type, x, y, desc]…]}` |
| `fab` | Gerber file list + sizes, drill tool tables (`pth`, `npth` with hit/slot counts), BOM rows, CPL rows, zip size |
| `process` | the script pipeline, Freerouting version/passes/timings, keepout rectangles, GND via/zone parameters |

## BoardViewer

```js
// a second (or third) viewer inside your lesson — give the element an id with your prefix
const B = BoardViewer.create(document.getElementById('p4-bv'), {
  layers: ['F.Cu', 'B.Cu', 'Vias', 'Edge.Cuts'],   // visible layers
  mode: 'layers',            // 'layers' (KiCad-like) | 'made' (green mask, white silk, HASL/ENIG) | 'film' (Gerber look)
  side: 'top',               // 'bottom' mirrors the board, as if flipped over
  toolbar: true,             // true | 'mini' (mode + zoom only) | false
  nets: true,                // net dropdown + track-width chips in the toolbar
  panel: true,               // info card (right ≥ 860 px container, below otherwise)
  view: 'motor',             // 'board' | ref | [refs] | region id | net name | [x0,y0,x1,y1]
  tracks: true, pads: true,  // draw tracks / pads inside the copper layers
});
// or declaratively in pN.html (auto-created before your JS runs):
//   <div class="bv" id="p4-bv" data-bv='{"layers":["F.Cu","Edge.Cuts"],"toolbar":"mini"}'></div>
//   const B = BoardViewer.get('p4-bv');
```

Layers: `F.Cu B.Cu Vias Zones F.SilkS B.SilkS F.Mask B.Mask F.Paste B.Paste Edge.Cuts Drill Courtyard Keepouts Ratsnest Labels DRC`
(`F.Silkscreen`/`B.Silkscreen` accepted). Silk/mask/paste come from kicad-cli SVG exports; copper, vias, zones and holes are
drawn from `board.json`, so they are clickable. In `made` mode the physical layers of the visible side are drawn
automatically; the list then only toggles overlays (`Keepouts Ratsnest Courtyard Labels DRC F.Paste`).

| call | effect |
|---|---|
| `B.show({layers, mode, side, finish:'hasl'/'enig', mask:'green'/'black'/'blue', tracks, pads})` | merge into state and redraw |
| `B.toggle('Zones', true/false)` | one layer on/off |
| `B.focus('U2' / ['U2','R15'] / 'motor' / 'VSYS' / 'antenna' / [x0,y0,x1,y1], {pad:2, animate:true})` · `B.reset()` | zoom to it |
| `B.highlightNet('VSYS' / [...], {keep, focus})` | tracks, pads, vias glow; everything else dims |
| `B.highlightWidth(0.8 / [0.8, 0.5])` · `B.highlightParts([...])` · `B.highlightVias('stitch' / ['thermal','module'] / v => bool)` · `B.highlightTracks('locked' / (t, i) => bool / [i…])` | other highlight kinds; `{keep:true}` adds to the current highlight. Pad highlights (parts, select, nets) follow `offsetParts` |
| `B.filterDRC('silk_overlap' / [...] / null)` | the DRC layer shows only these marker types (`drc.items[][0]`); `null` = all |
| `B.select('U2')` · `B.selectNet('VSYS')` | open the info card (part: value, package, LCSC, pads → nets; net: class, widths, length, parts) |
| `B.clear()` | remove highlights, animations, selection |
| `await B.animateRoute('VSYS' / [...] / '*', {duration:2.6, from:'J2', style:'hl'/'layer'})` | draw the net's tracks progressively, spreading from `from`'s pad through vias; `'layer'` draws in copper colours and leaves the real tracks shown |
| `await B.reveal('Vias' / 'Zones' / layer, {duration, sweep:'x'/'rand'})` | pop / fade a layer in |
| `await B.offsetParts({U2:[dx,dy]} / 'pile' / null, {duration, stagger})` | move parts (pads, courtyard, label); `'pile'` = all parts stacked as after a netlist import (`BoardViewer.pileLayout()`); `null` = back home |
| `B.annotate(svgString / (g, mk) => …)` · `B.label(x,y,text)` · `B.box([x0,y0,x1,y1], text)` · `B.arrow([x1,y1],[x2,y2])` · `B.clearAnnotations()` | your own drawing in board mm (`.bx` box and `.ar` arrow styles exist). Default annotation text and keepout names are sized in screen terms: they grow with zoom only until ≈ 16 px (`font-size: calc(1.2px / var(--bv-tz,1))`; use the same `--bv-tz` in your own CSS if you want that). Text with an inline `style="font-size:…"` keeps its own size. In film mode annotation / ref / pad-number text is dark ink |
| `B.badge('第 3 步')` | small label at the stage's top-left |
| `B.on('select' / 'net' / 'view' / 'hover' / 'mode', fn)` · `B.state()` | events and a JSON snapshot of the state |

Interaction built in: drag to pan when zoomed, Ctrl/⌘ + wheel or trackpad pinch to zoom (plain wheel scrolls the page and
shows a hint), double-click / double-tap to zoom, two-finger pinch when zoomed, `+ − 0 ← ↑ → ↓ Esc` on the focused stage,
hover readout (pad / track / via), pad numbers appear at ≥ 4× zoom. The toolbar's layer and net rows collapse behind
“图层 ▾” when the viewer is narrower than 560 px. Viewers build lazily when they come within 600 px of the viewport (or on
the first API call). Under `prefers-reduced-motion` every animation jumps straight to its end state and promises resolve
immediately. Viewer colours follow the page theme (dark first, light via `prefers-color-scheme` or `data-theme`).

Example (a lesson-4 widget):
```js
const B = BoardViewer.create(document.getElementById('p4-bv'), { nets: true, layers: ['F.Cu', 'B.Cu', 'Vias', 'Edge.Cuts', 'F.SilkS'] });
document.getElementById('p4-vsys').addEventListener('click', async () => {
  B.clear().focus('power');
  await B.animateRoute('VSYS', { from: 'Q1', duration: 2 });
  B.box(QB.region('power').bbox, '0.8 mm 的 VSYS');
});
```

## Checklist before you hand off a lesson
* `python3 build.py --strict` prints no warnings; `tools/test.py` still passes; add your own checks if you add widgets.
* 400 px phone, light theme: no horizontal page scroll (wide SVGs go in `.wscroll` or scale), 16 px gutters come from `.wrap`.
* No console errors; works with reduced motion; numbers computed from `QB.board`; every claim traceable to the design files
  or scripts in `../../hardware/pcb/` (say “示意” when a picture is illustrative, e.g. the ratsnest or the parts pile).
* Each lesson: the design reasoning first, then what QB12 actually did, then how to do it by hand in KiCad 8 (menu paths in
  `.menu`, hotkeys in `<kbd>`), and a 3-question quiz in the circuit course's `details` style.
