# 第三方内容 / Third-party notices

以下内容不是本项目原创，不适用 LICENSE 里的许可证，版权归各自的所有者。
The items below are not original to this project, are not covered by LICENSE, and remain the property of their respective owners.

## 随仓库提供 / Included

| 内容 | 位置 | 来源 |
|---|---|---|
| 元件 3D 模型（STEP / WRL） | `hardware/pcb/lib/QB12.3dshapes/`、`hardware/pcb/prev/models/`、`outputs/QB12/QB12_KiCad工程.zip` 内 | 立创商城 / EasyEDA 元件库（LCSC / EasyEDA component library） |
| 元件封装（KiCad 封装，由立创库转换） | `hardware/pcb/lib/QB12.pretty/` | 立创商城 / EasyEDA 元件库 |

这些文件只是为了让 KiCad 能直接显示 3D 和打开工程。如果你要再分发或商用，请自己确认原始来源的条款。
They are included only so that the KiCad project opens with 3D models. Check the original source's terms before redistributing or using them commercially.

## 运行时加载、没有放进仓库 / Loaded at runtime, not included

| 内容 | 用在哪里 | 许可证 | 获取方式 |
|---|---|---|---|
| three.js r128（0.128.0） | `viewer/` 生成的 3D 预览和装配动画，从 cdnjs.cloudflare.com、cdn.jsdelivr.net 加载 | MIT | 自动加载 |
| Freerouting 1.9.0 | `hardware/pcb/` 自动布线 | GPL-3.0 | 从 https://github.com/freerouting/freerouting/releases/tag/v1.9.0 下载，放到 `tools/freerouting-1.9.0.jar` |
| Bluepad32 板包（esp32-bluepad32） | `firmware/` | 见其项目 | `firmware/build.sh` 第一次运行时自动安装 |
| 元件数据手册 | 设计参考 | 各厂商 | 在立创商城按料号搜索（例如 TP4056 是 C16581） |
