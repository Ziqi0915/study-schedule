# 宝塔前端自动部署

推送 main 后，GitHub Actions 会运行测试、构建并上传前端到 /www/wwwroot/study-schedule/dist。PR 仅测试和构建。后端、.env 和 SQLite 数据库不参与这次发布。原 GitHub Pages 工作流继续独立运行。

## 一次性服务器配置

在服务器以 root 登录。先在宝塔备份当前 dist，并确认 HTML 站点根目录就是 /www/wwwroot/study-schedule/dist。

确认 rsync 可用：

```sh
command -v rsync
```

如果 Ubuntu 未安装：

```sh
apt-get update
apt-get install -y rsync
```

确认 SSH 允许 root 使用公钥登录；现有终端是 root 并不代表公网 SSH 一定允许 root 登录。不要为了部署启用密码登录。SSH 22 必须能被 GitHub 托管 runner 访问；如果防火墙只允许个人 IP，本工作流会连接超时。

生成专用部署密钥（文件已存在时不要覆盖，直接使用现有密钥）：

```sh
install -m 700 -d /root/.ssh
ssh-keygen -t ed25519 -C "github-actions-study-schedule" -f /root/.ssh/study-schedule-actions -N ""
touch /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
{ printf 'restrict '; cat /root/.ssh/study-schedule-actions.pub; } >> /root/.ssh/authorized_keys
```

restrict 禁用此密钥的终端和转发功能，但它仍有 root 文件和命令权限，密钥只能存入可信的 Actions Secret。不要提交密钥或在聊天中发送它。

查看私钥用于复制到 GitHub Secret（包含 BEGIN 和 END 行）：

```sh
cat /root/.ssh/study-schedule-actions
```

从服务器现有公钥生成已知主机记录：

```sh
awk '{print "150.158.108.119 " $1 " " $2}' /etc/ssh/ssh_host_ed25519_key.pub
```

此操作读取服务器公钥，不通过网络盲目信任扫描结果。

## GitHub Secrets

仓库 Settings → Secrets and variables → Actions → New repository secret。

| 名称 | 内容 |
|---|---|
| BAOTA_SSH_PRIVATE_KEY | 上述完整部署私钥 |
| BAOTA_SSH_KNOWN_HOSTS | 上述 awk 输出的完整一行 |

主机、端口、用户和目标路径在工作流 env 中。服务器信息变化时需要同步修改。若更换服务器主机密钥，核对后更新 known hosts Secret。

## 启用和首次验证

配置完 Secrets 后合并工作流 PR 到 main。合并会触发第一次部署。Actions → Deploy frontend to Baota 查看日志；也可以从 main 手动 Run workflow。

流程先上传资源，最后替换 index.html，且不使用 --delete，保留旧资源及服务器独有文件。上传失败时页面入口通常仍是旧版；静态资源如果沿用相同文件名，会在上传阶段更新。本方案不是整个站点的原子发布。

成功日志确认远端 index.html 的 SHA-256 与构建一致，但不会自动验证线上 Nginx 映射和浏览器交互。首次部署后用无痕窗口检查 http://150.158.108.119/ 和开发者工具 Network。

## 故障与恢复

- Missing secret：检查 Secret 名称和值。
- Permission denied (publickey)：检查 authorized_keys、密钥内容及 root 公钥登录设置。
- Host key verification failed：核对 known hosts 值。
- 连接超时：检查 SSH 端口和防火墙。
- 目标检查失败：检查现有网站目录和 index.html，不要为了通过检查随意创建其他目录。
- 测试或构建失败：查看对应日志；上传不会执行。

每次部署前，旧 index.html 保存在 /root/study-schedule-deploy-backups/ 下。旧哈希资源保留，因此可以在服务器复制所需备份的 index.html 回网站目录恢复入口。若需要恢复同名图片等资源，用首次备份或重新部署对应旧提交。备份和旧资源需要定期整理。

## 后端更新

目前没有宝塔 Node 项目，后端路径和运行方式尚未验证，因此不自动重启后端。前端成功部署不意味着 API 可用；后端仍需独立启动，并由现有 Nginx 站点将 /api/ 转发至 127.0.0.1:3001。
