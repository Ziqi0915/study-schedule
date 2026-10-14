# schedule · 个人学习笔记本

一个使用 React 制作的个人学习规划与日记应用。它把每日计划和当天心情放进一本手绘风格的数字笔记本里，适合记录不同时间段的学习安排，也适合写下每天的小片段。

## 功能

- 按日期切换笔记本页面
- 添加不同时间段的学习计划
- 勾选完成、删除和清除当天计划
- 记录每日札记与心情
- 账号注册与登录，计划和日记自动保存到服务器
- 五颗不同颜色的球形角色作为一套整体 Logo
- 纸张、舞台幕布、贴纸和手绘线条风格

## 启动

需要 Node.js 22.13+。

```sh
npm ci
npm run server   # 后端，另开一个终端运行下一条
npm run dev
```

然后打开终端显示的本地地址，注册或登录即可使用。

## 构建

```sh
npm run build
npm run preview
```

项目可以部署到 GitHub Pages 等静态网站服务。

## 技术栈

- React
- Vite
- CSS 手绘视觉样式
- Node.js 内置 SQLite 后端存储

## 账号登录与后端存储

使用 Node.js 22.13+（建议 Node 24 LTS）自带 SQLite，无需另装数据库。

1. `npm ci`
2. 一个终端运行 `npm run server`，另一个终端运行 `npm run dev`。
3. 打开 `http://localhost:5173`，注册账号后即进入笔记本。

开发服务器会把 `/api` 请求转发到后端（端口 3001），所以页面无需填写任何地址或密钥。登录状态保存在 HttpOnly Cookie 中，默认 30 天有效。每个账号拥有独立的笔记本，计划、札记和心情编辑后自动保存；同一账号在两台设备同时修改时，后保存的一方会载入最新内容，不会互相覆盖。

密码使用 scrypt 加盐哈希保存，同一用户名连续输错 5 次会锁定 15 分钟。

此浏览器里旧版保存在本地的笔记，会在第一个注册的账号首次登录时自动上传到该账号。

可选配置：复制 `.env.example` 为 `.env` 后修改。`ALLOW_REGISTRATION=false` 关闭新用户注册；`SESSION_DAYS` 调整登录有效期；通过 HTTPS 部署时设置 `COOKIE_SECURE=true`。

数据库保存于 `data/notebook.sqlite`（表 `users`、`sessions`、`notebooks`）。停止后端后备份整个 `data/` 目录。数据和 `.env` 不会提交到 GitHub。

GitHub Pages 只能托管静态页面，无法运行后端，因此线上预览无法登录。部署需要能运行 Node 的服务器、持久化磁盘和 HTTPS，并让前端与 `/api` 同域。

验证：`npm test`（注册、登录、账号隔离、重启持久化、退出登录、无效数据、跨站请求和冲突保护）。
