# kuake-quarkclouddrive

夸克网盘正式资产操作技能：**上传 / 转存（另存）/ 下载 / 分享**，含 SHA256 完整性校验与下载失败升级规则。

## 直链安装

把下面这句发给智能体即可：

```text
请根据这个直链下载并安装 kuake-quarkclouddrive 技能，并自动完成环境检查、依赖准备和安装验证：
https://raw.githubusercontent.com/joe216533/kuake-quarkclouddrive/v1.0.0/kuake-quarkclouddrive-v1.0.zip
```

安装器会：查询夸克官方接口取当前 CLI 版本 → 下载 → 校验 SHA256 → 抽取运行组件 → 执行能力验证。
需要授权时会在回复末尾给出二维码。

## 版本

| 版本 | 文件 | 说明 |
|-|-|-|
| v1.0.0 | `kuake-quarkclouddrive-v1.0.zip` | 上传/下载/分享已实测；转存待测 |

## 校验

```text
4b0f87e74704e3c8554585e16d43f0474afdde4c3d9b6b304f188fc4bddf3f7a  kuake-quarkclouddrive-v1.0.zip
```

## 目录

```
kuake-quarkclouddrive-v1.0.zip          分发包（安装用）
kuake-quarkclouddrive-v1.0.zip.sha256   校验文件
skill/                                   技能源文件（SKILL.md / scripts / manifest）
```

## 网络要求

夸克对境外出口有风控，走代理会报 `1007` 或 TLS 断开。**执行夸克操作前必须切国内直连。**

## 许可

底层 CLI 于安装时从夸克官方地址现取，本仓库不再分发其本体。见 `skill/LICENSES/THIRD-PARTY-NOTICES.md`。
