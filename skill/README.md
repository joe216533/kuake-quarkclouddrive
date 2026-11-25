# quark-asset-ops（夸克资产操作）

夸克网盘的正式资产操作技能，只做四件事：**上传、转存（另存）、下载、分享**。

## 怎么用

把这个技能包装好后，用户只需对智能体发一句：

```text
请安装这个技能：<直链地址>
```

智能体会自行完成下载、校验、准备底层 CLI、验证能力；需要授权时会在回复末尾给出二维码。

## 首次安装

```bash
node scripts/install.js
```

- 退出码 0：四项能力就绪
- 退出码 2：组件就绪，等待用户扫码授权
- 退出码 1：存在真实失败，按输出修正

## 授权

```bash
node runtime/quark-drive.cjs login --session-id <会话ID> --session-input "<用户原话>"
```

把二维码或授权链接放在回复末尾，用户扫码后重跑 `node scripts/verify.js`。

## 网络要求

夸克对境外出口有风控，走 VPN/代理会报 `1007` 或 TLS 断开。**必须先切国内直连**再执行上传/转存/下载/分享。

## 目录

```text
SKILL.md              技能规则（智能体读这个）
manifest.json         技能元信息
scripts/install.js    安装器：查询官方版本→下载→抽取→校验
scripts/verify.js     能力验证：CLI/授权/四命令/目录可写
LICENSES/             第三方组件声明
```

底层 CLI 在安装时从夸克官方接口现取，不随包再分发。
