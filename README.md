# 本仓库已停止维护，请勿在此发布

**所有资产已迁至统一仓库：[joe216533/workbuddy-skills-NP](https://github.com/joe216533/workbuddy-skills-NP)**

| 资产 | 新位置 |
|-|-|
| 夸克技能包 v1.0.4 及以后 | `workbuddy-skills-NP/packages/kuake-quarkclouddrive/` |
| 发布工具包 kuake-release-tools | `workbuddy-skills-NP/tools/kuake-release-tools/` |
| 百度技能包 | `workbuddy-skills-NP/packages/baidu-baidunetdisk/` |

## 不要在此仓库发布新版本

统一仓库的结构与命名已经变更，本仓库的旧约定**不再适用**：

| 项 | 本仓库（旧，已废弃） | 统一仓库（现行） |
|-|-|-|
| 包路径 | 仓库根目录 | `packages/{SKILL_ID}/v{VERSION}/` |
| Tag | `v{VERSION}` | `{SKILL_ID}-v{VERSION}` |
| 多技能 | 一技能一仓库 | 单仓库多技能 |

## 为什么保留而不是删除

v1.0.0 – v1.0.3 的 Tag 直链已经对外发出。删除仓库会让这些链接全部 404，影响已安装用户的重装与追溯。

按「停止分发不等于删除」原则，历史资产保留可追溯，但**禁止用于新安装**。新版本一律从统一仓库获取。

## 现行安装入口

```text
请根据以下直链安装 kuake-quarkclouddrive 技能：
https://raw.githubusercontent.com/joe216533/workbuddy-skills-NP/kuake-quarkclouddrive-v1.0.4/packages/kuake-quarkclouddrive/v1.0.4/kuake-quarkclouddrive-v1.0.4.zip
```

完整说明（版本表、校验值、网盘镜像）见统一仓库 README。
