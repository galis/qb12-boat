#!/usr/bin/env python3
"""把骨架 src.html + 查看器 + 数据 + 各课片段拼成一个自包含页面 qb12-pcb-course.html。

用法：python3 build.py            （在 courses/pcb/ 目录或任意目录都行）
      python3 build.py --strict   有警告就失败（交付前用）

片段约定（详见 README.md）：
  lessons/pN.html   必须且只能包含一个 <section class="lesson" id="pN"> … </section>
  lessons/pN.css    可选；选择器必须以 #pN 或 .pN- 开头（@media / @keyframes pN- 也行）
  lessons/pN.js     可选；build.py 自动包成 (function(){ 'use strict'; try{ … }catch(e){ console.error('[pN]', e) } })();
  元素 id 一律用 pN- 前缀；资源文件放 assets/，在 HTML / CSS / JS 里写 @@ASSET:文件名@@ 换成 data: URI。
"""
import base64, json, mimetypes, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "qb12-pcb-course.html")
PREVIEW = os.path.join(HERE, "_preview.html")
STRICT = "--strict" in sys.argv
# --only N[,M]：只拼第 0 课 + 指定的课（其余用占位），输出到 _build_pN.html / _preview_pN.html，
# 让几位作者并行测试时互不覆盖文件。
ONLY = None
if "--only" in sys.argv:
    ONLY = {0} | {int(x) for x in sys.argv[sys.argv.index("--only") + 1].split(",")}
    _tag = "_".join(str(n) for n in sorted(ONLY - {0})) or "0"
    OUT = os.path.join(HERE, f"_build_p{_tag}.html")
    PREVIEW = os.path.join(HERE, f"_preview_p{_tag}.html")

LESSONS = [
    (0, "全景：从原理图到一块板", "九步流水线、真板导览"),
    (1, "PCB 是什么做的", "铜、基材、阻焊、丝印"),
    (2, "封装：从符号到焊盘", "焊盘、间距、立创编号"),
    (3, "板框与布局", "板子多大、元件放哪"),
    (4, "走线", "线宽、间距、自动布线"),
    (5, "过孔与铺铜", "换层、接地、散热"),
    (6, "检查：DRC 与 3D", "规则、报告、看实物"),
    (7, "出生产文件", "Gerber、钻孔、BOM、坐标"),
    (8, "下单与到货", "嘉立创 SMT、上电检查"),
]

warnings = []


def warn(msg):
    warnings.append(msg)
    print("  ! " + msg)


def read(p):
    with open(os.path.join(HERE, p), encoding="utf-8") as f:
        return f.read()


def exists(p):
    m = re.match(r"lessons/p(\d+)\.", p)
    if ONLY is not None and m and int(m.group(1)) not in ONLY:
        return False
    return os.path.exists(os.path.join(HERE, p))


def assets(text, where):
    def rep(m):
        name = m.group(1)
        p = os.path.join(HERE, "assets", name)
        if not os.path.exists(p):
            warn(f"{where}: 找不到资源 assets/{name}")
            return ""
        mime = mimetypes.guess_type(name)[0] or ("image/webp" if name.endswith(".webp") else "application/octet-stream")
        return f"data:{mime};base64," + base64.b64encode(open(p, "rb").read()).decode()
    return re.sub(r"@@ASSET:([\w.\-]+)@@", rep, text)


def placeholder(n, title, sub):
    return (f'<section class="lesson" id="p{n}">\n'
            f'  <div class="lhead"><span class="lnum">{n}</span><div><h2>{title}</h2><p>{sub}</p></div></div>\n'
            f'  <p class="todo-note">这一课还在写。</p>\n</section>')


def check_html(n, html):
    if len(re.findall(r'<section\s+class="lesson"\s+id="p%d"' % n, html)) != 1:
        warn(f"p{n}.html：必须正好有一个 <section class=\"lesson\" id=\"p{n}\">")
    for i in re.findall(r'\sid="([^"]+)"', html):
        if i != f"p{n}" and not i.startswith(f"p{n}-"):
            warn(f"p{n}.html：id=\"{i}\" 没有 p{n}- 前缀")
    if re.search(r"<script|<style", html):
        warn(f"p{n}.html：不要在 HTML 片段里写 <script>/<style>，放进 p{n}.js / p{n}.css")


def check_css(n, css):
    body = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    # 粗略：取每条规则的选择器（不在 @keyframes 里）
    depth, sel, inkey = 0, "", False
    i = 0
    stack = []
    while i < len(body):
        c = body[i]
        if c == "{":
            s = sel.strip()
            if s.startswith("@"):
                stack.append("key" if s.startswith("@keyframes") else "at")
                if s.startswith("@keyframes") and not re.match(r"@keyframes\s+p%d-" % n, s):
                    warn(f"p{n}.css：动画名要以 p{n}- 开头：{s}")
            else:
                stack.append("rule")
                if "key" not in stack[:-1]:
                    for part in s.split(","):
                        part = part.strip()
                        if part and not (part.startswith(f"#p{n}") or part.startswith(f".p{n}-") or part.startswith(":root")):
                            warn(f"p{n}.css：选择器 \"{part}\" 要以 #p{n} 或 .p{n}- 开头")
            sel = ""
        elif c == "}":
            if stack:
                stack.pop()
            sel = ""
        elif c == ";" and (not stack or stack[-1] != "rule"):
            sel = ""
        else:
            if not stack or stack[-1] in ("at", "key"):
                sel += c
        i += 1


def wrap_js(n, js):
    return (f"/* ---------- 第 {n} 课 lessons/p{n}.js ---------- */\n"
            f"(function () {{\n'use strict';\ntry {{\n{js}\n}} catch (e) {{ console.error('[p{n}]', e); }}\n}})();\n")


def main():
    src = read("src.html")
    board = read("data/board.json")
    layers = json.loads(read("data/layers.json"))
    data = '{"board":' + board + ',"layers":' + json.dumps(layers, ensure_ascii=False, separators=(",", ":")) + "}"
    nav, css_all, js_all = [], [], []
    ready = []
    for n, title, sub in LESSONS:
        h, c, j = f"lessons/p{n}.html", f"lessons/p{n}.css", f"lessons/p{n}.js"
        if exists(h):
            html = read(h)
            check_html(n, html)
            ready.append(n)
        else:
            html = placeholder(n, title, sub)
        src = src.replace(f"<!--@@LESSON:{n}@@-->", f"<!-- ============ 第 {n} 课 ============ -->\n" + assets(html, h))
        cls = "ready" if exists(h) else "todo"
        nav.append(f'    <a class="lsn {cls}" href="#p{n}"><b>{n}</b><span>{title}<small>{sub}</small></span></a>')
        if exists(c):
            css = read(c); check_css(n, css)
            css_all.append(f"/* ---------- 第 {n} 课 lessons/p{n}.css ---------- */\n" + assets(css, c))
        if exists(j):
            js_all.append(wrap_js(n, assets(read(j), j)))
    src = src.replace("<!--@@NAV@@-->", "\n".join(nav))
    src = src.replace("/*@@VIEWER_CSS@@*/", read("viewer/boardviewer.css"))
    src = src.replace("/*@@LESSON_CSS@@*/", "\n".join(css_all))
    src = src.replace("/*@@VIEWER_JS@@*/", read("viewer/boardviewer.js"))
    src = src.replace("/*@@LESSON_JS@@*/", "\n".join(js_all))
    src = src.replace("/*@@DATA@@*/", data)
    left = re.findall(r"@@[A-Z_]+(?::\w+)?@@", src)
    if left:
        warn(f"还有没替换的标记：{sorted(set(left))}")
    ids = re.findall(r'\sid="([^"]+)"', src)
    dup = sorted({i for i in ids if ids.count(i) > 1})
    if dup:
        warn(f"页面里有重复的 id：{dup}")
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(src)
    with open(PREVIEW, "w", encoding="utf-8") as f:
        f.write("<!doctype html><html lang=\"zh-CN\"><head><meta charset=\"utf-8\">"
                "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\"></head><body>"
                + src + "</body></html>")
    size = os.path.getsize(OUT)
    print(f"写出 {OUT}")
    print(f"  大小 {size/1024:.0f} KB（数据 {len(data.encode())/1024:.0f} KB），已写的课：{ready or '无'}，警告 {len(warnings)} 条")
    if size > 5 * 1024 * 1024:
        warn("页面超过 5 MB")
    if STRICT and warnings:
        sys.exit(1)


if __name__ == "__main__":
    main()
