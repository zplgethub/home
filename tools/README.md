# trae

云项目主仓库（私有）。按主题分目录隔离，代码与文档放在一起，**密钥一律不入库**。

| 目录 | 主题 | 说明 |
|---|---|---|
| `cf/` | Cloudflare + B2 | 运维手册、Worker 源码、过程记录（`notes/`） |
| `home/` | 主页 | 源码已并入本目录（imsyy/home）。Vercel 需把 Git 连接改为本仓库并设 Root Directory = `home`；ECS 发布：构建后 rsync 到 `/var/www/home` |
| `server/` | ECS | 规划中：Nginx / cloudflared / upimg 配置 |

## 规则

0. **方案先行**：任何变更（代码、配置、DNS、Access、上传/删除、归档等）必须先给方案，讨论并经本人明确确认后才执行；只读的状态查看与排查可直接进行
1. 新主题新建子目录，不与其他主题混放
2. 每个子目录自带 `README.md`（做了什么、原理、怎么改）和 `notes/`（过程记录）
3. 密钥只放 GitHub Secrets 或服务器，`.gitignore` 排除 `*.env`
4. 图片等大文件走图床（B2 / Pages），不进仓库
