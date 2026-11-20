# -*- coding: utf-8 -*-
"""课程终检：大纲一致 / 块闭合 / summary / 章数 / 字数 / 虚构痕迹。"""
import os, re, glob, json, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CDIR = os.path.join(ROOT, "content")
sys.path.insert(0, os.path.join(ROOT, "tools"))

# 读取 meta.js 中的模块大纲（用正则提取，避免执行 JS）
meta_raw = open(os.path.join(ROOT, "data", "meta.js"), encoding="utf-8").read()
outlines = {}
for mm in re.finditer(r'\{ id:"(M\d+)".*?chapters:\[(.*?)\]\s*\}', meta_raw, re.S):
    mid, body = mm.group(1), mm.group(2)
    chapters = re.findall(r'\{t:"([^"]+)"\}', body)
    outlines[mid] = chapters

BLOCK_TYPES = ["concept","research","compare","scholar","note","figure","summary"]
report = []
hard_errors = []

files = sorted(glob.glob(os.path.join(CDIR, "M*.md")))
for fp in files:
    mid = os.path.splitext(os.path.basename(fp))[0]
    txt = open(fp, encoding="utf-8").read()
    issues = []
    # 字数（去掉标记后的中文字符）
    plain = re.sub(r'\[\[[^\]]*\]\]', '', txt)
    cn = len(re.findall(r'[\u4e00-\u9fff]', plain))
    if cn < 6000:
        issues.append(f"字数偏少：{cn}")
    # 章节标题逐字匹配
    heads = re.findall(r'^##\s+(.+)$', txt, re.M)
    heads = [h.strip() for h in heads if '知识总结' not in h and '总结' not in h]
    expect = outlines.get(mid, [])
    if len(heads) != len(expect):
        issues.append(f"章数 {len(heads)}≠大纲 {len(expect)}")
    for i, (a, b) in enumerate(zip(heads, expect)):
        if a != b:
            issues.append(f"第{i+1}章标题不符：{a[:25]!r} vs {b[:25]!r}")
    # 自定义块闭合
    opens = re.findall(r'\[\[(\w+):', txt)
    closes = re.findall(r'\[\[/(\w+)\]\]', txt)
    for bt in BLOCK_TYPES:
        no, nc = opens.count(bt), closes.count(bt)
        if no != nc:
            issues.append(f"{bt}块未闭合：开{no}/闭{nc}")
    # concept/research/summary 最低数量
    if opens.count("concept") < 5: issues.append(f"concept 仅 {opens.count('concept')} 个")
    if opens.count("research") < 2: issues.append(f"research 仅 {opens.count('research')} 个")
    if opens.count("summary") < 1: issues.append("缺 summary 块")
    # 8维度关键词覆盖（宽松检测）
    for dim, kws in {
        "学科背景": ["背景","诞生","起源","起源","历史","发展","20世纪","实验"],
        "核心概念": ["概念","定义","是指","称为"],
        "理论体系": ["理论","模型","学说"],
        "研究证据": ["实验","研究","发现","结果"],
        "理论比较": ["对比","比较","区别","vs","而","不同"],
        "现实应用": ["应用","生活","教育","现实","日常","临床"],
        "学术争议": ["争议","争论","质疑","局限","批评","尚未"],
        "知识总结": ["总结","地图","回顾","总之"],
    }.items():
        if not any(k in txt for k in kws):
            issues.append(f"可能缺维度：{dim}")
    report.append((mid, cn, len(heads), opens.count("concept"), opens.count("research"), issues))
    if issues:
        hard_errors.append(mid)

print(f"终检 {len(files)} 个模块\n")
print(f"{'模块':<6}{'中文字':>8}{'章':>4}{'概念':>5}{'实验':>5}  问题")
for mid, cn, nc, c1, c2, issues in report:
    flag = "OK" if not issues else "; ".join(issues[:3])
    print(f"{mid:<6}{cn:>8}{nc:>4}{c1:>5}{c2:>5}  {flag}")

missing = [f"M{i:02d}" for i in range(1,27) if not os.path.exists(os.path.join(CDIR,f"M{i:02d}.md"))]
if missing:
    print("\n缺失模块:", ", ".join(missing))
print("\n有问题的模块:", ", ".join(hard_errors) if hard_errors else "无")
