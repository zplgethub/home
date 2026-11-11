# 极简杂志风首页重构计划

## Context

当前项目复制自开源个人主页模板，已经通过 GitHub → Vercel 部署，并由 Cloudflare 托管域名。现有页面依赖全屏壁纸、玻璃卡片、悬停入口和移动端菜单，用户希望不再沿用旧模板，改为原创的极简杂志风首页。

已确认：沿用当前 `flying` 名称与简介；保留个人/社交信息、七个网站入口、音乐、时间、天气和一言；新增 QQ/邮箱/可选微信联系面板；采用轻量动效；停用旧壁纸切换、时光胶囊和全局设置入口。不修改部署、DNS 或 Cloudflare 配置。

## 设计与信息架构

- 使用暖白背景、墨色文字、单一砖红强调色，细分隔线、大标题和充分留白；不沿用玻璃拟态卡片和全屏壁纸。
- 页眉展示 `VITE_SITE_NAME`，提供“站点导航”和“联系我”锚点/按钮。
- 主视觉以 `VITE_SITE_AUTHOR` 为大标题，使用现有 `VITE_DESC_HELLO`、`VITE_DESC_TEXT` 和站点 Logo，展示社交链接与联系按钮。
- 桌面端采用最大约 1200px 的非对称双栏：左侧个人介绍，右侧时间/天气及一言/音乐面板；下方为全宽网站导航和页脚。
- 移动端改为自然文档流单列，不再使用汉堡菜单、固定高度、强制 391px 宽度或隐藏功能。
- 动效只保留淡入、轻微位移、悬停和面板过渡，并适配 `prefers-reduced-motion`。

## 实施方案

### 1. 重建页面壳与全局样式

- 重写 `src/App.vue`：组合页眉、`MainLeft`、`MainRight`、`Links`、`Footer`，移除 `Loading`、`Background`、`Box`、`MoreSet`、自定义鼠标、禁用右键和中键壁纸逻辑；保留必要的初始化与纪念日逻辑。
- 重写 `src/style/style.scss`：建立颜色、字体、间距、边框和动效变量，恢复页面滚动、文本选择、清晰焦点样式及响应式基础规则。
- 收敛 `src/style/global.scss` 中旧模板的全局输出，避免旧 `.container` 规则干扰新布局。

### 2. 重做内容与功能布局

- 改造 `src/views/Main/Left.vue` 和 `src/components/Message.vue`：形成杂志式个人介绍，继续读取现有站点环境变量。
- 改造 `src/components/SocialLinks.vue`：继续使用 `src/assets/socialLinks.json`，增加可见名称、无障碍标签及安全的外链属性。
- 改造 `src/views/Main/Right.vue` 和 `src/views/Func/index.vue`：重新组织日期时间、`Weather`、`Hitokoto` 与 `Music`，提供始终可见的一言/音乐切换，不依赖悬停。
- 改造 `src/components/Hitokoto.vue`、`Music.vue`、`Player.vue`：保留现有 API、播放状态、列表、歌词和音量逻辑，只重做浅色视觉、按钮语义、弹层与窄屏适配。
- 改造 `src/components/Links.vue`：直接读取 `src/assets/siteLinks.json`，以语义化链接网格展示全部七个入口，取消 Swiper 轮播；保留“音乐”打开现有播放列表的特殊行为。
- 改造 `src/components/Footer.vue`：适配新页面流和浅色主题，保留版权、建站年份、备案与播放歌词。
- 移除 `src/main.js` 中不再需要的 Swiper 全局样式导入；暂不扩大为依赖和旧文件清理，避免无关变更。

### 3. 新增轻量联系面板

- 新增 `src/components/ContactPanel.vue`，由页眉和主视觉按钮打开，支持关闭按钮、遮罩、Esc 和键盘操作。
- QQ 与邮箱直接复用 `socialLinks.json` 中现有配置：提供已有联系入口、复制 QQ 号及 `mailto:` 邮件入口，保证不增加 Vercel 配置也能使用。
- 在 `.env.example` 增加可选 `VITE_CONTACT_WECHAT` 与 `VITE_CONTACT_WECHAT_QR`；配置后显示复制微信号和二维码，未配置则隐藏。二维码以后可放入 `public/images`，当前不生成虚假二维码。
- 联系面板不新增后端、数据库或虚假留言成功状态；所有 `VITE_` 配置均视为公开信息。

## 复用与边界

- 保持 `src/api/index.js`、Pinia 播放状态、天气/音乐/一言环境变量及两份链接 JSON 的数据结构不变。
- 旧 `Background`、`Box`、`MoreSet`、`TimeCapsule` 等组件仅停止在首页引用，本次不做无关目录清理。
- 不修改 `package.json` 的部署命令、Vite 输出、GitHub workflow、Vercel 项目设置或 Cloudflare。

## 验证

1. 执行 ESLint 和 `pnpm build`，修复本次改造导致的错误并检查构建产物。
2. 本地启动 Vite，使用浏览器检查 1440、1024、768、390、320px 及短屏布局，确认无横向溢出、内容遮挡或旧模板残留。
3. 验证所有站点与社交链接、QQ/邮箱/复制操作、可选微信空状态、联系面板关闭与键盘焦点。
4. 验证时间更新、天气成功/失败态、一言刷新、音乐加载/播放/切歌/音量/列表/歌词；外部服务不可用时保留明确失败反馈，不伪造成功。
5. 检查减少动态效果、文本选择、右键、移动端滚动和控制台错误；最终确认构建仍可由 Vercel 直接部署。
