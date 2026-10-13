# schedule · 个人学习笔记本

一个使用 Vue 3 制作的个人学习规划与日记应用。它把每日计划和当天心情放进一本手绘风格的数字笔记本里，适合记录不同时间段的学习安排，也适合写下每天的小片段。

## 功能

- 按日期切换笔记本页面
- 添加不同时间段的学习计划
- 勾选完成、删除和清除当天计划
- 记录每日札记与心情
- 计划和日记自动保存到浏览器本地
- 五颗不同颜色的球形角色作为一套整体 Logo
- 纸张、舞台幕布、贴纸和手绘线条风格

## 启动

需要 Node.js 20.19+ 或 22.12+。

```sh
npm ci
npm run dev
```

然后打开终端显示的本地地址。

## 构建

```sh
npm run build
npm run preview
```

项目可以部署到 GitHub Pages 等静态网站服务。

## 技术栈

- Vue 3
- Vite
- CSS 手绘视觉样式
- LocalStorage 本地数据保存

## 本地后端存储（新增）

使用 Node.js 22.13+（建议 Node 24 LTS）自带 SQLite，无需另装数据库。

1. `npm ci`
2. 将 `.env.example` 复制为 `.env`。
3. 将 `NOTEBOOK_TOKEN` 改为随机密钥（至少 24 位，可用 `openssl rand -hex 32` 生成）。
4. 一个终端运行 `npm run server`，另一个终端运行 `npm run dev`。
5. 打开 `http://localhost:5173`，点击「连接存储」，填入 `http://localhost:3001` 和刚设置的密钥。

首次连接空数据库时上传当前笔记；后续连接会询问是否载入数据库内容，原浏览器内容先保存至 `study-notebook-v2-backup`。日记和计划编辑后自动同步，失败时保留浏览器草稿。密钥只在当前页面内存中使用，刷新后需重新连接。并发版本冲突会停止同步，避免覆盖另一端修改。

数据库保存于 `data/notebook.sqlite`。停止后端后备份整个 `data/` 目录。数据和 `.env` 不会提交到 GitHub。

GitHub Pages 仍是前端静态预览，不能运行此后端。本次后端仅在本地使用。以后部署需持久化磁盘、HTTPS，以及匹配前端来源的 `ALLOWED_ORIGIN`。

验证：`node --test tests/backend.test.js`（鉴权、写入、重启持久化、无效数据和冲突保护）。
