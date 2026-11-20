# -*- coding: utf-8 -*-
"""通过 GitHub REST API (Git Data API) 提交整个静态站点并启用 Pages。
绕开 github.com 的 git 协议（被代理阻断），全程走 api.github.com。"""
import json, os, sys, base64, urllib.request, urllib.error, time

TOKEN = os.environ.get("GH_TOKEN", "")
OWNER = "x13502239474-oss"
REPO = "psychology-course"
API = "https://api.github.com"
ROOT = r"C:\Users\1\WorkBuddy\2026-11-20-19-53-31"

PROXY = os.environ.get("https_proxy") or os.environ.get("HTTPS_PROXY")
opener = urllib.request.build_opener(
    urllib.request.ProxyHandler({"https": PROXY, "http": PROXY}) if PROXY else urllib.request.ProxyHandler({})
)

def req(method, path, data=None, quiet=False):
    url = API + path
    body = json.dumps(data).encode("utf-8") if data is not None else None
    r = urllib.request.Request(url, data=body, method=method)
    r.add_header("Authorization", "token " + TOKEN)
    r.add_header("Accept", "application/vnd.github+json")
    r.add_header("User-Agent", "psy-deploy")
    if body:
        r.add_header("Content-Type", "application/json")
    try:
        with opener.open(r, timeout=180) as resp:
            raw = resp.read().decode() or "{}"
            return resp.status, json.loads(raw)
    except urllib.error.HTTPError as e:
        raw = e.read().decode() or "{}"
        try:
            j = json.loads(raw)
        except Exception:
            j = {"raw": raw}
        return e.code, j

EXCLUDE_DIRS = {".git", ".workbuddy", "_research", "__pycache__", "_shots", "_screenshots"}
def collect():
    out = []
    for dp, dns, fns in os.walk(ROOT):
        dns[:] = [d for d in dns if d not in EXCLUDE_DIRS]
        for fn in fns:
            if fn.endswith(".pyc"):
                continue
            full = os.path.join(dp, fn)
            rel = os.path.relpath(full, ROOT).replace("\\", "/")
            out.append((rel, full))
    out.sort()
    return out

def main():
    files = collect()
    print(f"待提交 {len(files)} 个文件")

    # 1. 检查默认分支是否存在（空仓库返回 404）
    st, j = req("GET", f"/repos/{OWNER}/{REPO}/git/ref/heads/main")
    parent_sha = j.get("object", {}).get("sha") if st == 200 else None
    base_tree = None
    if parent_sha:
        st2, cj = req("GET", f"/repos/{OWNER}/{REPO}/git/commits/{parent_sha}")
        if st2 == 200:
            base_tree = cj.get("tree", {}).get("sha")
        print(f"已有提交，父提交 {parent_sha[:8]}")
    else:
        print("空仓库，先用 Contents API 建立初始提交")
        init = "# Psychology · 心理学系统学习平台\n"
        st, j = req("PUT", f"/repos/{OWNER}/{REPO}/contents/.gitignore",
                    {"message": "init repository",
                     "content": base64.b64encode(init.encode("utf-8")).decode("ascii")})
        if st not in (200, 201):
            print("  初始化失败:", st, j.get("message")); sys.exit(1)
        st, j = req("GET", f"/repos/{OWNER}/{REPO}/git/ref/heads/main")
        parent_sha = j.get("object", {}).get("sha") if st == 200 else None
        print("  初始提交:", (parent_sha or "?")[:8])
        if parent_sha:
            st2, cj = req("GET", f"/repos/{OWNER}/{REPO}/git/commits/{parent_sha}")
            if st2 == 200:
                base_tree = cj.get("tree", {}).get("sha")

    # 2. 创建 blobs
    entries = []
    for rel, full in files:
        with open(full, "r", encoding="utf-8") as f:
            content = f.read()
        st, j = req("POST", f"/repos/{OWNER}/{REPO}/git/blobs", {"content": content, "encoding": "utf-8"})
        if st not in (200, 201):
            print(f"  BLOB 失败 {rel}: {st} {j.get('message')}")
            sys.exit(1)
        entries.append({"path": rel, "mode": "100644", "type": "blob", "sha": j["sha"]})
        print(f"  blob ok  {rel}")

    # 3. 创建 tree
    tree_payload = {"tree": entries}
    if base_tree:
        tree_payload["base_tree"] = base_tree
    st, tj = req("POST", f"/repos/{OWNER}/{REPO}/git/trees", tree_payload)
    if st not in (200, 201):
        print("TREE 失败:", st, tj.get("message")); sys.exit(1)
    tree_sha = tj["sha"]
    print("tree:", tree_sha[:10])

    # 4. 创建 commit
    msg = "Psychology 心理学系统学习平台：26 模块 192 章完整课程"
    cp = {"message": msg, "tree": tree_sha}
    if parent_sha:
        cp["parents"] = [parent_sha]
    st, cj = req("POST", f"/repos/{OWNER}/{REPO}/git/commits", cp)
    if st not in (200, 201):
        print("COMMIT 失败:", st, cj.get("message")); sys.exit(1)
    commit_sha = cj["sha"]
    print("commit:", commit_sha[:10])

    # 5. 创建/更新 ref
    if parent_sha:
        st, rj = req("PATCH", f"/repos/{OWNER}/{REPO}/git/refs/heads/main", {"sha": commit_sha, "force": True})
    else:
        st, rj = req("POST", f"/repos/{OWNER}/{REPO}/git/refs", {"ref": "refs/heads/main", "sha": commit_sha})
    if st not in (200, 201):
        print("REF 失败:", st, rj); sys.exit(1)
    print("分支 main ->", commit_sha[:10])

    # 6. 启用 GitHub Pages
    st, pj = req("GET", f"/repos/{OWNER}/{REPO}/pages")
    if st == 200:
        print("Pages 已存在:", pj.get("html_url"))
        st, pj = req("PUT", f"/repos/{OWNER}/{REPO}/pages", {"source": {"branch": "main", "path": "/"}})
        print("更新 Pages:", st)
    else:
        st, pj = req("POST", f"/repos/{OWNER}/{REPO}/pages",
                     {"source": {"branch": "main", "path": "/"}})
        print("创建 Pages:", st)
        if st not in (200, 201):
            print("  响应:", json.dumps(pj, ensure_ascii=False)[:300])
    print("DONE")

if __name__ == "__main__":
    main()
