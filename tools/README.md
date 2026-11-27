# trae

云项目主仓库（私有）。按主题分目录隔离，代码与文档放在一起，**密钥一律不入库**。

| 目录 | 主题 | 说明 |
|---|---|---|
| `cf/` | Cloudflare + B2 | 运维手册、Worker 源码、过程记录（`notes/`） |
| `home/` | 主页 | **独立仓库** `zplgethub/home`，不并入本仓库；Vercel 从该仓库构建发布 `www` |
| `server/` | ECS | 规划中：Nginx / cloudflared / upimg 配置 |

## 规则

0. **方案先行**：任何变更（代码、配置、DNS、Access、上传/删除、归档等）必须先给方案，讨论并经本人明确确认后才执行；只读的状态查看与排查可直接进行
1. **文档同步**：每次改动后必须同步更新所有相关文档 —— 本仓库 `README.md`/`notes/`、B2 在线版（`private/doc/cf-b2-ops.html` 与 `.md`）、ECS 副本，一处都不能漏
2. 新主题新建子目录，不与其他主题混放
3. 每个子目录自带 `README.md`（做了什么、原理、怎么改）和 `notes/`（过程记录）
4. 密钥只放 GitHub Secrets 或服务器，`.gitignore` 排除 `*.env`
5. 图片等大文件走图床（B2 / Pages），不进仓库
