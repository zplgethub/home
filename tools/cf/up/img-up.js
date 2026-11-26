// img-up: B2 私有桶图床 Worker
// 功能：上传(带密钥+限流) / 列表 / 图库 / 删除 / 直链(边缘缓存)
const enc = new TextEncoder();
const RL = new Map(); // 单实例限流计数（尽力而为）

function toHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function sha256Hex(data) {
  const d = typeof data === "string" ? enc.encode(data) : data;
  return toHex(await crypto.subtle.digest("SHA-256", d));
}
async function hmac(key, data) {
  const k = typeof key === "string" ? enc.encode(key) : key;
  const c = await crypto.subtle.importKey("raw", k, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const d = typeof data === "string" ? enc.encode(data) : data;
  return new Uint8Array(await crypto.subtle.sign("HMAC", c, d));
}
function rateAllow(ip, limit = 10, winMs = 60000) {
  const now = Date.now();
  const r = RL.get(ip) || { c: 0, t: now };
  if (now - r.t > winMs) { r.c = 0; r.t = now; }
  r.c++; RL.set(ip, r);
  if (RL.size > 5000) RL.clear();
  return r.c <= limit;
}
async function signRequest(env, method, key, body, query = "") {
  const host = env.B2_ENDPOINT;
  const region = env.B2_REGION;
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = await sha256Hex(body || "");
  const objectPath = key ? "/" + key.split("/").map(encodeURIComponent).join("/") : "";
  const canonicalUri = "/" + env.B2_BUCKET + objectPath;
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [method, canonicalUri, query, canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, await sha256Hex(canonicalRequest)].join("\n");
  let k = await hmac("AWS4" + env.B2_APP_KEY, dateStamp);
  k = await hmac(k, region);
  k = await hmac(k, "s3");
  k = await hmac(k, "aws4_request");
  const signature = toHex(await hmac(k, stringToSign));
  return {
    url: `https://${host}${canonicalUri}${query ? "?" + query : ""}`,
    headers: {
      "x-amz-date": amzDate,
      "x-amz-content-sha256": payloadHash,
      Authorization:
        `AWS4-HMAC-SHA256 Credential=${env.B2_KEY_ID}/${scope}, ` +
        `SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
  };
}

const PAGE = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>图片上传</title>
<style>
 body{font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:36px auto;padding:0 18px;color:#0f172a;background:#f8fafc}
 h1{font-size:20px} p{color:#64748b;font-size:14px}
 input,button{width:100%;box-sizing:border-box;padding:12px;border-radius:8px;border:1px solid #cbd5e1;font-size:15px;margin-bottom:12px;background:#fff}
 button{background:#0ea5e9;color:#fff;border:0;font-weight:600}button:disabled{opacity:.5}
 #out{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px;font-size:13px;word-break:break-all;display:none}
 img{max-width:100%;border-radius:8px;margin-top:10px;display:none}
</style></head><body>
<h1>xzqf 图床 · 手机上传</h1><p>填入上传密钥，选择图片，自动返回直链。</p>
<input id="token" placeholder="上传密钥" autocomplete="off">
<input id="file" type="file" accept="image/*">
<button id="go">上传</button><div id="out"></div><img id="preview">
<p style="text-align:center"><a href="/g" style="color:#0284c7;text-decoration:none;font-size:14px">查看全部图片 →</a></p>
<script>
const $=id=>document.getElementById(id);
$('token').value=localStorage.getItem('up_token')||'';
$('go').onclick=async()=>{
  const token=$('token').value.trim();const f=$('file').files[0];
  if(!token||!f)return alert('先填密钥并选择图片');
  localStorage.setItem('up_token',token);$('go').disabled=true;$('go').textContent='上传中...';
  try{
    const r=await fetch('/upload?name='+encodeURIComponent(f.name),{method:'POST',headers:{'x-upload-token':token,'content-type':f.type||'application/octet-stream'},body:f});
    const j=await r.json();if(!r.ok)throw new Error(j.error||('HTTP '+r.status));
    $('out').style.display='block';$('out').innerHTML='上传成功：<br><a href="'+j.url+'" target="_blank">'+j.url+'</a>';
    const p=$('preview');p.src=j.url;p.style.display='block';
  }catch(e){$('out').style.display='block';$('out').textContent='失败：'+e.message;}
  $('go').disabled=false;$('go').textContent='上传';
};
</script></body></html>`;

const GALLERY = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>图库 · xzqf</title>
<style>
 body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;color:#0f172a}
 header{padding:14px 18px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #e2e8f0;background:#fff;position:sticky;top:0;z-index:5}
 h1{font-size:17px;margin:0}#meta{color:#64748b;font-size:13px}
 #grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;padding:14px}
 .card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;cursor:pointer}
 .card img{width:100%;height:130px;object-fit:cover;display:block;background:#f1f5f9}
 .ph{height:130px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:12px;background:#f1f5f9}
 .m{padding:8px}.m b{display:block;font-size:12px;font-weight:500;word-break:break-all;line-height:1.35}.m span{font-size:11px;color:#94a3b8}
 #detail{position:fixed;inset:0;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:16px;z-index:9}
 .hide{display:none!important}.panel{background:#fff;border-radius:12px;max-width:640px;width:100%;max-height:90vh;overflow:auto;padding:16px}
 .panel img{max-width:100%;border-radius:8px;display:block;margin-bottom:12px}
 .row{margin-bottom:10px}.row label{font-size:12px;color:#64748b;display:block;margin-bottom:4px}
 .row input{width:100%;box-sizing:border-box;padding:8px;font-size:12px;border:1px solid #cbd5e1;border-radius:6px;background:#f8fafc}
 button{border:0;border-radius:8px;padding:10px 14px;font-size:14px;font-weight:600;cursor:pointer}
 .b{background:#0ea5e9;color:#fff}.d{background:#ef4444;color:#fff}.g{background:#e2e8f0;color:#0f172a}
 #ask{position:fixed;inset:0;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;z-index:10}
 #ask .box{background:#fff;padding:18px;border-radius:12px;width:320px}
 #ask input{width:100%;box-sizing:border-box;padding:10px;border:1px solid #cbd5e1;border-radius:8px;margin:10px 0;font-size:14px}
</style></head><body>
<header><h1>图库 · xzqf</h1><span id="meta"></span><a href="/" style="margin-left:auto;font-size:13px;color:#0284c7;text-decoration:none">上传</a></header>
<div id="grid"></div>
<div id="detail" class="hide"><div class="panel">
 <img id="dimg" alt=""><div id="dmeta" style="font-size:12px;color:#64748b;margin-bottom:10px"></div>
 <div class="row"><label>直链</label><input id="dlink" readonly></div>
 <div class="row"><label>Markdown</label><input id="dmd" readonly></div>
 <div class="row"><label>HTML</label><input id="dhtml" readonly></div>
 <div style="display:flex;gap:8px;justify-content:flex-end">
  <button class="g" id="copy1">复制直链</button><button class="g" id="close">关闭</button><button class="d" id="del">删除</button>
 </div></div></div>
<div id="ask" class="hide"><div class="box"><b>输入上传密钥</b><div style="font-size:12px;color:#64748b">仅保存在本机浏览器</div>
 <input id="tk" placeholder="上传密钥"><button class="b" id="gotoken" style="width:100%">进入</button></div></div>
<script>
var tok=new URLSearchParams(location.search).get('token')||localStorage.getItem('up_token')||'';var items=[];
function fmt(n){return n>1048576?(n/1048576).toFixed(1)+' MB':(n/1024).toFixed(1)+' KB';}
function isImg(k){return /\\.(jpe?g|png|gif|webp|svg|avif|bmp|ico)$/i.test(k);}
function render(){var g=document.getElementById('grid');g.innerHTML='';document.getElementById('meta').textContent=items.length+' 个文件';
 items.forEach(function(it){var d=document.createElement('div');d.className='card';
 var inner=isImg(it.key)?'<img loading="lazy" src="'+it.url+'">':'<div class="ph">FILE</div>';
 d.innerHTML=inner+'<div class="m"><b>'+it.key+'</b><span>'+fmt(it.size)+' · '+it.lastModified.slice(0,10)+'</span></div>';
 d.onclick=function(){show(it);};g.appendChild(d);});}
function show(it){document.getElementById('detail').classList.remove('hide');var img=document.getElementById('dimg');
 img.src=it.url;img.style.display=isImg(it.key)?'block':'none';
 document.getElementById('dmeta').textContent=it.key+' · '+fmt(it.size)+' · '+it.lastModified;
 document.getElementById('dlink').value=it.url;document.getElementById('dmd').value='![]('+it.url+')';
 document.getElementById('dhtml').value='<img src="'+it.url+'" alt="">';document.getElementById('del').onclick=function(){del(it);};}
function del(it){if(!confirm('确定删除 '+it.key+' ？'))return;
 fetch('/delete?key='+encodeURIComponent(it.key),{method:'POST',headers:{'x-upload-token':tok}}).then(function(r){return r.json();}).then(function(j){
 if(j.ok){items=items.filter(function(x){return x.key!==it.key;});render();document.getElementById('detail').classList.add('hide');}
 else alert('删除失败：'+(j.error||''));});}
function load(){fetch('/list?token='+encodeURIComponent(tok)).then(function(r){return r.json();}).then(function(j){items=j.items||[];render();}).catch(function(e){alert('加载失败：'+e);});}
document.getElementById('copy1').onclick=function(){navigator.clipboard.writeText(document.getElementById('dlink').value).then(function(){
 document.getElementById('copy1').textContent='已复制';setTimeout(function(){document.getElementById('copy1').textContent='复制直链';},1200);});};
document.getElementById('close').onclick=function(){document.getElementById('detail').classList.add('hide');};
document.getElementById('gotoken').onclick=function(){var v=document.getElementById('tk').value.trim();if(v){localStorage.setItem('up_token',v);tok=v;location.reload();}};
if(tok){document.getElementById('ask').classList.add('hide');load();}else{document.getElementById('ask').classList.remove('hide');}
</script></body></html>`;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}

const DOCS_ADMIN = `<!doctype html><html lang="zh"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>文档管理</title>
<style>
body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;max-width:860px;margin:0 auto;padding:32px 20px;color:#1f2937;background:#fafafa;line-height:1.6}
h1{font-size:22px;margin:0 0 4px}p.sub{color:#6b7280;font-size:13px;margin:0 0 20px}
.panel{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:18px 20px;margin-bottom:18px}
label{font-size:13px;color:#6b7280;display:block;margin:10px 0 4px}
input[type=password],input[type=text]{width:100%;box-sizing:border-box;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px}
select{padding:8px 10px;border:1px solid #d1d5db;border-radius:8px;font-size:14px}
button{background:#4B3FE3;color:#fff;border:none;border-radius:8px;padding:10px 18px;font-size:14px;cursor:pointer}
button.ghost{background:#fff;color:#4B3FE3;border:1px solid #4B3FE3}
button.del{background:#fff;color:#dc2626;border:1px solid #fca5a5;padding:4px 10px;font-size:12px}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{text-align:left;padding:8px 6px;border-bottom:1px solid #f0f0f0;word-break:break-all}
th{color:#6b7280;font-weight:500}
.tag{font-size:11px;border-radius:999px;padding:1px 8px;border:1px solid #d1d5db;color:#6b7280}
.tag.pri{border-color:#4B3FE3;color:#4B3FE3}
#msg{font-size:13px;color:#4B3FE3;min-height:20px;margin-top:8px}
a{color:#4B3FE3;text-decoration:none}
</style></head><body>
<h1>文档管理</h1>
<p class="sub">上传 / 删除 / 自动更新索引 · <a href="/" target="_blank">返回文档中心</a></p>

<div class="panel">
<label>上传密钥（保存在本机浏览器）</label>
<input type="password" id="tok" placeholder="粘贴上传密钥">
</div>

<div class="panel">
<label>选择文件（单文件 ≤ 25MB）</label>
<input type="file" id="file">
<label>访问级别</label>
<select id="scope"><option value="private">私有（需邮箱验证码）</option><option value="public">公开（任何人可读）</option></select>
<label>文件名（英文小写，不含扩展名也可，会自动补全）</label>
<input type="text" id="name" placeholder="例如 home-redesign-plan">
<button id="up" style="margin-top:12px">上传 / 覆盖</button>
<label style="margin-top:14px"><input type="checkbox" id="autoindex" checked style="width:auto"> 同时把文档加入索引页</label>
<div id="msg"></div>
</div>

<div class="panel">
<button class="ghost" id="reload">刷新列表</button>
<table><thead><tr><th>文档</th><th>级别</th><th>大小</th><th>操作</th></tr></thead><tbody id="rows"></tbody></table>
</div>

<script>
var tok=localStorage.getItem('up_tok')||'';document.getElementById('tok').value=tok;
function msg(t){document.getElementById('msg').textContent=t;}
function saveTok(){tok=document.getElementById('tok').value.trim();localStorage.setItem('up_tok',tok);}
function curName(){
  var n=document.getElementById('name').value.trim();
  var f=document.getElementById('file').files[0];
  if(!n&&f)n=f.name;
  if(n&&!/\\.[a-z0-9]+$/i.test(n)&&f){var m=/\\.[a-z0-9]+$/i.exec(f.name);if(m)n+=m[0];}
  return n;
}
document.getElementById('up').onclick=function(){
  saveTok();if(!tok)return msg('请先填上传密钥');
  var f=document.getElementById('file').files[0];if(!f)return msg('请选择文件');
  var scope=document.getElementById('scope').value;var name=curName();
  if(!name)return msg('请填写文件名');
  var btn=this;btn.disabled=true;msg('上传中…');
  fetch('/upload?name='+scope+'/'+encodeURIComponent(name),{method:'POST',headers:{'x-upload-token':tok,'content-type':f.type||'application/octet-stream'},body:f})
  .then(function(r){return r.json();}).then(function(j){
    btn.disabled=false;
    if(!j.ok)return msg('失败：'+(j.error||''));
    msg('成功：'+j.url);
    if(document.getElementById('autoindex').checked)return addIndex(scope,name,j.url);
    load();
  }).catch(function(e){btn.disabled=false;msg('失败：'+e);});
};
function addIndex(scope,name,url){
  msg('更新索引…');
  return fetch('/index-source').then(function(r){return r.text();}).then(function(html){
    var title=name.replace(/\\.[a-z0-9]+$/i,'');
    var item='<a class="item" href="/'+scope+'/'+name+'">\\n  <div class="t">'+title+'<span class="tag">'+scope+'</span></div>\\n  <div class="d">上传于 '+new Date().toLocaleDateString()+'</div>\\n</a>\\n\\n';
    if(html.indexOf('/'+scope+'/'+name)===-1)html=html.replace('<footer>',item+'<footer>');
    return fetch('/update-index',{method:'POST',headers:{'x-upload-token':tok,'content-type':'text/html; charset=utf-8'},body:html});
  }).then(function(r){return r.json();}).then(function(j){msg(j.ok?'完成，索引已更新':'索引更新失败：'+(j.error||''));load();});
}
function load(){
  saveTok();if(!tok)return;
  fetch('/list-docs?token='+encodeURIComponent(tok)).then(function(r){return r.json();}).then(function(j){
    var rows=document.getElementById('rows');rows.innerHTML='';
    (j.items||[]).forEach(function(it){
      var tr=document.createElement('tr');
      var level=it.key.split('/')[0];
      tr.innerHTML='<td><a href="https://docs.xzqf.nyc.mn/'+it.key+'" target="_blank">'+it.key.split('/').slice(1).join('/')+'</a></td>'
        +'<td><span class="tag '+(level==='private'?'pri':'')+'">'+level+'</span></td>'
        +'<td>'+(it.size/1024).toFixed(0)+' KB</td>'
        +'<td><button class="del">删除</button></td>';
      tr.querySelector('.del').onclick=function(){
        if(!confirm('确定删除 '+it.key+' ？'))return;
        fetch('/delete?key='+encodeURIComponent(it.key),{method:'POST',headers:{'x-upload-token':tok}}).then(function(r){return r.json();}).then(function(j){msg(j.ok?'已删除（公开文档缓存最长 1 小时后完全失效）':'删除失败');load();});
      };
      rows.appendChild(tr);
    });
  });
}
document.getElementById('reload').onclick=load;
if(tok)load();
</script></body></html>`;

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const authToken = req.headers.get("x-upload-token") || url.searchParams.get("token");
    const authed = !!env.UPLOAD_TOKEN && authToken === env.UPLOAD_TOKEN;

    // 私有文档域：整站由 Cloudflare Access 保护，仅可读取 private/ 前缀的对象
    if (url.hostname === "docs.xzqf.nyc.mn") {
      if (url.pathname === "/admin")
        return new Response(DOCS_ADMIN, { headers: { "content-type": "text/html; charset=utf-8" } });

      if (url.pathname === "/list-docs") {
        if (!authed) return json({ error: "invalid token" }, 401);
        const items = [];
        for (const prefix of ["private/", "public/"]) {
          const q = `list-type=2&max-keys=1000&prefix=${encodeURIComponent(prefix)}`;
          const signed = await signRequest(env, "GET", "", null, q);
          const r = await fetch(signed.url, { headers: signed.headers });
          const xml = await r.text();
          for (const m of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
            const b = m[1];
            const key = (/<Key>(.*?)<\/Key>/.exec(b) || [])[1];
            const size = Number((/<Size>(\d+)<\/Size>/.exec(b) || [])[1] || 0);
            const lm = (/<LastModified>(.*?)<\/LastModified>/.exec(b) || [])[1] || "";
            if (key) items.push({ key, size, lastModified: lm });
          }
        }
        items.sort((a, b) => (a.lastModified < b.lastModified ? 1 : -1));
        return json({ ok: true, count: items.length, items });
      }

      if (url.pathname === "/index-source") {
        if (!authed) return json({ error: "invalid token" }, 401);
        const signed = await signRequest(env, "GET", "public/docs-index.html", null);
        const r = await fetch(signed.url, { headers: signed.headers });
        return new Response(r.body, { status: r.status, headers: { "content-type": "text/html; charset=utf-8" } });
      }

      if (url.pathname === "/update-index" && req.method === "POST") {
        if (!authed) return json({ error: "invalid token" }, 401);
        const body = await req.arrayBuffer();
        if (!body.byteLength || body.byteLength > 1024 * 1024) return json({ error: "bad body" }, 400);
        const signed = await signRequest(env, "PUT", "public/docs-index.html", body);
        const put = await fetch(signed.url, {
          method: "PUT",
          headers: { ...signed.headers, "content-type": "text/html; charset=utf-8" },
          body,
        });
        return json({ ok: put.ok }, put.ok ? 200 : 502);
      }

      // 仅 GET/HEAD 走文档读取；/upload、/delete 等写操作落到下方通用路由
      if (req.method === "GET" || req.method === "HEAD") {
        let key = decodeURIComponent(url.pathname.slice(1));
        if (!key) key = "public/docs-index.html";
        if (!/^(private|public)\//.test(key)) return json({ error: "not found" }, 404);
        const signed = await signRequest(env, "GET", key, null);
        const obj = await fetch(signed.url, { headers: signed.headers });
        if (!obj.ok) return json({ error: "not found" }, 404);
        const out = new Headers();
        out.set("content-type", obj.headers.get("content-type") || "application/octet-stream");
        out.set("cache-control", key.startsWith("private/") ? "private, no-cache" : "public, max-age=3600");
        out.set("x-content-type-options", "nosniff");
        return new Response(req.method === "HEAD" ? null : obj.body, { status: 200, headers: out });
      }
    }

    if (req.method === "GET" && url.pathname === "/")
      return new Response(PAGE, { headers: { "content-type": "text/html; charset=utf-8" } });
    if (req.method === "GET" && (url.pathname === "/g" || url.pathname === "/gallery"))
      return new Response(GALLERY, { headers: { "content-type": "text/html; charset=utf-8" } });
    if (url.pathname === "/health") return json({ ok: true, bucket: env.B2_BUCKET });

    if (req.method === "GET" && url.pathname === "/list") {
      if (!authed) return json({ error: "invalid token" }, 401);
      const prefix = url.searchParams.get("prefix") || "";
      const items = [];
      let cont = "";
      for (let page = 0; page < 5; page++) {
        const params = [["continuation-token", cont], ["list-type", "2"], ["max-keys", "1000"]];
        if (prefix) params.push(["prefix", prefix]);
        params.sort((a, b) => (a[0] < b[0] ? -1 : 1));
        const q = params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
        const signed = await signRequest(env, "GET", "", null, q);
        const r = await fetch(signed.url, { headers: signed.headers });
        const xml = await r.text();
        if (!r.ok) return json({ error: `B2 list ${r.status}: ${xml.slice(0, 200)}` }, 502);
        for (const m of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
          const b = m[1];
          const key = (/<Key>(.*?)<\/Key>/.exec(b) || [])[1];
          const size = Number((/<Size>(\d+)<\/Size>/.exec(b) || [])[1] || 0);
          const lm = (/<LastModified>(.*?)<\/LastModified>/.exec(b) || [])[1] || "";
          if (key && !/^(private|public)\//.test(key)) items.push({ key, size, lastModified: lm, url: `${url.origin}/f/${key}` });
        }
        const truncated = /<IsTruncated>true<\/IsTruncated>/.test(xml);
        let next = (/<NextContinuationToken>(.*?)<\/NextContinuationToken>/.exec(xml) || [])[1];
        if (next) next = next.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
        if (!truncated || !next) break;
        cont = next;
      }
      items.sort((a, b) => (a.lastModified < b.lastModified ? 1 : -1));
      return json({ ok: true, count: items.length, items });
    }

    if (req.method === "POST" && url.pathname === "/delete") {
      if (!authed) return json({ error: "invalid token" }, 401);
      const key = url.searchParams.get("key");
      if (!key) return json({ error: "missing key" }, 400);
      const signed = await signRequest(env, "DELETE", key, null);
      const r = await fetch(signed.url, { method: "DELETE", headers: signed.headers });
      if (!r.ok && r.status !== 404) {
        const t = await r.text();
        return json({ error: `B2 ${r.status}: ${t.slice(0, 150)}` }, 502);
      }
      return json({ ok: true, key });
    }

    if (req.method === "POST" && url.pathname === "/upload") {
      if (!authed) return json({ error: "invalid token" }, 401);
      const ip = req.headers.get("cf-connecting-ip") || "unknown";
      if (!rateAllow(ip, 10, 60000)) return json({ error: "rate limit: max 10 uploads/min" }, 429);
      const rawName = url.searchParams.get("name") || "file";
      const m = /^(private|public)\//.exec(rawName);
      const scope = m ? m[1] : "";
      const name = (m ? rawName.slice(scope.length + 1) : rawName).replace(/[^\w.\-]+/g, "_").slice(-80);
      const ct = req.headers.get("content-type") || "application/octet-stream";
      const body = await req.arrayBuffer();
      if (!body.byteLength) return json({ error: "empty body" }, 400);
      if (body.byteLength > 25 * 1024 * 1024) return json({ error: "file too large (max 25MB)" }, 413);
      const key = scope ? `${scope}/${name}` : `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${name}`;
      const signed = await signRequest(env, "PUT", key, body);
      const put = await fetch(signed.url, { method: "PUT", headers: { ...signed.headers, "content-type": ct }, body });
      if (!put.ok) {
        const t = await put.text();
        return json({ error: `B2 ${put.status}: ${t.slice(0, 200)}` }, 502);
      }
      return json({
        ok: true,
        key,
        protected: scope === "private",
        url: scope ? `https://docs.xzqf.nyc.mn/${key}` : `${url.origin}/f/${key}`,
      });
    }

    if ((req.method === "GET" || req.method === "HEAD") && url.pathname.startsWith("/f/")) {
      const cache = caches.default;
      const cacheKey = new Request(url.origin + url.pathname, { method: "GET" });
      const hit = await cache.match(cacheKey);
      if (hit) return hit;
      const key = url.pathname.slice(3);
      if (!key) return json({ error: "missing key" }, 400);
      if (/^(private|public)\//.test(key)) return json({ error: "not found" }, 404);
      const signed = await signRequest(env, "GET", key, null);
      const headers = { ...signed.headers };
      const range = req.headers.get("range");
      if (range) headers.range = range;
      const obj = await fetch(signed.url, { headers });
      if (!obj.ok) return json({ error: `B2 ${obj.status}` }, obj.status === 404 ? 404 : 502);
      const out = new Headers();
      out.set("content-type", obj.headers.get("content-type") || "application/octet-stream");
      const len = obj.headers.get("content-length");
      if (len) out.set("content-length", len);
      const cr = obj.headers.get("content-range");
      if (cr) out.set("content-range", cr);
      out.set("accept-ranges", "bytes");
      out.set("cache-control", "public, max-age=31536000, immutable");
      out.set("x-content-type-options", "nosniff");
      const resp = new Response(req.method === "HEAD" ? null : obj.body, { status: obj.status, headers: out });
      if (obj.status === 200) ctx.waitUntil(cache.put(cacheKey, resp.clone()));
      return resp;
    }

    return json({ error: "not found" }, 404);
  },
};
