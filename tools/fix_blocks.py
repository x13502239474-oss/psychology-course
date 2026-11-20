# -*- coding: utf-8 -*-
"""幂等修复：为漏写闭合标记的自定义块补上 [[/type]]。
在下一个块标记 / 标题 / 文件结尾前自动闭合。可重复运行。"""
import re, glob, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CDIR = os.path.join(ROOT, "content")

open_re = re.compile(r'^\s*\[\[(\w+):[^\]]*\]\]\s*$')
close_re = re.compile(r'^\s*\[\[/(\w+)\]\]\s*$')
head_re = re.compile(r'^\s*#{2,4}\s+')

def fix_file(path):
    lines = open(path, encoding="utf-8").read().split("\n")
    out, stack = [], []
    changes = 0
    for line in lines:
        mc = close_re.match(line)
        if mc:
            out.append(line)
            if stack and stack[-1] == mc.group(1):
                stack.pop()
            continue
        mo = open_re.match(line)
        if mo:
            if stack:
                out.append("[[/" + stack.pop() + "]]")
                changes += 1
            out.append(line)
            stack.append(mo.group(1))
            continue
        if head_re.match(line):
            if stack:
                out.append("[[/" + stack.pop() + "]]")
                changes += 1
            out.append(line)
            continue
        out.append(line)
    while stack:
        out.append("[[/" + stack.pop() + "]]")
        changes += 1
    if changes:
        open(path, "w", encoding="utf-8").write("\n".join(out))
    return changes

if __name__ == "__main__":
    targets = sys.argv[1:] or [os.path.basename(f) for f in sorted(glob.glob(os.path.join(CDIR, "M*.md")))]
    for name in targets:
        if not name.endswith(".md"): name += ".md"
        p = os.path.join(CDIR, name)
        if not os.path.exists(p): continue
        n = fix_file(p)
        print(f"{name}: 补全 {n} 个闭合标记" if n else f"{name}: 无需修复")
