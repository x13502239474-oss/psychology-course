# -*- coding: utf-8 -*-
"""心理学系统学习平台 内容构建脚本
把 content/M*.md 解析为 data/content.js（window.PSY_CONTENT）。
无第三方依赖。"""
import re, os, glob, json, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT_DIR = os.path.join(ROOT, "content")
OUT = os.path.join(ROOT, "data", "content.js")

BLOCK_RE = re.compile(r"\[\[(\w+):([^\]\n]*)\]\]\n(.*?)\n\[\[/\1\]\]", re.S)
BLOCK_LABEL = {
    "concept": "核心概念", "research": "研究案例", "compare": "理论对照",
    "scholar": "学者档案", "note": "学术提醒", "figure": "机制图解", "summary": "知识地图",
}


def inline(s):
    s = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", s)
    return s


def md_blocks(text):
    """把一段 markdown 文本渲染为 HTML，支持标题/段落/列表/表格/引用/水平线。"""
    lines = text.strip().split("\n")
    out, i = [], 0
    n = len(lines)
    while i < n:
        line = lines[i]
        st = line.strip()
        if not st:
            i += 1
            continue
        # 水平线
        if st in ("---", "***", "___"):
            out.append('<hr class="rule">'); i += 1; continue
        # 表格
        if st.startswith("|") and i + 1 < n and re.match(r"^\s*\|?[\s:\-|]+\|\s*$", lines[i + 1]):
            header = [c.strip() for c in st.strip("|").split("|")]
            i += 2
            rows = []
            while i < n and lines[i].strip().startswith("|"):
                rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
                i += 1
            th = "".join(f"<th>{inline(c)}</th>" for c in header)
            trs = "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in rows)
            out.append(f'<div class="table-wrap"><table><thead><tr>{th}</tr></thead><tbody>{trs}</tbody></table></div>')
            continue
        # 无序列表
        if re.match(r"^\s*[-*]\s+", line):
            items = []
            while i < n and re.match(r"^\s*[-*]\s+", lines[i]):
                items.append(re.sub(r"^\s*[-*]\s+", "", lines[i]))
                i += 1
            out.append("<ul>" + "".join(f"<li>{inline(x)}</li>" for x in items) + "</ul>")
            continue
        # 有序列表
        if re.match(r"^\s*\d+\.\s+", line):
            items = []
            while i < n and re.match(r"^\s*\d+\.\s+", lines[i]):
                items.append(re.sub(r"^\s*\d+\.\s+", "", lines[i]))
                i += 1
            out.append("<ol>" + "".join(f"<li>{inline(x)}</li>" for x in items) + "</ol>")
            continue
        # 引用
        if st.startswith(">"):
            buf = []
            while i < n and lines[i].strip().startswith(">"):
                buf.append(re.sub(r"^\s*>\s?", "", lines[i])); i += 1
            out.append("<blockquote>" + md_blocks("\n".join(buf)) + "</blockquote>")
            continue
        # 小节标题 #### / ###
        m = re.match(r"^(#{3,4})\s+(.+)$", st)
        if m:
            lvl = len(m.group(1))
            out.append(f"<h{lvl}>{inline(m.group(2))}</h{lvl}>"); i += 1; continue
        # 段落：合并到下一个空行/特殊行
        buf = [st]; i += 1
        while i < n:
            nx = lines[i]; ns = nx.strip()
            if not ns: break
            if ns in ("---", "***", "___") or ns.startswith(("|", ">", "###", "####")): break
            if re.match(r"^\s*[-*]\s+", nx) or re.match(r"^\s*\d+\.\s+", nx): break
            buf.append(ns); i += 1
        out.append("<p>" + inline(" ".join(buf)) + "</p>")
    return "\n".join(out)


def render_with_blocks(text):
    """渲染正文，遇到自定义块时替换成精致版式。"""
    result, pos = [], 0
    for m in BLOCK_RE.finditer(text):
        before = text[pos:m.start()]
        if before.strip():
            result.append(md_blocks(before))
        kind, title, body = m.group(1), m.group(2).strip(), m.group(3)
        label = BLOCK_LABEL.get(kind, "")
        if kind == "summary":
            result.append('<div class="block block-summary"><div class="block-head"><span class="block-label">' +
                          label + '</span><h4>' + inline(title) + '</h4></div>' + md_blocks(body) + '</div>')
        else:
            result.append(f'<div class="block block-{kind}"><div class="block-head"><span class="block-label">{label}</span><h4>{inline(title)}</h4></div>' +
                          md_blocks(body) + '</div>')
        pos = m.end()
    rest = text[pos:]
    if rest.strip():
        result.append(md_blocks(rest))
    return "\n".join(result)


def parse_module(path):
    with open(path, encoding="utf-8") as f:
        raw = f.read()
    # 模块标题（首行 #）
    title_m = re.search(r"^#\s+(.+)$", raw, re.M)
    title = title_m.group(1).strip() if title_m else ""
    body = raw[title_m.end():] if title_m else raw
    # 导语（紧随其后的 > 引用，连续行）
    intro = ""
    im = re.search(r"(?:^|\n)>\s*(.+(?:\n>\s*.+)*)", body)
    if im:
        intro = " ".join(x.strip() for x in im.group(1).replace("\n>", "\n").split("\n"))
        # 清理子代理可能写入的提示语前缀
        intro = re.sub(r"^(模块)?导语[:：]\s*", "", intro).strip()
        body = body[:im.start()] + body[im.end():]
    # summary 块抽出来单独放
    summary_html = ""
    sm = BLOCK_RE.search(body)
    blocks = list(BLOCK_RE.finditer(body))
    for b in blocks:
        if b.group(1) == "summary":
            summary_html = ('<div class="block block-summary"><div class="block-head"><span class="block-label">知识地图</span>'
                            '<h4>' + inline(b.group(2).strip()) + '</h4></div>' + md_blocks(b.group(3)) + '</div>')
            body = body[:b.start()] + body[b.end():]
            break
    # 按 ## 章切分
    chapters = []
    parts = re.split(r"^##\s+(.+)$", body, flags=re.M)
    # parts: [pre, title1, body1, title2, body2, ...]
    idx = 1
    while idx < len(parts) - 1:
        ctitle = parts[idx].strip()
        cbody = parts[idx + 1]
        # 跳过子代理额外写的"本模块知识总结"容器章（其 summary 块已被抽出为模块级）
        if not re.search(r"(知识总结|本章总结|模块总结)$", ctitle):
            chapters.append({"title": ctitle, "html": render_with_blocks(cbody)})
        idx += 2
    return {
        "title": title, "intro": inline(intro), "chapters": chapters,
        "summary": summary_html, "source_file": os.path.basename(path)
    }


def main():
    files = sorted(glob.glob(os.path.join(CONTENT_DIR, "M*.md")))
    data = {}
    errs = []
    for fp in files:
        mid = os.path.splitext(os.path.basename(fp))[0]
        try:
            data[mid] = parse_module(fp)
        except Exception as e:
            errs.append(f"{mid}: {e}")
    payload = "/* 由 tools/build.py 自动生成，请勿手动编辑 */\nwindow.PSY_CONTENT = " + \
              json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n"
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(payload)
    print(f"[build] {len(data)} 个模块已写入 {OUT}")
    for mid, d in data.items():
        print(f"   {mid}: {len(d['chapters'])} 章, {len(d['html']) if 'html' in d else len(d['summary'])} 字摘要, {len(d['intro'])} 字导语")
    if errs:
        print("[build] 错误:", *errs, sep="\n  ")
        sys.exit(1)


if __name__ == "__main__":
    main()
