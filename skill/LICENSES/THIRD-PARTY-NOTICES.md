# 第三方组件声明

## quark-drive CLI（夸克网盘官方命令行工具）

- 提供方：夸克网盘（Quark）
- 获取方式：**安装时**由 `scripts/install.js` 通过官方公开接口
  `https://open-api-drive.quark.cn/agent/v1/skill_config` 查询当前版本与下载地址，
  再从官方地址下载并抽取 `scripts/quark-drive.cjs` 到本地 `runtime/` 目录。
- 本仓库**不随包再分发**该文件本体，因此不构成对官方产物的再分发。
- 版本与 SHA256 记录在 `runtime/runtime-manifest.json`，可追溯。
- 使用该工具仍需遵守夸克网盘的服务条款。

## Node.js

- 运行环境依赖，需目标机器已安装 Node.js（>= 16）。
- 本包不捆绑 Node.js 运行时。若后续需要随包提供，必须单独核实许可证与平台分发条件。
