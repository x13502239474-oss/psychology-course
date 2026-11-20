/* ============================================================
   Psychology · 应用主逻辑
   路由 / 视图渲染 / 目录 / 搜索 / 主题 / 进度
   ============================================================ */
(function(){
"use strict";

const META = window.PSY_META || {parts:[],modules:[]};
const CONTENT = window.PSY_CONTENT || {};
const MODULES = META.modules;
const PARTS = META.parts;
const byId = {};
MODULES.forEach(m=>byId[m.id]=m);
const partById = {};
PARTS.forEach(p=>partById[p.id]=p);

const app = document.getElementById('app');
const $ = s=>document.querySelector(s);
const esc = s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- 主题 ---------- */
const THEME_KEY='psy_theme';
function initTheme(){
  let t=null; try{t=localStorage.getItem(THEME_KEY)}catch(e){}
  if(!t){ t = window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark':'light'; }
  document.documentElement.setAttribute('data-theme',t);
  updateThemeColor();
}
function toggleTheme(){
  const cur=document.documentElement.getAttribute('data-theme');
  const next=cur==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme',next);
  try{localStorage.setItem(THEME_KEY,next)}catch(e){}
  updateThemeColor();
  toast(next==='dark'?'已切换到深色阅读模式':'已切换到浅色阅读模式');
}
function updateThemeColor(){
  const m=document.querySelector('meta[name="theme-color"]');
  if(m) m.setAttribute('content',document.documentElement.getAttribute('data-theme')==='dark'?'#161b22':'#f4f6f8');
}

/* ---------- 图标 ---------- */
const ICON={
  brain:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M24 8c-4 0-6.6 2.6-6.6 5.9 0 2 .9 3.6 2.4 4.6-3.2.9-5.4 3.7-5.4 6.9 0 2.1 1 3.9 2.7 5-.2 3.5 2.2 6.9 4.5 6.9 1.2 0 2.2-.7 3-1.7.8 1 1.8 1.7 3 1.7 2.3 0 4.7-3.4 4.5-6.9 1.7-1.1 2.7-2.9 2.7-5 0-3.2-2.2-6-5.4-6.9 1.5-1 2.4-2.6 2.4-4.6C30.6 10.6 28 8 24 8Z" stroke-linejoin="round"/><path d="M24 8v28M17.5 22.5c2.5 2 5 2 6.5 1M30.5 22.5c-2.5 2-5 2-6.5 1M18 32c3 2 9 2 12 0" stroke-linecap="round"/></svg>`,
  social:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="17" cy="16" r="6"/><circle cx="34" cy="20" r="5"/><circle cx="20" cy="36" r="5.5"/><circle cx="36" cy="35" r="4"/><path d="M22.5 14.5c2.5-1 5-1 6.5.5M21 21c1 4 1 8-.5 10M30 24.5c1 3.5 2.5 7 4 8" stroke-linecap="round"/></svg>`,
  cog:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M24 6v6M24 36v6M6 24h6M36 24h6M11 11l4.2 4.2M32.8 32.8 37 37M37 11l-4.2 4.2M15.2 32.8 11 37" stroke-linecap="round"/><circle cx="24" cy="24" r="10"/><circle cx="24" cy="24" r="4"/><path d="M24 14v6M24 28v6M14 24h6M28 24h6"/></svg>`,
  book:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Z" stroke-linejoin="round"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5A2.5 2.5 0 0 1 4 20.5Z"/></svg>`,
  search:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="10.8" cy="10.8" r="6.3"/><path d="m15.5 15.5 4.2 4.2" stroke-linecap="round"/></svg>`,
  layers:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m12 3 9 5-9 5-9-5 9-5Z" stroke-linejoin="round"/><path d="m3 13 9 5 9-5M3 17l9 5 9-5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  quote:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M9 7H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h3v-3H6M19 7h-4a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h3v-3h-2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  arrow:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  phone:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M10 18h4" stroke-linecap="round"/></svg>`
};
const TRACK_ICON={P1:ICON.brain,P2:ICON.social,P3:ICON.cog};

/* ---------- 路由 ---------- */
function parseRoute(){
  const h=(location.hash||'').replace(/^#\/?/,'');
  if(!h) return {view:'home'};
  const seg=h.split('/').filter(Boolean).map(decodeURIComponent);
  if(seg[0]==='catalog') return {view:'catalog',part:seg[1]||null};
  if(seg[0]==='m' && seg[1]){
    const mid=seg[1].toUpperCase();
    const ch=seg[2]?parseInt(seg[2],10)-1:0;
    return {view:'read',mid,ch:Math.max(0,ch)};
  }
  return {view:'home'};
}
function go(hash){ location.hash=hash; }
function scrollTop(){ window.scrollTo({top:0,behavior:'auto'}); }

/* ---------- 渲染：首页 ---------- */
function renderHome(){
  const heroArt=`<div class="hero-art" aria-hidden="true">
  <svg viewBox="0 0 400 400">
    <circle class="ring" cx="200" cy="200" r="150"/>
    <circle class="ring-dash" cx="200" cy="200" r="118"/>
    <circle class="ring" cx="200" cy="200" r="86" opacity=".6"/>
    <g class="link">
      <path d="M200 200 118 128M200 200 282 138M200 200 108 232M200 200 292 244M200 200 200 96M200 200 200 310M200 200 150 300M200 200 258 300"/>
      <path d="M118 128 108 232M282 138 292 244M200 96 118 128M200 96 282 138M108 232 150 300M292 244 258 300"/>
    </g>
    <circle class="node" cx="200" cy="200" r="13"/>
    <circle class="node-t" cx="118" cy="128" r="7"/><circle class="node-l" cx="282" cy="138" r="7"/>
    <circle class="node-l" cx="108" cy="232" r="6"/><circle class="node-t" cx="292" cy="244" r="6"/>
    <circle class="node" cx="200" cy="96" r="5"/><circle class="node-t" cx="200" cy="310" r="6"/>
    <circle class="node-l" cx="150" cy="300" r="4.5"/><circle class="node" cx="258" cy="300" r="4.5"/>
  </svg></div>`;

  const tracks=PARTS.map(p=>{
    const count=MODULES.filter(m=>m.part===p.id).length;
    return `<article class="track" style="--accent:${p.accent}" data-part="${p.id}" tabindex="0" role="link">
      <div class="track-icon">${TRACK_ICON[p.id]||ICON.layers}</div>
      <div class="track-body">
        <span class="en">${esc(p.en)}</span>
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.desc)}</p>
      </div>
      <div class="track-meta"><span class="num">${String(count).padStart(2,'0')}</span><span class="unit">MODULES</span></div>
    </article>`;
  }).join('');

  const features=[
    {ico:ICON.layers,t:'按学科逻辑重组',d:'不照搬任何一本书的目录。三本教材精华按心理学自身的知识脉络重新组织，层层递进。'},
    {ico:ICON.quote,t:'经典研究读全貌',d:'每个重要实验都写清研究问题、设计、过程、结果与局限，而不只是一个名字。'},
    {ico:ICON.phone,t:'为长时间阅读而设计',d:'移动端优先，舒适的排版与克制的视觉，让手机上的连续阅读也自然流畅。'}
  ].map(f=>`<div class="feature"><div class="feature-ico">${f.ico}</div><h4>${f.t}</h4><p>${f.d}</p></div>`).join('');

  app.innerHTML=`
  <section class="home-hero"><div class="home-hero-inner">
    <div class="hero-copy">
      <span class="hero-eyebrow">A Systematic Course in Psychology</span>
      <h1 class="hero-title">Psychology<span class="zh">心理学系统学习平台</span></h1>
      <p class="hero-desc">一套面向零基础学习者的完整自学课程。从心理学的科学身份出发，穿过<strong>生物机制、认知过程、社会发展与临床实践</strong>，逐步建立起系统、严谨的心理学知识体系——达到大学本科入门课程的深度。</p>
      <div class="hero-cta">
        <a class="btn btn-primary" href="#catalog">浏览完整课程 ${ICON.arrow}</a>
        <button class="btn btn-ghost" id="heroSearch">${ICON.search} 搜索知识点</button>
      </div>
    </div>
    ${heroArt}
  </div></section>

  <section class="home-section">
    <div class="section-head">
      <div class="section-kicker">Three Learning Tracks</div>
      <h2 class="section-title">三条学习路径</h2>
      <p class="section-sub">共 ${MODULES.length} 个模块，从基础到专业分支，循序渐进。</p>
    </div>
    <div class="tracks">${tracks}</div>
  </section>

  <section class="home-section" style="padding-top:0">
    <div class="section-head"><div class="section-kicker">Why This Course</div><h2 class="section-title">这门课如何帮你学习</h2></div>
    <div class="feature-grid">${features}</div>
    <div class="home-note">
      <b>关于准确性：</b>课程以三本经典教材为主要知识依据，用重新组织语言的方式呈现，并标明中英文专业术语。我们严格区分科学证据与个人经验、相关关系与因果关系、临床诊断与日常情绪；对尚无定论的理论呈现学术分歧，不把单一观点包装成真理。心理障碍相关内容采用中立、非污名化的表述，<b>本课程不承担任何诊断功能</b>。
    </div>
  </section>

  <footer class="site-footer">
    <p class="src">核心参考教材：Myers &amp; DeWall《Psychology》· Myers &amp; Twenge《Social Psychology》· Goldstein &amp; Hale《Cognitive Psychology》</p>
    <p>Psychology · 心理学系统学习平台　·　为长期、系统的自学而建</p>
  </footer>`;

  app.querySelectorAll('.track').forEach(el=>{
    const open=()=>go('#catalog/'+el.dataset.part);
    el.addEventListener('click',open);
    el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
  });
  $('#heroSearch').addEventListener('click',openSearch);
}

/* ---------- 渲染：目录页 ---------- */
function renderCatalog(partFilter){
  const partsToShow = partFilter ? PARTS.filter(p=>p.id===partFilter) : PARTS;
  const partsHtml=partsToShow.map(p=>{
    const mods=MODULES.filter(m=>m.part===p.id);
    const cards=mods.map(m=>{
      const ready=!!CONTENT[m.id];
      return `<a class="module-card" style="--accent:${p.accent}" href="#m/${m.id}">
        <div class="mc-top"><span class="mc-num">${String(m.num).padStart(2,'0')}</span><span class="mc-en">${esc(m.en)}</span></div>
        <h3>${esc(m.title)}</h3><p>${esc(m.desc)}</p>
        <div class="mc-foot"><span>${m.chapters.length} 章</span><span class="mc-dot"></span><span>模块 ${m.num}</span>
          <span class="status-tag ${ready?'status-ready':'status-soon'}">${ready?'已上线':'编写中'}</span></div>
      </a>`;
    }).join('');
    return `<section class="part-block">
      <div class="part-head"><span class="pnum">${esc(p.label)}</span><h2>${esc(p.title)}</h2><span class="pen">${esc(p.en)}</span></div>
      <p class="part-desc">${esc(p.desc)}</p>
      <div class="module-grid">${cards}</div>
    </section>`;
  }).join('');

  app.innerHTML=`<div class="catalog-page">
    <div class="page-head">
      <div class="crumb"><a href="#">首页</a> / 课程目录${partFilter?' / '+esc(partById[partFilter].title):''}</div>
      <h1>课程目录</h1>
      <p class="lead">完整的知识体系地图。点击任意模块进入学习，模块内章节可连续阅读、前后切换。</p>
    </div>
    ${partsHtml}
    <footer class="site-footer"><p>Psychology · 心理学系统学习平台</p></footer>
  </div>`;
}

/* ---------- 渲染：阅读页 ---------- */
function renderRead(mid,chIdx){
  const m=byId[mid];
  if(!m){ renderNotFound(); return; }
  const data=CONTENT[mid];
  const part=partById[m.part];
  const chapters=m.chapters;
  if(chIdx>=chapters.length) chIdx=chapters.length-1;

  if(!data){
    app.innerHTML=`<div class="catalog-page"><div class="empty-state">
      <div class="es-ico">${ICON.book}</div><h3>「${esc(m.title)}」正在编写中</h3>
      <p>这个模块的内容仍在深度撰写。请浏览其他已上线模块。</p>
      <p style="margin-top:20px"><a class="btn btn-ghost" href="#catalog">返回课程目录</a></p>
    </div></div>`;
    return;
  }

  // 正文优先用构建后的章节；若数量不足则按大纲标题生成占位标题（保持目录一致）
  const bodyChapters = data.chapters || [];
  const chapterHtml=chapters.map((metaCh,i)=>{
    const built=bodyChapters[i];
    const title=built&&built.title?built.title:metaCh.t;
    const html=built&&built.html?built.html:'<p>本章内容正在编写中。</p>';
    return `<section class="chapter" id="ch-${i+1}">
      <div class="chapter-head"><span class="chapter-num">${i+1}</span><h2 class="chapter-title">${esc(title)}</h2></div>
      <div class="prose">${html}</div>
    </section>`;
  }).join('');

  const summary=data.summary?`<div class="module-summary">${data.summary}</div>`:'';

  // 页内目录
  const tocItems=chapters.map((c,i)=>`<a class="toc-item" data-ch="${i}" href="#ch-${i+1}">${i+1}. ${esc(c.t)}</a>`).join('');

  // 前后翻页（跨模块连续）
  const flat=MODULES.flatMap(mm=>mm.chapters.map((c,ci)=>({mid:mm.id,ci,ct:c.t,mt:mm.title})));
  const flatIdx=flat.findIndex(x=>x.mid===mid&&x.ci===chIdx);
  const prev=flatIdx>0?flat[flatIdx-1]:null;
  const next=flatIdx<flat.length-1?flat[flatIdx+1]:null;
  const pager=
    `<nav class="read-pager">
      ${prev?`<a class="pager-btn prev" href="#m/${prev.mid}/${prev.ci+1}"><span class="pl">← 上一篇</span><span class="pt">${esc(prev.ct)}</span></a>`:'<span></span>'}
      ${next?`<a class="pager-btn next" href="#m/${next.mid}/${next.ci+1}"><span class="pl">下一篇 →</span><span class="pt">${esc(next.ct)}</span></a>`:'<span></span>'}
    </nav>`;

  app.innerHTML=`<div class="read-layout">
    <div class="read-top">
      <div class="read-crumb"><a href="#">首页</a><span class="sep">/</span><a href="#catalog">课程目录</a><span class="sep">/</span><a href="#catalog/${part.id}">${esc(part.title)}</a><span class="sep">/</span><span>模块 ${m.num}</span></div>
      <div class="read-kicker">模块 ${String(m.num).padStart(2,'0')} · ${esc(m.en)}</div>
      <h1 class="read-h1">${esc(m.title)}</h1>
      <p class="read-lead">${esc(m.desc)}</p>
    </div>
    <div class="read-grid">
      <div class="read-main">
        ${data.intro?`<div class="article-intro">${data.intro}</div>`:''}
        ${chapterHtml}
        ${summary}
        ${pager}
      </div>
      <aside class="read-aside"><div class="toc-title">本章目录</div><nav class="toc-list">${tocItems}</nav></aside>
    </div>
  </div>`;

  // 页内目录点击平滑滚动（用原生 scrollIntoView）
  app.querySelectorAll('.toc-item').forEach(a=>{
    a.addEventListener('click',e=>{
      e.preventDefault();
      const el=document.getElementById(a.getAttribute('href').slice(1));
      if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });
  updateActiveToc();
  // 高亮当前抽屉项
  drawerCurrent=mid;
}

function renderNotFound(){
  app.innerHTML=`<div class="catalog-page"><div class="empty-state"><div class="es-ico">${ICON.search}</div><h3>没有找到这个页面</h3><p><a href="#catalog" style="color:var(--navy)">返回课程目录</a></p></div></div>`;
}

/* ---------- 路由入口 ---------- */
let drawerCurrent=null;
function route(){
  const r=parseRoute();
  closeDrawer();
  if(r.view==='home') renderHome();
  else if(r.view==='catalog') renderCatalog(r.part);
  else if(r.view==='read') renderRead(r.mid,r.ch);
  else renderHome();
  scrollTop();
  updateProgress();
  buildDrawerNav();
  document.title = (r.view==='read'&&byId[r.mid]) ? byId[r.mid].title+' · Psychology' :
                   (r.view==='catalog' ? '课程目录 · Psychology' : 'Psychology · 心理学系统学习平台');
}

/* ---------- 目录抽屉 ---------- */
const drawer=$('#drawer'), backdrop=$('#drawerBackdrop');
function openDrawer(){ drawer.classList.add('open');backdrop.classList.add('open');document.body.style.overflow='hidden'; }
function closeDrawer(){ drawer.classList.remove('open');backdrop.classList.remove('open');document.body.style.overflow=''; }

function buildDrawerNav(filter){
  const nav=$('#drawerNav');
  const q=(filter||'').trim().toLowerCase();
  let found=0;
  const html=PARTS.map(p=>{
    const mods=MODULES.filter(m=>m.part===p.id).filter(m=>{
      if(!q) return true;
      if(m.title.toLowerCase().includes(q)||m.en.toLowerCase().includes(q)||String(m.num)===q) return true;
      return m.chapters.some(c=>c.t.toLowerCase().includes(q));
    });
    if(!mods.length) return '';
    const mHtml=mods.map(m=>{
      let chaps=m.chapters;
      if(q && !(m.title.toLowerCase().includes(q)||m.en.toLowerCase().includes(q))){
        chaps=chaps.filter(c=>c.t.toLowerCase().includes(q));
      }
      found+=chaps.length||1;
      const expanded = q || m.id===drawerCurrent;
      const cHtml=chaps.map((c,i)=>`<a class="dnav-chap ${m.id===drawerCurrent&&i===0?'active':''}" href="#m/${m.id}/${i+1}">${i+1}. ${esc(c.t)}</a>`).join('');
      return `<div class="dnav-module ${expanded?'expanded':''}" data-mid="${m.id}">
        <div class="dnav-m-head"><span class="dn-num">${String(m.num).padStart(2,'0')}</span><span class="dn-title">${esc(m.title)}</span>
          <svg class="dn-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 6 6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        <div class="dnav-chapters">${cHtml}</div>
      </div>`;
    }).join('');
    return `<div class="dnav-part"><div class="dnav-part-h">${esc(p.title)}</div>${mHtml}</div>`;
  }).join('');
  nav.innerHTML=html||`<div class="dnav-empty">没有匹配的模块或章节</div>`;
  nav.querySelectorAll('.dnav-m-head').forEach(h=>{
    h.addEventListener('click',()=>h.parentElement.classList.toggle('expanded'));
  });
}

/* ---------- 全站搜索 ---------- */
const searchOverlay=$('#searchOverlay'), searchInput=$('#searchInput'), searchResults=$('#searchResults'), searchMeta=$('#searchMeta');
let searchIndex=null;
function buildSearchIndex(){
  if(searchIndex) return searchIndex;
  const idx=[];
  MODULES.forEach(m=>{
    const data=CONTENT[m.id];
    m.chapters.forEach((c,i)=>{
      let raw='';
      if(data&&data.chapters&&data.chapters[i]) raw=stripHtml(data.chapters[i].html);
      idx.push({
        type:'chapter',mid:m.id,ci:i,
        title:c.t,
        path:`模块${m.num} · ${m.title} · 第${i+1}章`,
        text:raw,
        hay:(c.t+' '+(data&&data.chapters&&data.chapters[i]?stripHtml(data.chapters[i].html):'')).toLowerCase()
      });
    });
    // 模块级（导语+简介）
    idx.push({type:'module',mid:m.id,ci:0,title:m.title,path:`模块${m.num} · 模块总览`,text:(data&&data.intro?stripHtml(data.intro):'')+' '+m.desc,hay:(m.title+' '+m.en+' '+m.desc).toLowerCase()});
    // 概念/实验块单独索引，便于术语检索
    if(data&&data.chapters){
      data.chapters.forEach((bc,i)=>{
        const blocks=extractBlocks(bc.html);
        blocks.forEach(b=>idx.push({type:b.kind,mid:m.id,ci:i,title:b.title,path:`模块${m.num} · ${m.title} · 第${i+1}章`,text:stripHtml(b.html),hay:(b.title+' '+stripHtml(b.html)).toLowerCase()}));
      });
    }
  });
  searchIndex=idx;
  return idx;
}
function stripHtml(html){ const d=document.createElement('div');d.innerHTML=html||'';return d.textContent.replace(/\s+/g,' ').trim(); }
function extractBlocks(html){
  const out=[];const div=document.createElement('div');div.innerHTML=html||'';
  div.querySelectorAll('.block').forEach(b=>{
    const kind=[...b.classList].find(c=>c.startsWith('block-'))?.replace('block-','')||'note';
    const h4=b.querySelector('.block-head h4');
    out.push({kind,title:h4?h4.textContent:'',html:b.innerHTML});
  });
  return out;
}
function openSearch(){ searchOverlay.classList.add('open');searchOverlay.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';setTimeout(()=>searchInput.focus(),60); }
function closeSearch(){ searchOverlay.classList.remove('open');searchOverlay.setAttribute('aria-hidden','true');document.body.style.overflow=''; }

const TYPE_LABEL={chapter:'章节',module:'模块',concept:'核心概念',research:'研究案例',compare:'理论对照',scholar:'学者档案',note:'学术提醒',figure:'机制图解',summary:'知识地图'};
let searchTimer=null;
function doSearch(q){
  q=q.trim();
  if(!q){ searchMeta.textContent='输入关键词开始检索（支持概念、学者、实验名称）';searchResults.innerHTML='';return; }
  const idx=buildSearchIndex();
  const terms=q.toLowerCase().split(/\s+/).filter(Boolean);
  const scored=[];
  idx.forEach(it=>{
    let score=0;let ok=true;
    terms.forEach(t=>{ if(it.hay.includes(t)){ score+= it.title.toLowerCase().includes(t)?5:1; } else ok=false; });
    if(ok&&score>0) scored.push({it,score});
  });
  scored.sort((a,b)=>b.score-a.score);
  const hits=scored.slice(0,60);
  searchMeta.textContent=`找到 ${scored.length} 条结果${scored.length>60?'，显示前 60 条':''}`;
  if(!hits.length){ searchResults.innerHTML=`<div class="sr-empty">没有找到与「${esc(q)}」相关的内容<br>试试更简短的关键词，如「工作记忆」「从众」「锚定」</div>`;return; }
  searchResults.innerHTML=hits.map(({it})=>{
    const context=highlight(it.text||it.title,terms);
    return `<div class="sr-item" data-mid="${it.mid}" data-ci="${it.ci}">
      <div class="sr-type">${TYPE_LABEL[it.type]||'内容'} · ${esc(it.path)}</div>
      <div class="sr-title">${esc(it.title)}</div>
      <div class="sr-context">${context}</div>
    </div>`;
  }).join('');
  searchResults.querySelectorAll('.sr-item').forEach(el=>{
    el.addEventListener('click',()=>{ closeSearch();go(`#m/${el.dataset.mid}/${parseInt(el.dataset.ci,10)+1}`); });
  });
}
function highlight(text,terms){
  let s=esc((text||'').slice(0,220));
  terms.forEach(t=>{ if(!t) return; const re=new RegExp('('+t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','ig'); s=s.replace(re,'<mark>$1</mark>'); });
  return s;
}

/* ---------- 滚动相关 ---------- */
function updateProgress(){
  const h=document.documentElement;
  const max=h.scrollHeight-h.clientHeight;
  const p=max>0?Math.min(100,Math.max(0,h.scrollTop/max*100)):0;
  $('#progressFill').style.width=p+'%';
  const r=document.getElementById('progressRail');
  if(r) r.style.display=parseRoute().view==='read'?'block':'none';
  $('#toTop').classList.toggle('show',h.scrollTop>500);
}
function updateActiveToc(){
  const chapters=[...document.querySelectorAll('.chapter')];
  if(!chapters.length) return;
  const items=[...document.querySelectorAll('.toc-item')];
  let active=0;
  const line=window.scrollY+window.innerHeight*0.28;
  chapters.forEach((c,i)=>{ if(c.offsetTop<=line) active=i; });
  items.forEach((a,i)=>a.classList.toggle('active',i===active));
}

/* ---------- Toast ---------- */
let toastTimer=null;
function toast(msg){ const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),1900); }

/* ---------- 事件绑定 ---------- */
function bindEvents(){
  $('#brandLink').addEventListener('click',e=>{/* hash 路由自己处理 */});
  $('#themeBtn').addEventListener('click',toggleTheme);
  $('#menuBtn').addEventListener('click',openDrawer);
  $('#drawerClose').addEventListener('click',closeDrawer);
  backdrop.addEventListener('click',closeDrawer);
  $('#searchBtnTop').addEventListener('click',openSearch);
  $('#searchClose').addEventListener('click',closeSearch);
  searchOverlay.addEventListener('click',e=>{if(e.target===searchOverlay)closeSearch();});
  searchInput.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>doSearch(searchInput.value),120);});
  $('#drawerNavFilter').addEventListener('input',e=>buildDrawerNav(e.target.value));
  $('#toTop').addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));

  window.addEventListener('hashchange',route);
  window.addEventListener('scroll',()=>{ updateProgress();updateActiveToc(); },{passive:true});
  window.addEventListener('resize',updateProgress);
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      if(searchOverlay.classList.contains('open')) closeSearch();
      else if(drawer.classList.contains('open')) closeDrawer();
    }
    if((e.ctrlKey||e.metaKey)&&e.key==='k'){ e.preventDefault();openSearch(); }
  });

  // 阅读页左右方向键翻章
  document.addEventListener('keydown',e=>{
    if(parseRoute().view!=='read') return;
    if(searchOverlay.classList.contains('open')||drawer.classList.contains('open')) return;
    if(document.activeElement&&/INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
      const r=parseRoute();
      const flat=MODULES.flatMap(mm=>mm.chapters.map((c,ci)=>({mid:mm.id,ci})));
      const i=flat.findIndex(x=>x.mid===r.mid&&x.ci===r.ch);
      const t=e.key==='ArrowLeft'?flat[i-1]:flat[i+1];
      if(t) go(`#m/${t.mid}/${t.ci+1}`);
    }
  });
}

/* ---------- 启动 ---------- */
initTheme();
bindEvents();
route();

})();
