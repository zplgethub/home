# Cloudflare + B2 运维存档

> 日期：2026-11-26
> 范围：华为云 ECS + Cloudflare（Tunnel / Access / Pages / Workers / 缓存 / WAF / 邮箱）+ Backblaze B2
> 本文档不包含任何密钥值，仅记录密钥名称与存放位置。

---

## 1. 资源总览

| 域名 | 后端 | 鉴权 | 说明 |
|---|---|---|---|
| `www.xzqf.nyc.mn` | Vercel | 无 | 原有站点，未改动 |
| `home.xzqf.nyc.mn` | Cloudflare Tunnel → ECS Nginx:80 | 无 | 静态主页（imsyy/home 构建产物） |
| `demo.xzqf.nyc.mn` | Cloudflare Tunnel → ECS :8080 | 无 | 演示服务，公开 |
| `verify.xzqf.nyc.mn` | Cloudflare Tunnel → ECS :8080 | Access 邮箱验证码 | 仅允许 `@qq.com`、`@139.com` |
| `img.xzqf.nyc.mn` | Cloudflare Pages 项目 `xzqf-img` | 无 | 静态图床，命令行 `upimg` 部署 |
| `up.xzqf.nyc.mn` | Worker `img-up` → B2 私有桶 | 上传密钥 | 手机上传、图库、删除、直链 |
| `api.xzqf.nyc.mn` | Worker `api-demo` | 无 | 示例 JSON 接口 |

服务器：华为云 ECS（2C2G，40G 盘，100GB/月出网流量），SSH 端口 `22222`，登录用户 `zzz`，Ubuntu 24.04。

**关键结论**：`img` 与 `up` 不经过 ECS；`home`/`demo`/`verify` 经 Tunnel 回源 ECS，ECS 无需开放任何 Web 入站端口。

---

## 2. 标识符清单（非敏感）

| 项目 | 值 |
|---|---|
| CF Account ID | `9d50a33404001a4c80ad48c0b311368e` |
| CF Zone ID（xzqf.nyc.mn） | `98c5d21d85e643583bcc615e0fb4ba03` |
| Zero Trust team 域 | `flyingzh.cloudflareaccess.com` |
| Tunnel 名称 / ID | `huawei-home` / `05bae885-52ee-4cb9-9104-94c4b8fb6ed6` |
| Pages 项目 | `xzqf-img`（`xzqf-img.pages.dev`） |
| Workers | `img-up`（图床）、`api-demo`（示例） |
| B2 桶 / Endpoint | `xzqf-img` / `s3.us-east-005.backblazeb2.com`（region `us-east-005`） |
| Access 应用（verify） | App ID `5bdc7fc1-b110-4c12-b521-7983ecaf0890` |
| 缓存 Ruleset ID | `9c96155a09ca4e6986a493190a477cd7` |
| WAF Ruleset ID | `4c841244fec1427796e2d8ee6c5a9f7e` |

---

## 3. 各功能原理

### 3.1 Cloudflare Tunnel（home / demo / verify）

- ECS 上运行 `cloudflared`，**主动向 Cloudflare 发起 4 条出站长连接**（QUIC/7844）。
- CF 收到请求后通过隧道转发给 ECS 本机的 Nginx/服务，ECS 不需要公网入站端口。
- 域名通过 CNAME 指向 `<tunnel-id>.cfargotunnel.com`，由 `cloudflared tunnel route dns` 自动创建。
- 因为域名不直接解析到大陆 IP 的 80/443，避开了未备案域名的拦截风险。
- 配置文件：`/etc/cloudflared/config.yml`；凭证：`/etc/cloudflared/<tunnel-id>.json`；登录授权文件：`/home/zzz/.cloudflared/cert.pem`（**勿删**，删后无法再用 CLI 建 DNS）。

### 3.2 Access（verify）

- 类型 `self_hosted`，登录方式为内置 One-time PIN（邮箱验证码）。
- 策略 `Allow` + `Include`：`email_domain = qq.com`、`email_domain = 139.com`（OR 关系）。
- 会话 24 小时。未认证请求返回 302 到 `flyingzh.cloudflareaccess.com`。
- 注意：OTP 模式下“谁能收信谁能进”，**不要把 Include 改成 Everyone**。
- 未建 Access 应用的子域默认公开；账号级 `deny_unmatched_requests` 保持关闭。

### 3.3 Pages 静态图床（img）

- 纯静态托管，免费、无限流量；单站上限 2 万文件、单文件 25MB。
- **每次部署是整站快照**：以源目录为准，源目录删掉的文件线上也会消失。
- 自定义域 `img.xzqf.nyc.mn` 通过 CNAME 指向 `xzqf-img.pages.dev`，证书自动签发。

### 3.4 Worker + B2 私有桶（up）

- Worker 在 CF 边缘运行，用 **AWS SigV4** 签名直接调用 B2 的 S3 兼容 API。
- 桶保持 **Private**，因此 B2 不需要绑卡；Key 只存 Worker Secret，前端不可见。
- 接口：
  - `POST /upload?name=xxx`：上传（需 `x-upload-token`），自动加时间戳+随机前缀防覆盖，单文件 25MB
  - `GET /list`：列出文件（需密钥，支持 `token` 查询参数），最多 5000 条
  - `POST /delete?key=xxx`：删除（需密钥）
  - `GET|HEAD /f/<key>`：直链，带 `immutable` 缓存头
  - `GET /g`：图库页面（缩略图、详情、复制直链、删除）
  - `GET /health`：健康检查
- **缓存**：`/f/` 使用 Cache API（`caches.default`）写入边缘缓存，命中后不再回 B2。
- **限流**：上传接口单 IP 10 次/分钟（Worker 内存计数，单实例尽力而为，替代免费版不可用的 Rate Limiting）。

### 3.5 边缘安全与缓存

- 缓存规则：`up/f/*` 边缘 30 天 / 浏览器 1 天；`img` 遵循源站缓存。
- WAF 自定义规则：Block `/.env`、`/xmlrpc.php`、`/wp-admin`、`/phpmyadmin`、`/.git`。
- Bot Fight Mode：已开启（`fight_mode` + `enable_js`）。
- Always Use HTTPS：已开启。

### 3.6 Email Routing

- 2024 年已配置：MX 指向 `route1/2/3.mx.cloudflare.net`。
- 目标邮箱为账号邮箱（foxmail），且存在 **catch-all（全匹配）规则**。
- 因此 `任意前缀@xzqf.nyc.mn` 都会转发到目标邮箱，无需逐个建规则。

### 3.7 文档中心（docs，公开/私有分级）

- **统一入口：`https://docs.xzqf.nyc.mn/`**，公开可访问，返回文档中心页面（索引文件 `public/docs-index.html`）
- 路径分级：
  - `https://docs.xzqf.nyc.mn/public/<文件名>` → **公开文档**，任何人可读，缓存 1 小时
  - `https://docs.xzqf.nyc.mn/private/<文件名>` → **私有文档**，Access 拦截，仅 `Flying_zh@foxmail.com`、`zh_octopus@qq.com` 可 OTP 登录，会话 24 小时，不写缓存
- Access 应用为 `docs-private`，**作用域只到 `docs.xzqf.nyc.mn/private` 路径**，因此入口和公开文档不需要登录
- 上传时 `name` 以 `public/` 或 `private/` 开头即进入文档区：
  - key 固定为 `<级别>/<文件名>`，**不加时间戳、同名覆盖**，链接长期不变
  - 返回的 `url` 自动指向 `docs.xzqf.nyc.mn`
- **隔离**：`up.xzqf.nyc.mn` 对 `private/`、`public/` 前缀一律 404，`/list` 与图库 `/g` 也会过滤，文档只在 docs 域出现
- 新增文档后，把链接追加到索引页并重新上传 `public/docs-index.html`
- 文件名用英文小写达意命名（如 `home-redesign-plan.md`），中文会被清洗为下划线

---

## 4. 日常修改手册

### 4.1 更新主页（home）

在 `/workspace` 执行：

```bash
pnpm install
pnpm build
rsync -az --delete -e ssh dist/ hw:/var/www/home/
```

`hw` 是沙箱 SSH 别名（`~/.ssh/config`：139.9.201.219:22222，用户 zzz）。
Nginx 配置：`/etc/nginx/sites-available/home`，已启用 gzip_static 与静态长缓存。

### 4.2 新增子域名（走 Tunnel）

```bash
# 1. 编辑 /etc/cloudflared/config.yml，在 404 兜底之前插入：
#   - hostname: xxx.xzqf.nyc.mn
#     service: http://localhost:端口
cloudflared tunnel route dns huawei-home xxx.xzqf.nyc.mn
cloudflared tunnel ingress validate
sudo systemctl restart cloudflared
```

目标也可以是公网地址：`service: https://IP:端口`（自签证书需加 `originRequest: noTLSVerify: true`）。

### 4.3 修改 Access 策略

- 面板：Zero Trust → Access → Applications → 选应用 → Policies
- API：`PUT /accounts/{A}/access/apps/{app_id}/policies/{policy_id}`
- 常用条件：`email`（精确邮箱）、`email_domain`（后缀）、`ip`、`country`、`service_token`

### 4.4 图床上传（Pages / img）

```bash
~/tools/cf/img/upimg                 # 无参：重新部署 images 目录
~/tools/cf/img/upimg a.jpg b.png     # 传文件
~/tools/cf/img/upimg ./某目录/        # 传目录内文件
```

- 目录结构：`~/tools/cf/img/{upimg, upimg.env, images/, logs/}`
- 删图：删除 `images/` 内文件后无参重跑
- 配置文件 `upimg.env` 含 CF Token 与 Account ID，权限 600

### 4.5 手机上传 / 图库 / 删除（B2 / up）

- 上传页：`https://up.xzqf.nyc.mn/`
- 图库：`https://up.xzqf.nyc.mn/g`
- 命令行：

```bash
curl -X POST "https://up.xzqf.nyc.mn/upload?name=pic.jpg" \
  -H "x-upload-token: <上传密钥>" -H "content-type: image/jpeg" --data-binary @pic.jpg

curl "https://up.xzqf.nyc.mn/list?token=<上传密钥>"

curl -X POST "https://up.xzqf.nyc.mn/delete?key=<key>" -H "x-upload-token: <上传密钥>"
```

### 4.6 文档管理页（免命令行）

地址：**`https://docs.xzqf.nyc.mn/admin`**

- 粘贴一次上传密钥（存在浏览器 localStorage），之后打开即用
- 上传：选文件 → 选级别（private/public）→ 填文件名（可留空用原文件名，自动补扩展名）→ 同名覆盖
- 勾选“同时把文档加入索引页”会自动更新文档中心
- 列表区可打开文档、删除文档（公开文档删除后缓存最长 1 小时自愈）
- 配套接口：`/list-docs`（文档列表）、`/index-source`、`/update-index`，均需上传密钥
- 管理页本身不需要 Access 登录，所有写操作由上传密钥保护

### 4.7 修改 Worker 代码

源码：`/workspace/tools/cf/up/img-up.js`（沙箱内持久保存）。

```bash
export CLOUDFLARE_API_TOKEN='<CF Token>'
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/{A}/workers/scripts/img-up" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -F 'metadata={"main_module":"img-up.js","compatibility_date":"2026-01-01"};type=application/json' \
  -F 'img-up.js=@img-up.js;type=application/javascript+module'
```

### 4.8 密钥轮换

| 密钥 | 位置 | 轮换方式 |
|---|---|---|
| 上传密钥 | Worker Secret `UPLOAD_TOKEN` | `PUT .../workers/scripts/img-up/secrets`，或面板 Variables and Secrets |
| B2 Key | Worker Secret `B2_KEY_ID` / `B2_APP_KEY` | B2 控制台建新 Key → 更新 Secret → 验证 → 删旧 Key |
| CF API Token | 本地环境变量 + 服务器 `upimg.env` | 面板 My Profile → API Tokens → **Roll**，两处同步更新 |
| SSH 密钥 | 沙箱私钥 + ECS `authorized_keys` | 沙箱公钥注释固定为 `trae-sandbox`，用“先删后加”替换 |

替换沙箱公钥命令（在 ECS 执行，只清沙箱标记）：

```bash
sed -i -E '/trae-(deploy@workspace|sandbox)/d' ~/.ssh/authorized_keys \
  && echo '<新的沙箱公钥> trae-sandbox' >> ~/.ssh/authorized_keys \
  && chmod 600 ~/.ssh/authorized_keys
```

---

## 5. 故障排查

| 现象 | 含义 | 处理 |
|---|---|---|
| 200 | 正常 | - |
| 302 到 `*.cloudflareaccess.com` | Access 拦截 | 用允许的邮箱收验证码 |
| 401 | 密钥错误/失效 | 检查 `x-upload-token` 或 `token` 参数 |
| 403 | WAF 拦截 | 检查是否命中拦截路径 |
| 404（直链） | 文件不存在或已删 | `/list` 核对 key |
| 429 | 上传限流 | 单 IP 每分钟 10 次，稍后再试 |
| 502（up） | B2 调用失败 | 检查 B2 Key、桶名、region |
| 502（tunnel 子域） | 本机服务未启动 | 检查端口监听 |
| 1033 | 隧道未连接 | `systemctl status cloudflared` |

常用命令：

```bash
ssh hw 'sudo journalctl -u cloudflared -f'      # 隧道日志
ssh hw 'vnstat -d; vnstat -m'                    # 流量
ssh hw 'sudo tail -f /var/log/nginx/access.log'  # 访问日志
```

---

## 6. 额度与费用提醒

| 项目 | 免费额度 |
|---|---|
| Cloudflare Pages | 无限流量/请求；2 万文件；单文件 25MB |
| Workers | 10 万请求/天 |
| B2 | 10GB 存储；下载量建议控制在月均存储的 3 倍内 |
| Zero Trust | 50 用户 |
| ECS | 100GB/月出网流量，40G 盘 |
| CF 免费版国内访问 | 走海外节点，延迟约 100–300ms；`workers.dev` 在大陆不可达，必须用自定义域 |

---

## 7. 文档副本位置

- 沙箱：`/workspace/tools/cf/README.md`
- ECS：`/home/zzz/tools/cf/README.md`
- GitHub 私有仓库：`zplgethub/trae` 的 `cf/` 目录
- B2 私有桶：HTML + Markdown 两个版本，**已由 Cloudflare Access 保护**，仅授权邮箱（账号邮箱）通过验证码后可访问，未登录一律 302 到登录页

> 本文档含 IP、端口、用户名等基础设施信息，不要公开传播直链；B2 上的旧公开版本已删除。
