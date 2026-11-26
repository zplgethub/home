// api.xzqf.nyc.mn —— 常用小接口集合
// 修改短链：编辑下方 LINKS；修改状态检测目标：编辑 TARGETS。改完重新部署即可。

const LINKS = {
  home: "https://home.xzqf.nyc.mn/",
  www: "https://www.xzqf.nyc.mn/",
  img: "https://img.xzqf.nyc.mn/",
  up: "https://up.xzqf.nyc.mn/",
  docs: "https://docs.xzqf.nyc.mn/",
  admin: "https://docs.xzqf.nyc.mn/admin",
  github: "https://github.com/zplgethub",
};

// 注意：up / docs / api 是同 Zone 的 Worker 域名，Cloudflare 不允许 Worker 内部回环调用，
// 因此状态检测只覆盖 ECS（Tunnel）、Vercel、Pages 这些有真实源站的站点。
const TARGETS = [
  { name: "home", url: "https://home.xzqf.nyc.mn/" },
  { name: "www", url: "https://www.xzqf.nyc.mn/" },
  { name: "demo", url: "https://demo.xzqf.nyc.mn/" },
  { name: "verify", url: "https://verify.xzqf.nyc.mn/" },
  { name: "img", url: "https://img.xzqf.nyc.mn/" },
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

async function check(t) {
  const start = Date.now();
  try {
    const r = await fetch(t.url, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(5000) });
    return { name: t.name, ok: r.status < 400, status: r.status, ms: Date.now() - start };
  } catch (e) {
    return { name: t.name, ok: false, error: String(e).slice(0, 100), ms: Date.now() - start };
  }
}

function randomString(len) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*";
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => chars[n % chars.length]).join("");
}

export default {
  async fetch(req) {
    const url = new URL(req.url);
    const p = url.pathname;

    if (p === "/health") return json({ ok: true, time: new Date().toISOString() });

    // 服务目录
    if (p === "/") {
      return json({
        name: "xzqf api",
        endpoints: {
          "/status": "各站点健康状态与耗时",
          "/go/<key>": `短链跳转，可用：${Object.keys(LINKS).join(", ")}`,
          "/ip": "访客 IP / 地区 / 节点信息",
          "/pwd?len=16": "随机密码（8-64 位）",
          "/uuid": "随机 UUID",
          "/echo": "回显请求方法与请求头，用于调试 webhook",
          "/health": "本接口健康检查",
        },
      });
    }

    // 服务状态聚合，可给主页“服务状态”卡片用
    if (p === "/status") {
      const results = await Promise.all(TARGETS.map(check));
      return json({ ok: results.every((r) => r.ok), time: new Date().toISOString(), results });
    }

    // 短链
    if (p.startsWith("/go/")) {
      const key = p.slice(4).replace(/\/$/, "");
      const target = LINKS[key];
      if (target) return Response.redirect(target, 302);
      return json({ error: "unknown key", available: Object.keys(LINKS) }, 404);
    }

    // 访客信息
    if (p === "/ip") {
      return json({
        ip: req.headers.get("cf-connecting-ip"),
        country: req.cf?.country,
        city: req.cf?.city,
        colo: req.cf?.colo,
        asn: req.cf?.asn,
        ua: req.headers.get("user-agent"),
      });
    }

    // 随机密码 / UUID
    if (p === "/pwd") {
      const len = Math.min(64, Math.max(8, Number(url.searchParams.get("len")) || 16));
      return json({ length: len, password: randomString(len) });
    }
    if (p === "/uuid") return json({ uuid: crypto.randomUUID() });

    // 回显，调试用
    if (p === "/echo") {
      const body = req.method === "GET" ? "" : (await req.text()).slice(0, 2048);
      return json({
        method: req.method,
        path: p,
        query: Object.fromEntries(url.searchParams),
        headers: Object.fromEntries(req.headers),
        body,
      });
    }

    return json({ error: "not found", hint: "访问 / 查看可用接口" }, 404);
  },
};
