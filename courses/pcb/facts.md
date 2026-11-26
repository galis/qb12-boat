# Boat QB12 PCB 课程 · 事实表（facts.md）

> 用途：8 位课程作者写中文 PCB 课程（QB12：双层板 56 × 38 mm，1.6 mm，KiCad 10.0.6，在 JLCPCB / 嘉立创下单 PCB + SMT 贴片）时的唯一事实来源。
> 原则：准确优先于全面。每条事实后面都有来源编号 `[Sxx]`，编号对应第 0 节的 URL 和核对日期。
> 价格、促销、交期、元件库数量**经常变**：本表只给范围或写"下单时再确认"，不要在课程里写死一个数字。
> 编写 / 核对日期：**2026-10-19**（除另注外，所有网页都在这一天抓取、核对）。KiCad 部分 **2026-10-20** 按 10.0.6 重新核对。
> 本地数据手册摘录在 `S/ds/`（S = `/tmp/claude-0/-home-claude/a03b22b4-4de2-59bd-890a-4be94b9a8f94/scratchpad`），引用时写 `ds/文件名:行号`。

**2026-10-20 迁移到 KiCad 10.0.6。** QB12 工程和 PCB 工具链已改用 KiCad 10.0.6（提交 b4f28e3），本表的 KiCad 部分（§5、§6、§7、§8.8、§9、§10 和 §1.3 / §3.4 里提到 KiCad 默认值的句子）跟着改成 10.0.6 的菜单名、快捷键、对话框字段、默认值和本地实测数字。逐项对照（8.0.9 怎么写、10.0.6 怎么写、依据是什么）见 `facts_kicad10.md`，下文的 `#数字` 指那份表里的编号。JLC / 嘉立创的制造和贴片能力（§1–§4）和 KiCad 版本无关，没有动。原来引用 KiCad 8 的来源（S11、S12、S30–S34 等）保留，方便核对旧的引用；新写的内容引用 S54 以后的新来源。

---

## 0. 来源列表（Source IDs）

S01–S53 的核对日期都是 2026-10-19；S54 以后是 2026-10-20 迁移到 KiCad 10.0.6 时加的（PCM 索引是 2026-10-19 的版本）。S30–S34 和 S11 / S12 是 KiCad 8 的来源，只用来对照旧写法。"页面日期"一栏是页面上自己写的更新日期（没有写就留空）。

| ID | 来源 | URL | 页面日期 |
|---|---|---|---|
| S01 | JLCPCB 刚性板制造能力（Rigid PCB Capabilities） | https://jlcpcb.com/capabilities/pcb-capabilities | — |
| S02 | 嘉立创 PCB/FPC/SMT 工艺能力总览 | https://www.jlc.com/portal/vtechnology.html | — |
| S03 | 嘉立创《技术指导：下单前技术员必看》 | https://www.jlc.com/portal/server_guide_112.html | 更新 2026-09-30 |
| S04 | JLCPCB 贴片能力（PCB Assembly Capabilities） | https://jlcpcb.com/capabilities/pcb-assembly-capabilities | — |
| S05 | JLCPCB 贴片报价构成（PCB Assembly Cost） | https://jlcpcb.com/help/article/pcb-assembly-price | 2026-09-09 |
| S06 | JLCPCB 贴片 FAQ | https://jlcpcb.com/help/article/pcb-assembly-faqs | 2026-09-09 |
| S07 | JLCPCB 贴片 FAQ（第 2 部分） | https://jlcpcb.com/help/article/pcb-assembly-faqs-part-2 | 2026-09-09 |
| S08 | JLCPCB BOM 文件要求 | https://jlcpcb.com/help/article/bill-of-materials-for-pcb-assembly | 2026-09-09 |
| S09 | JLC 官方 BOM 样例（xlsx） | https://static.jlcpcb.com//video/Sample-BOM_JLCSMT.xlsx | — |
| S10 | JLC 官方 CPL 样例（xlsx） | https://static.jlcpcb.com//video/JLCSMT_Sample_CPL1.xlsx | — |
| S11 | JLCPCB：KiCad 8 导出 Gerber 与钻孔（含截图） | https://jlcpcb.com/help/article/how-to-generate-gerber-and-drill-files-in-kicad-8 | 2026-09-09 |
| S12 | JLCPCB：KiCad 8 导出 BOM 与坐标文件 | https://jlcpcb.com/help/article/how-to-generate-bom-and-centroid-files-from-kicad-8 | 2026-09-09 |
| S13 | JLCPCB：KiCad 10 导出 BOM / 坐标（写明同样适用于 8、9） | https://jlcpcb.com/help/article/how-to-generate-the-bom-and-centroid-file-from-kicad | 2026-09-09 |
| S14 | JLCPCB PCB 生产时间 | https://jlcpcb.com/help/article/pcb-fabrication-services-and-production-time | 2026-09-09 |
| S15 | JLCPCB 如何下单 | https://jlcpcb.com/help/article/how-do-i-place-an-order | 2026-09-09 |
| S16 | JLCPCB 表面处理介绍 | https://jlcpcb.com/help/article/jlcpcb-surface-finish | 2026-09-09 |
| S17 | JLCPCB 基材介绍 | https://jlcpcb.com/help/article/jlcpcb-base-material | 2026-09-09 |
| S18 | JLCPCB 博客：玻璃化转变温度（Tg） | https://jlcpcb.com/blog/glass-transition-temperature | 2026-04-22 |
| S19 | JLCPCB 博客：铜箔（PCB Copper Foil） | https://jlcpcb.com/blog/pcb-copper-foil | 2026-09-28 |
| S20 | JLCPCB 博客：铜厚与线宽 | https://jlcpcb.com/blog/304-copper-weight-and-trace-width-finding-the-optimal-balance | 2026-02-05 |
| S21 | JLCPCB 博客：PCB 制造流程分步说明 | https://jlcpcb.com/blog/step-by-step-guide-to-the-printed-circuit-board-manufacturing-process | 2026-09-08 |
| S22 | JLCPCB 新闻：工厂参观（Robert Feranec） | https://jlcpcb.com/news/jlcpcb-factory-tour | 2024-01-29 |
| S23 | 嘉立创《PCB 多层板层压结构》（含阻抗计算用铜厚） | https://www.jlc.com/portal/server_guide_36372.html | 更新 2026-09-28 |
| S24 | 嘉立创《浅谈 PCB 铺铜相关情况》 | https://www.jlc.com/portal/server_guide_38573.html | 更新 2026-09-28 |
| S25 | JLCPCB：板上标记（How to mark on PCB） | https://jlcpcb.com/help/article/How-to-mark-on-PCB | 2026-05-22 |
| S26 | JLCDFM 在线 DFM 工具（dfm.jlcpcb.com 跳转到这里） | https://jlcdfm.com/ | — |
| S27 | JLCPCB PCB 材料页 | https://jlcpcb.com/resources/pcb-material | — |
| S28 | PCBONLINE：双层板叠层 | https://www.pcbonline.com/blog/2-Layer%20PCB-Stackup.html | — |
| S29 | Altium：Core 与 Prepreg | https://resources.altium.com/it/p/pcb-core-vs-prepreg-material-what-designers-need-to-know | — |
| S30 | KiCad 8.0 PCB 编辑器文档（英文） | https://docs.kicad.org/8.0/en/pcbnew/pcbnew.html | 8.0 |
| S31 | KiCad 8.0 原理图编辑器文档（英文） | https://docs.kicad.org/8.0/en/eeschema/eeschema.html | 8.0 |
| S32 | KiCad 9.0 PCB 编辑器文档（只用来对比） | https://docs.kicad.org/9.0/en/pcbnew/pcbnew.html | 9.0 |
| S33 | KiCad 8.0 简体中文翻译：8.0 分支的 `zh_CN.po`，并与本机安装的 KiCad 8.0.9 `kicad.mo` 交叉核对 | https://gitlab.com/kicad/code/kicad/-/raw/8.0/translation/pofiles/zh_CN.po | 8.0 分支 |
| S34 | KiCad 8.0 源码（菜单、默认值）：`pcbnew/menubar_pcb_editor.cpp`、`pcbnew/zones.h`、`include/board_design_settings.h`、`common/netclass.cpp`、`pcbnew/exporters/place_file_exporter.cpp` | https://gitlab.com/kicad/code/kicad/-/tree/8.0 | 8.0 分支 |
| S35 | Bouni/kicad-jlcpcb-tools README | https://github.com/Bouni/kicad-jlcpcb-tools | — |
| S36 | bennymeg Fabrication Toolkit README | https://github.com/bennymeg/JLC-Plugin-for-KiCad | — |
| S37 | KiCad 官方插件仓库索引（PCM packages-v1.json） | https://gitlab.com/kicad/addons/repository/-/raw/main/packages-v1.json | 索引更新 2026-10-16 |
| S38 | Freerouting README | https://github.com/freerouting/freerouting | — |
| S39 | Freerouting 与 KiCad 等 EDA 的集成说明 | https://github.com/freerouting/freerouting/blob/master/docs/integrations.md | — |
| S40 | KiCad 论坛：KiCad 9.0.1 + Freerouting 2.0.1 设计规则没有传过去 | https://forum.kicad.info/t/solved-kicad-9-01-freerouting-2-01-drc-not-transferred/60202 | 2025-04-08/09 |
| S41 | KiCad 论坛：自动布线忽略铺铜 | https://forum.kicad.info/t/autorouting-ignore-copper-fills/45134 | 2023-09-25 |
| S42 | Advanced Circuits（4pcb）线宽计算器（写出了 IPC-2221 公式） | https://www.4pcb.com/trace-width-calculator.html | — |
| S43 | Altium：IPC-2221 计算器与局限 | https://resources.altium.com/p/ipc-2221-calculator-pcb-trace-current-and-heating | 2025-06-26 |
| S44 | Altium：双层板上的 USB 2.0 走线 | https://resources.altium.com/p/routing-requirements-usb-20-2-layer-pcb | 2025-12-01 |
| S45 | TI SLLA414A《High-Speed Layout Guidelines for Signal Conditioners and USB Hubs》 | https://ti.com/lit/slla414 | 2026-01 修订 |
| S46 | Espressif ESP32-S3 硬件设计指南：PCB 布局 | https://docs.espressif.com/projects/esp-hardware-design-guidelines/en/latest/esp32s3/pcb-layout-design.html | latest |
| S47 | ESP32-S3-WROOM-1/1U 数据手册 v1.8（2026-03-02），本地 | `ds/esp.txt`（PDF：`ds/esp32-s3-wroom-1_wroom-1u_datasheet_en.pdf`） | v1.8 |
| S48 | TI DRV8833 数据手册 SLVSAR1E（2015-07 修订），本地 | `ds/drv.txt`（PDF：`ds/drv8833.pdf`） | Rev E |
| S49 | TP4056 数据手册 REV_2.4（南京拓品），本地 | `ds/tp.txt` | REV 2.4 |
| S50 | ST USBLC6-2 数据手册，本地 Doc ID 11265 Rev 5（2011-10）；在线版 DS4260 Rev 7（2021-12-24） | `ds/usb.txt`；https://www.st.com/resource/en/datasheet/usblc6-2.pdf | Rev 5 / Rev 7 |
| S51 | AP2112 数据手册（Diodes DS39724 Rev 2-2，U3 换型后；原为 ME6211 本地手册 `ds/me.txt`） | https://www.diodes.com/assets/Datasheets/AP2112.pdf | — |
| S52 | ESP32-S3 芯片数据手册 v2.2，本地 | `ds/chip.txt` | v2.2 |
| S53 | 用户 QB12 工程文件（本地） | `S/pcb/pkg/QB12_KiCad/QB12.kicad_pro`、`S/pcb/export_jlc.sh`、`S/pcb/jlc/`。迁移到 KiCad 10 以后对应仓库里的 `hardware/pcb/out/QB12.kicad_pcb`、`hardware/pcb/out/QB12.kicad_pro`、`hardware/pcb/export_jlc.sh`、`outputs/QB12/`、`courses/pcb/data/board.json` | 2026-10 |
| S54 | KiCad 10.0.6 简体中文翻译：本机安装的 zh_CN `kicad.mo`（用仓库 `.venv` 里的 polib 读）。facts_kicad10.md 里记作 K-mo | `~/Applications/KiCad/KiCad.app/Contents/SharedSupport/internat/zh_CN/kicad.mo` | 10.0.6 |
| S55 | KiCad 10.0.6 源码，tag 10.0.6（commit caf7377e）：`pcbnew/menubar_pcb_editor.cpp`、`pcbnew/tools/pcb_actions.cpp`、`common/tool/actions.cpp`、`pcbnew/dialogs/dialog_*_base.cpp`、`include/board_design_settings.h`、`pcbnew/board_design_settings.cpp`、`pcbnew/drc/drc_item.cpp`、`pcbnew/exporters/place_file_exporter.cpp`。记作 K-src | https://gitlab.com/kicad/code/kicad/-/tree/10.0.6 | 10.0.6 |
| S56 | KiCad 10.0 PCB 编辑器文档（英文）。行号指转成纯文本后的行。记作 D10 | https://docs.kicad.org/10.0/en/pcbnew/pcbnew.html | 10.0 |
| S57 | KiCad 10.0 项目管理器文档。记作 D10-k | https://docs.kicad.org/10.0/en/kicad/kicad.html | 10.0 |
| S58 | KiCad 10.0 命令行文档，加上本机 `kicad-cli --help`（10.0.6）。记作 D10-cli | https://docs.kicad.org/10.0/en/cli/cli.html | 10.0 |
| S59 | 本机 KiCad 10.0.6 实测（2026-10-20）：pcbnew Python 新建板读默认值；对 `out/` 和 `pkg/QB12_KiCad` 的副本跑 kicad-cli DRC；解压 `outputs/QB12/QB12_Gerber.zip` 看文件头。记作 T | scratchpad（不在仓库里）；DRC 结果另存在 `hardware/pcb/out/QB12_drc.json` 和 `data/board.json` 的 `drc` 字段 | 2026-10-20 |
| S60 | KiCad 官方插件仓库索引 packages-v1.json（2026-10-19 版本）。记作 PCM | https://gitlab.com/kicad/addons/repository/-/raw/main/packages-v1.json | 索引更新 2026-10-19 |
| S61 | Bouni 自己的 PCM 仓库索引。记作 PCM-b | https://github.com/Bouni/kicad-jlcpcb-tools | 2026.04.03 |
| S62 | KiCad 9 和 10 的版本发布博客。记作 B9 / B10 | https://www.kicad.org/blog/ | — |
| S63 | JLCPCB：KiCad 9 导出 Gerber 与钻孔（9.0.4 上测的）。⚠ 只看过 WebFetch 给的摘要，没逐字核对。记作 J9 | https://jlcpcb.com/help/article/how-to-generate-gerber-and-drill-files-in-kicad-9 | 2026-09-24 |
| S64 | KiCad 8.0.9 的 zh_CN.po（tag 8.0.9，用来对比旧译名）。记作 K-po8 | https://gitlab.com/kicad/code/kicad/-/raw/8.0.9/translation/pofiles/zh_CN.po | 8.0.9 |
| S65 | KiCad 8.0.9 源码，tag 8.0.9（commit 9c4f534c），文件同 S55。记作 K-src8 | https://gitlab.com/kicad/code/kicad/-/tree/8.0.9 | 8.0.9 |
| S66 | KiCad 论坛：9.0 起 Plot 对话框里找不到 Tent vias（只看过搜索摘要） | https://forum.kicad.info/t/59155 | — |
| S67 | KiCad 8.0.9 → 10.0.6 核对表（本仓库） | `courses/pcb/facts_kicad10.md` | 2026-10-20 |

---

## 1. JLCPCB / 嘉立创 标准双层板制造能力

### 1.1 速查表（JLCPCB 国际站 vs 嘉立创 国内站）

两站的数字大多相同。不同的地方标了 ⚠。

| 项目 | JLCPCB（jlcpcb.com）[S01] | 嘉立创（jlc.com）[S02][S03] |
|---|---|---|
| 层数 | 1–32 层 | 1–64 层 ⚠ |
| 板材 | FR-4，A 级板料（南亚 Nan Ya、建滔 KB、生益 Shengyi 等） | FR4（A 级），板料有南亚、建滔 KB、生益、宏瑞兴等 |
| 最小线宽 / 线距（1 oz，1–2 层） | 0.10 / 0.10 mm（4 / 4 mil） | 单双面板 0.10 / 0.10 mm（4 / 4 mil） |
| 最小线宽 / 线距（2 oz，2 层） | 0.16 / 0.16 mm（6.5 / 6.5 mil） | 0.16 / 0.16 mm |
| 线宽公差 | ±20%（例：0.1 mm 线做出来 0.08–0.12 mm） | ±20% |
| 钻孔范围（2 层） | 0.15–6.3 mm；0.1 mm 只用于板厚 ≤1 mm 且做 ENIG/OSP | 0.15–6.3 mm，标注"0.15 mm 非常规！费用高请慎用"⚠；0.1 mm 微孔只用于 2–12 层、板厚 ≤1 mm、只能沉金 |
| 大孔 | ≥6.3 mm 的孔用 CNC 从小孔扩铣 | ≥6.5 mm 的钻头孔改用扩孔 / 锣边加工 ⚠（门槛写法不同） |
| 最小过孔 孔径 / 外径（2 层） | 0.15 / 0.25 mm | 0.15 mm（内径）/ 0.25 mm（外径） |
| 过孔外径 − 孔径 | 至少大 0.1 mm，推荐大 0.15 mm | 外径必须比内径大 0.1 mm，推荐大 0.15 mm 以上 |
| 推荐最小过孔 | 0.2 mm | "最小孔推荐 0.2 mm 以上"；双面板用非常规孔径时，过孔需要塞油墨（树脂）⚠ |
| 加价过孔 | 孔径 0.1 / 0.15 mm（不论外径），或孔径 0.2 / 0.25 mm 且外径 <0.45 mm，都要加钱 | 能力页没写同样的表 |
| 金属化孔（PTH）孔径公差 | +0.13 / −0.08 mm（例：0.6 mm 孔做出来 0.52–0.73 mm 合格） | 插件孔 +0.13 / −0.08 mm；**过孔不管控公差**，插件孔请按负公差设计 [S03] |
| 非金属化孔（NPTH） | 最小 0.50 mm | NPTH 孔径公差 ±0.1 mm；插件孔、NPTH 孔宜 ≥0.5 mm |
| 孔位公差 | ±0.075 mm | 能力页未列 |
| 平均孔铜厚 | 18 µm | 能力页未列 |
| PTH 焊环（2 层 1 oz） | 推荐 ≥0.25 mm，绝对最小 0.18 mm（表头写 ≥0.20 mm） | 推荐 ≥0.25 mm，极限 0.18 mm |
| NPTH 焊环 | ≥0.45 mm（孔周 0.2 mm 的铜会被掏掉，用来贴封孔膜） | ≥0.45 mm（干膜封孔，孔周掏空 0.2 mm） |
| 孔边到孔边 | 过孔 0.2 mm；焊盘孔 0.45 mm | 过孔 0.2 mm；插件孔 0.45 mm |
| 板厚范围 | 0.4–4.5 mm；FR-4 可选 0.4 / 0.6 / 0.8 / 1.0 / 1.2 / 1.6 / 2.0 mm（2.5 mm 及以上只用于 12 层以上）。⚠ 同一页 FAQ 却写"标准厚度 0.4–3.2 mm" | 0.4–4.8 mm，"以系统可选项为准" ⚠ |
| 板厚公差 | ≥1.0 mm：±10%（1.6 mm 板做出来 1.44–1.76 mm）；<1.0 mm：±0.1 mm | 同 |
| 外层成品铜厚（2 层） | 1 / 2 / 2.5 / 3.5 / 4.5 oz | 1 / 2 / 2.5 / 3.5 / 4.5 / 5 / 6 oz ⚠ |
| 默认外层铜厚 | 能力页没写默认值；JLC 博客说 1 oz 是"almost every quick-turn order"的默认外层铜厚、不加价 [S19][S20] | 能力页没写 |
| 阻焊类型 / 颜色 | 感光阻焊 LPI；绿、紫、红、黄、蓝、白、黑 | 感光油墨：绿、紫、红、黄、蓝、白、黑 |
| 阻焊桥（Solder mask dam）1 oz | 焊盘间距 ≥0.10 mm（绿、红、黄、蓝、紫）；≥0.13 mm（黑、白） | 同 |
| 阻焊桥 2 oz | ≥0.20 mm（所有颜色） | 同 |
| 阻焊开窗（Solder mask expansion） | 1:1（2025 年 6 月升级 LDI 设备；返单沿用旧生产稿）；开窗到相邻走线 ≥0.09 mm | 2025 年 6 月升级 LDI，焊盘与开窗 1:1；"开窗比焊盘单边 ≥0 mm"；焊盘边到线边 ≥0.09 mm |
| 阻焊厚度 | ≥10 µm | ≥10 µm |
| 丝印最小线宽 | ≥0.15 mm（"低于 0.15 mm 无法辨认"） | ⚠ 能力页写"字符粗细 ≥0.1 mm"；但《下单前必看》写"常规字体线宽 ≥0.15 mm，高 ≥1 mm（选'高精字符'时最小线宽 0.1 mm、高 0.8 mm）"，还说"常规字体字粗不够 0.1 mm 的我们加宽到 0.1 mm" [S03] |
| 丝印最小字高 | 1.0 mm（40 mil） | ≥1 mm（特殊字体、中文、镂空字需要更高） |
| 字宽高比 | 推荐 1:6 | — |
| 字符到焊盘 | ≥0.15 mm | ≥0.15 mm（不够的地方会把字符掏掉） |
| 镂空字 | 宽高比 1:6 | 线宽 ≥0.2 mm，字高 ≥1.5 mm [S03] |
| 表面处理 | 有铅喷锡 HASL（leaded）、无铅喷锡（lead-free HASL）、沉金 ENIG、OSP（单面 FR-4 不支持 OSP） | 有铅喷锡、无铅喷锡、沉金、OSP（单面 FR4 暂不支持 OSP） |
| 默认表面处理 | **能力页和表面处理 FAQ 都没写默认值**。生产时间表用"1.6 mm、1 oz、HASL、绿油、白字"做基准配置 [S14] | 能力页没写 → 下单页确认 |
| 外形公差 | CNC 锣边 ±0.2 mm（普通）/ ±0.1 mm（精锣）；V 割 ±0.4 mm | 普锣 ±0.2 mm / 精锣 ±0.1 mm；V 割 ±0.4 mm |
| 精锣条件 | 单片 ≥50 × 50 mm，不同角上至少 3 个 ≥1.5 mm 的定位孔 | 同 |
| 最小 / 最大尺寸 | 最小 3 × 3 mm（FR-4，板厚 ≥0.6 mm；更薄的人工评审）；2 层最大 670 × 600 mm（特殊情况 1020 × 600 mm） | 最小 3 × 3 mm；2 层最大 670 × 600 mm（1020 × 600 mm 限指定工厂） |
| 铜到板边（锣边） | ≥0.2 mm（到锣槽也是 ≥0.2 mm） | 走线和焊盘离板边 ≥0.2 mm |
| 铜到板边（V 割） | ≥0.4 mm | ≥0.4 mm |
| 阻抗控制 | 只做 4 / 6 / 8 / … / 32 层；公差 ±10% | 多层板支持阻抗设计（±10% 收费）。**双层板不在可控阻抗范围内** |
| FR-4 介电常数 Dk | 2 层板 4.5；7628 PP 4.4、3313 PP 4.1、2116 PP 4.16 | — |
| 焊盘到走线（1 oz） | ≥0.1 mm | ≥0.1 mm（尽量大于此值） |
| 过孔孔边到走线 | 0.2 mm | — |
| PTH 到走线 | 最小 0.28 mm，推荐 0.35 mm | — |
| NPTH 到走线 | 0.2 mm | — |
| SMD 焊盘间距（不同网络） | 0.15 mm；最小 SMD 焊盘 0.25 × 0.25 mm | — |
| 网格铺铜线宽 / 间距 | 0.25 mm | — |
| Gerber 格式 | KiCad 8 教程的截图里不勾 X2 [S11]；KiCad 9 教程勾了 X2 [S63]（只看过摘要）；JLC 没有 KiCad 10 的 Gerber 教程 | ⚠ **只接受 RS-274-X，不支持 Gerber X2 和 RS-274-D** [S03] |
| 板上默认标记 | ⚠ "No mark will be added on the PCB by default"（默认不加标记；可选二维码 / 序列号）[S25] | ⚠ "我们默认会在板中丝印层适当位置添加客编，客户在下单时也可以选择指定位置添加客编（或二维码）"[S03] |

### 1.2 拼板（Panelization）[S01][S02]

- **V 割（V-cut）**：默认拼板间距为 0。也可以一个方向 V 割、另一个方向用 1.6 或 2 mm 间距锣开。拼板最小 70 × 70 mm、最大 475 × 475 mm；V 割槽角 25°。相邻两条 V 割线最小 2 mm（推荐 3 mm）。嘉立创默认双面 V 割，不做单面 V 割 [S03]。
- **邮票孔（Mouse bites）**：拼板间距 1.6 或 2 mm，分板后会留下锯齿边。推荐邮票孔直径 0.5–0.8 mm，孔间距 0.2–0.3 mm。连接筋最小宽 4 mm，带邮票孔的最小 5 mm。
- **工艺边（Tooling edge / rails）**：最小 3 mm。**在 JLC 做 SMT 时**：工艺边 5 mm，定位孔 2 mm，Mark 点（fiducial）1 mm，Mark 点中心离拼板边 3.85 mm。嘉立创写法相同："我司 SMT 需要 5 mm 宽，光点 1 mm，定位孔 2 mm，光点到板边 3.85 mm"。
- 普通拼板间距 ≥2 mm [S01]。JLC FAQ 还建议工艺边 5–8 mm [S01]。
- 一个文件里有几款不同的板（拼板款数），要如实填写，否则后果自负 [S03]。JLC 帮你拼不同款时收 Panel 费（报价表写 $8.21，"拼板款数 >1 时收取"）[S05]，价格下单时确认。

### 1.3 对 QB12 的直接含义（据上表推导）

- 56 × 38 mm 远大于最小尺寸 3 × 3 mm。1.6 mm 是标准板厚。成品板厚合格范围是 1.44–1.76 mm [S01]。
- QB12 现在的规则（`QB12.kicad_pro`）[S53]：最小间距 0.15 mm、最小线宽 0.15 mm、最小过孔外径 0.5 mm、最小通孔 0.3 mm、铜到板边 0.3 mm、孔到孔 0.25 mm。这些都在 JLC 标准能力以内（0.10 / 0.10 mm，过孔 0.15 / 0.25 mm，锣边 0.2 mm）。铜到板边 0.3 mm 正好等于 JLC 对经济型贴片的建议值（见 4.1）。
- KiCad 10 默认网络类的过孔是 0.6 / 0.3 mm，和 KiCad 8 一样 [S34 `netclass.cpp`][S59]。按 JLC 规则这属于"不加价"过孔：孔径 0.3 mm ≥ 0.2 mm，外径 0.6 mm ≥ 0.45 mm [S01]。

---

## 2. 双层板是怎么做出来的（按工序）

说明：JLC 博客的 18 步表 [S21] 是**通用 / 多层板**流程。其中"内层成像、内层蚀刻、内层 AOI、层压"这些步骤，**双层板没有**：双层板直接用一张双面覆铜板（CCL）。双层板的顺序按 JLC 工厂参观文 [S22]、JLC 博客 [S21] 和嘉立创工艺表"线路制作：图形电镀（镀锡正片工艺）"[S02] 整理如下。

| # | 工序（中文 / English） | 做什么 | 来源 | 对设计者的意义（一句话） |
|---|---|---|---|---|
| 0 | CAM / DFM 审核（CAM & DFM） | 工厂检查 Gerber 的线宽线距、焊盘、孔径、铜到板边、阻焊开窗、外形、层对位等能不能做 | [S21] 第 1 步 | 设计规则一开始就按厂家能力设，审核才不会退回或被工程师改稿 |
| 1 | 开料（Cutting） | 原材料裁成标准尺寸的大板，边缘倒圆，清洁 | [S22] | 板子大小和拼板方式决定材料利用率，也就决定了价格 |
| 2 | 钻孔（Drilling） | CNC 钻机按钻孔文件钻孔，几台同时钻；板上盖一块铝板，帮助散热、提高钻孔精度 | [S22]；精度 [S01] | 孔径、孔到孔间距（过孔 0.2 / 焊盘孔 0.45 mm）、孔位公差（±0.075 mm）都在这一步定下来；钻孔文件出错这一步就错 |
| 3 | 去钻污 + 沉铜（Desmear + Electroless Cu / PTH） | 先清除孔壁的树脂残渣，再化学沉一层薄铜，让孔壁能导电 | [S21] 第 8–9 步 | 过孔、插件孔"金属化"靠这一步。孔越小、板越厚越难镀（0.15 mm 孔在嘉立创算"非常规"[S02]） |
| 4 | 全板电镀（Panel plating，嘉立创叫"板电"） | 电镀加厚孔壁和整板表面的铜 | [S21] 第 9 步："Electroplating then builds up the copper thickness on the hole walls and exposed copper surfaces." | 外层成品铜厚 = 底铜 + 电镀铜（工厂常用 0.5 oz 铜箔电镀到 1 oz [S19]），所以外层铜厚的偏差比内层大 |
| 5 | 外层图形转移（Imaging：贴干膜、曝光、显影） | 板面贴光敏干膜，紫外曝光后显影，露出要留铜的线路区（正片工艺） | [S21] 第 10 步；嘉立创 2025-06 升级 LDI（激光直接成像）设备 [S02] | 最小线宽 / 线距（0.10 / 0.10 mm）受成像和蚀刻精度限制 |
| 6 | 图形电镀（Pattern plating：镀铜 + 镀锡） | 在露出的线路上再镀铜，然后镀一层锡当临时抗蚀层 | [S21] 第 11 步；[S02]"图形电镀（镀锡正片工艺）" | 电镀电流在整板上不均匀 [S19]，铜分布尽量均匀；孤立细线和大铜面的镀层厚度会不一样 |
| 7 | 退膜 → 蚀刻 → 退锡（Strip / Etch / Tin strip） | 去掉干膜，蚀刻掉没有锡保护的铜，再把锡退掉，露出铜线路 | [S21] 第 12 步；[S22] | 蚀刻控制线宽：过蚀线变细，欠蚀留短路残铜。所以有 ±20% 线宽公差 [S01]，铜越厚最小线距越大 |
| 8 | AOI 自动光学检测（Automated Optical Inspection） | 拍高分辨率图像，和 Gerber 对比，找开路、短路、缺铜、多铜 | [S21] 第 6、12 步；[S22] | AOI 以你的 Gerber 为"标准答案"。Gerber 本身错了，AOI 查不出来 |
| 9 | 阻焊（Solder mask，LPI 感光油墨） | 涂油墨、曝光、显影出焊盘开窗，烘烤固化 | [S21] 第 13 步；[S01] | 阻焊桥（1 oz 绿油 ≥0.10 mm，黑 / 白 ≥0.13 mm）决定细间距 IC 的引脚之间能不能留住阻焊；过孔盖油 / 开窗也在这一步 |
| 10 | 字符 / 丝印（Silkscreen / Legend） | 印位号、极性、Logo 等，再固化 | [S21] 第 14 步 | 线宽 ≥0.15 mm、字高 ≥1.0 mm、离焊盘 ≥0.15 mm [S01]；KiCad 默认丝印字粗只有 0.1 mm（见 6.4） |
| 11 | 表面处理（Surface finish：喷锡 / 沉金 / OSP） | 保护裸露焊盘不氧化，并提供可焊性 | [S16] | 喷锡（HASL）便宜，但表面不平，不适合细间距和 BGA；沉金（ENIG）平整，价格受金价影响 [S16] |
| 12 | 电测（Electrical test，飞针 Flying probe 等） | 按设计检查网络的通断 | [S21] 第 16 步 | 只能测出"和设计不一致"的地方，设计本身错了测不出来。2 层 FR-4 是飞针全测还是抽测，以下单页为准 |
| 13 | 成型（Profiling：CNC 锣边 / V 割） | 按外形把大板分成单板或拼板 | [S21] 第 17 步 | 锣边 ±0.2 mm、V 割 ±0.4 mm；铜要离板边 ≥0.2 mm（锣）/ ≥0.4 mm（V 割）[S01] |
| 14 | 终检（FQC / Final quality check）+ 包装 | 外观检查、包装、出货 | [S21] 第 18 步 | 嘉立创字符按 IPC 二级标准验收，"类似工艺品超高清晰要求的字符不能满足"[S03] |

补充：
- JLC 博客正文 [S21] 写的孔位公差是 ±0.05 mm，还写"标准刚性板不支持盲埋孔"。这两点和能力页 [S01] 冲突（能力页写 ±0.075 mm，并列出了 HDI 盲埋孔能力）。**以能力页为准**。
- 博客 [S21] 写的是"菲林 + 曝光"的通用流程。JLC 能力页 [S01] 和嘉立创 [S02] 都写了"2025 年 6 月升级 LDI"。课程里如果讲成像方式，建议写"传统用菲林，现在 JLC 用 LDI 激光直接成像"，不要说得太绝对。
- 嘉立创强调用"干膜工艺"（所有无铜孔都要在孔外围掏空 0.2 mm）[S03]，并反对负片工艺 [S02]。

---

## 3. FR-4 基础

### 3.1 名词

- **FR-4**：环氧树脂 + 玻璃纤维布的层压材料，FR = flame retardant（阻燃）[S17]。刚性板最常用的基材 [S17]。
- **芯板（Core）**：完全固化的板材，两面都覆了铜箔 [S29]。
- **半固化片（Prepreg，PP）**：浸了树脂的玻纤布，树脂处于"已硬化但未完全固化"的状态。层压时受热流动并粘接相邻层，所以常被叫作"胶"[S29]。层压时 PP 树脂会熔化，填进铜层之间的空隙后固化 [S21] 第 7 步、[S24]。
- **双层板**：一般就是**一张双面覆铜芯板（CCL）**，不需要 PP 层压。S28 给的典型 1.6 mm 双层板是"约 1.5 mm FR-4 芯板 + 两面各 1 oz 铜"。嘉立创写"1.6 mm 板厚 8 张布"[S02]，即 1.6 mm 板里叠了 8 层玻纤布（这是对原文的字面理解，没有官方展开说明）。

### 3.2 铜厚：1 oz 是什么

- 1 oz 铜 = 1 盎司铜均匀铺在 1 平方英尺上，厚度约 **34.8 µm（1.37 mil）**，一般取整为 **35 µm** [S19]。2 oz ≈ 70 µm [S20]。
- 1 oz 铜的方块电阻约 0.48 mΩ/□ [S19]。
- 外层"成品铜厚"= 铜箔 + 电镀，所以外层铜厚的波动比内层大 [S19]。
- 嘉立创做阻抗计算时，外层成品 1 oz 按 **1.6 mil（≈40.6 µm）**取值 [S23]；但嘉立创铺铜文章的厚度算例里，外层成品铜按 1.4 mil 计 [S24]。⚠ 同一家用了两套建模假设，课程里写"约 35 µm（1 oz 名义值）"最稳妥。
- 4pcb 计算器用 1 oz = 1.378 mil 换算截面积 [S42]（本表 8.1 也用这个值）。

### 3.3 Tg（玻璃化转变温度）

- 定义：树脂从坚硬的玻璃态变成柔软的橡胶态的温度。Tg 不是熔点 [S18]。
- 普通 FR-4 的 Tg ≈ **130–140 °C（DSC 测）**；中 Tg 150–155 °C；高 Tg 170–180 °C [S18]。
- JLC 基材页把标准 FR-4 写作 **TG130**，多层板可选高 Tg（TG155）[S17]。材料页写"FR-4 Standard (TG130-170)"[S27]。HDI 用 Tg170 板料 [S01]。⚠ 写课时用"约 130–140 °C"这个区间。
- 无铅回流峰值温度 245–260 °C，远高于 Tg。Tg 低的板在回流时 Z 向膨胀和应力更大 [S18]。标准 FR-4 的 Td（分解温度，失重 5%）约 300–310 °C [S18]。
- JLC 博客认为消费电子、IoT、简单双层板用标准 FR-4（Tg 130–140 °C）就够了 [S18]。

### 3.4 典型 1.6 mm 双层板叠层（教学用近似值）

| 层 | 典型厚度 | 依据 |
|---|---|---|
| 顶层阻焊（F.Mask） | ≥10 µm | [S01] 阻焊厚度 ≥10 µm |
| 顶层铜（F.Cu） | 1 oz ≈ 35 µm | [S19] |
| 芯板（FR-4 Core） | ≈1.5 mm | [S28] |
| 底层铜（B.Cu） | 1 oz ≈ 35 µm | [S19] |
| 底层阻焊（B.Mask） | ≥10 µm | [S01] |
| **合计** | 1.6 mm 名义值，公差 ±10%（1.44–1.76 mm） | [S01] |

- JLC 给的 2 层板 FR-4 Dk = 4.5 [S01]。
- KiCad 10 新建板默认板厚 1.6 mm（`DEFAULT_BOARD_THICKNESS_MM 1.6`），和 KiCad 8 一样 [S34][S55 `board_design_settings.h`][S59]。

---

## 4. JLC SMT 贴片（PCBA）

### 4.1 经济型（Economic）vs 标准型（Standard）

| 项目 | 经济型（EN [S04]） | 标准型（EN [S04]） | 嘉立创国内站的写法 [S02] |
|---|---|---|---|
| 贴片面 | 只能单面（SMT / 插件） | 单面或双面 | 同 |
| 层数 | 2、4、6 层 | 1–32 层 | 经济 2/4/6；标准不限 |
| 板厚 | 0.8–1.6 mm | 不限 | 同 |
| 单板尺寸 | 10 × 10 – 470 × 500 mm | **70 × 70** – 460 × 500 mm | ⚠ 经济 10 × 10 – 470 × **570**；标准 70 × 70 – 460 × **510** |
| 拼板尺寸 | 10 × 10 – 250 × 250 mm | 70 × 70 – 250 × 250 mm | — |
| 数量 | 2–50 pcs | 2–80000 pcs | ⚠ 经济"样板（≤30（50）大片）"；标准"2 片起贴，无上限" |
| 出货方式 | 单板、邮票孔拼板 | 单板、邮票孔拼板、V 割拼板 | 同 |
| 叠层 | 只能标准叠层 | 全部 | — |
| 金手指 / 半孔 / 包边 | 不支持 | 支持 | — |
| 工艺边 | 不需要 | 需要 | 同 |
| Mark 点 | 不需要 | 需要 | 同 |
| 最小封装 | 0402 | 01005 | 同 |
| 最小 IC 引脚间距 | 0.4 mm | 0.35 mm | 同 |
| 最小 BGA 间距 | 0.5 mm（中心距） | 0.3 mm | ⚠ 标准型写 0.35 mm |
| 回流温度 | 255 ± 5 °C（不可调） | 240 ± 5 °C | ⚠ 标准型分三档：低温 170–190 °C、中温 210–240 °C、高温 240–260 °C |
| SPI 锡膏检测 | 无 | 有 | 同 |
| AOI | ⚠ 有 | 有 | ⚠ 经济型写"无"，标准型写"单独检测" |
| X-ray | 只对某些器件（如 BGA） | 同左 | 标准型列出 X-ray / SPI / AOI / FCT / ICT / 飞针 |
| 生产时间（Build time） | 1–3 天 | ≥4 天 | — |

经济型对 PCB 本身的规格有限制 [S04]。下表是 1.6 mm 那几行（网页表格的"层数"列没有渲染出来，但顺序和"2、4、6 层"对得上，推测前几行是 2 层）：1.6 mm 绿油 → 无铅 / 有铅喷锡或沉金，2–50 pcs；1.6 mm 黑油 → 喷锡，2–50；1.6 mm 蓝 / 紫 → 喷锡，5–30；1.6 mm 红 / 白 → 只有有铅喷锡，5–30。⚠ 下单时以页面可选项为准。

**对 QB12（56 × 38 mm）的含义**：
- 经济型可以直接单板贴：≥10 × 10 mm，1.6 mm 在 0.8–1.6 mm 以内，2 层。
- 标准型的单板最小 70 × 70 mm。要走标准型就得拼板或加工艺边，凑到 ≥70 × 70 mm。
- 经济型只贴一面，所以所有贴片件要放在同一面。QB12 的导出脚本本来就只导出顶面（`--side front`）[S53]。
- 经济型分板有约 0.2 mm 公差，JLC 建议"走线和元件边缘离板边 >0.3 mm"[S07] 第 14 条。

### 4.2 基础库 / 扩展库 / 优选扩展库（Basic / Extended / Preferred Extended）

- **基础库（Basic）**：常用的阻容等。它们一直装在贴片机的固定料站（feeder）上，不需要换料，所以不收人工费 [S06] 第 6 条。
- **扩展库（Extended）**：需要操作员手动上料。⚠ **每"种"扩展料收一次换料费，金额两处官方写法不同**：FAQ 写"$3 per extended component"[S06]；报价构成页写经济型"Feeder Loading $3.07 Extend"[S05]。两页都标"Last updated Sep 09, 2026"。报价页还说明"Prices may vary slightly due to exchange rate fluctuations"（价格随汇率变）。→ 课程里写"约 3 美元 / 种，以下单页为准"。
- **标准型**：基础料和扩展料都要上料，报价页写"$1.53 Basic/Extend"（每种）[S05]。
- **优选扩展库（Preferred Extended）**：以前是基础料，现在归入扩展库（Preferred）。在**经济型**里免换料费 [S06] 第 7 条。
- 元件库规模（会变）：FAQ 写"about 40k+ kinds of components … including 698 kinds of basic components and 300k+ extended components"[S06]。⚠ 这句话自相矛盾（40k+ 却又含 300k+），不要引用具体数字。
- 嘉立创国内站的基础 / 扩展库换料费：jlcsmt.com 的 TLS 证书校验失败，robots 也禁止抓取，所以**没能核实** → 列入第 10 节。

### 4.3 主要费用项（只用于说明费用结构，金额以下单页为准）[S05]

| 费用 | 经济型 | 标准型 |
|---|---|---|
| 工程费（Setup fee） | $8.18 | $25.56 单面 / $51.12 双面 |
| 钢网（Stencil，不随货发） | $1.53 | $8.21 单面 / $16.42 双面 |
| SMT 焊点费 | $0.0016 / 点（1–100,000 点） | $0.0016 → $0.0012 / 点（按量阶梯） |
| 手工焊人工费 | $3.58 / 单 | $3.58 / 单 |
| 换料费 | $3.07 / 种（扩展料） | $1.53 / 种（基础 + 扩展料） |
| 确认贴片位置（Confirm Parts Placement） | $0.45 | $0.45 |
| 治具（Fixture） | — | $8.21 / 个，1–29 pcs 要 2 个 |
| 手续费（Handling fee） | — | 当经济型和标准型都可选时，两者总价差不足 $14.93 的部分按手续费补齐 |

⚠ FAQ [S06] 第 1 条写的是另一套数字（工程费 $8.00、钢网 $1.50、$0.0017 / 点、手工焊 $3.5、手工 $0.0173 / 点），和报价页 [S05] 不一致，两页日期相同。课程里**只讲费用由哪些项组成**，不要写具体金额。
- 最便宜的 PCB 价"$2 for 5pcs, 2-layer, ≤10 × 10 cm"[S15]。⚠ 是促销价，会变。

### 4.4 文件：Gerber + BOM + CPL [S06] 第 8 条

**BOM（物料清单）**
- 必须有的列 [S08]：**Comment**（型号 / 规格 / 值）、**Designator**（位号）、**Footprint**（封装）。格式推荐 .csv / .xls / .xlsx。
- 位号**不要靠大小写区分**，生产时会全部转成大写 [S08]。
- 官方样例 BOM 的表头原文 [S09]：`Comment | Designator | Footprint | JLCPCB Part #（optional）`。同一种料的多个位号写在一格里，用逗号分开（例：`R5,R6`）。
- 料号列：KiCad 10 导出教程要求表头 `LCSC Part #`，并要求 BOM 有"Comment、Designator、Footprint 和 JLCPCB / LCSC Part #"[S13]；KiCad 8 教程写 `LCSC PN` [S12]。Fabrication Toolkit 能识别 `LCSC Part #`、`LCSC PN`、`JLCPCB Part #` 等十几种写法 [S36]。→ 课程统一用 **`LCSC Part #`**（QB12 现在的 BOM 表头就是 `Comment,Designator,Footprint,Quantity,LCSC Part #`）[S53]。

**CPL / 坐标文件（Pick & Place / Centroid）**
- JLC 要的列：**Designator, Mid X, Mid Y, Rotation, Layer**，单位 mm [S13]。
- 官方样例 CPL 的表头和行原文 [S10]：`Designator | Mid X | Mid Y | Layer | Rotation`，例：`C1 | 95.0518mm | 22.6822mm | Top | 270`（坐标带 "mm" 后缀，Layer 写 `Top` / `Bottom`）。
- KiCad 自己导出的 .pos 文件列名不同，要改（见 5.4）。

### 4.5 旋转角度（Rotation）与贴片预览

- JLC 原话：你定义的 0° 可能和 JLC 定义的 0° 不一样（"we both use the same rotation"），所以预览里有些器件方向会不对。可以改坐标文件里的旋转角；不会改也可以直接下单，"engineers will review and fix the rotation and polarity of the components based on the silkscreen markings" [S07] 第 2 条。
- 0° 的唯一规则：**库里封装的 0° 方向要和元件在编带（tape & reel）里的方向一致** [S07] 第 3 条。
- 预览里的**红点**不叫"1 脚"，只是方向标记。器件上的点和 PCB 丝印上的点对上了，就说明方向对 [S07] 第 1 条。DFM 里二极管的 "+" 是阳极、"−" 是阴极 [S07] 第 8 条。
- 丝印和 CPL 方向矛盾时，**默认按丝印贴** [S07] 第 10 条。→ 极性器件一定要画清楚丝印极性标记（二极管用三角指向阴极，或在阴极侧画一条杠）。
- 下单时没有点"确认（confirm）"的器件**不会贴**，哪怕 BOM 里有 [S07] 第 7 条。
- 插件修正：Bouni 插件内置旋转修正表（来自 matthewlai 的 JLCKicadTools）[S35]。Fabrication Toolkit 用 `rotations.cf` 自动修正，个别器件可以加字段 `FT Rotation Offset`（正值 = 逆时针，单位度）。它的 README 举例：预览里方向不对时填 −90 [S36]。
- 焊盘上打过孔（via-in-pad）：回流时锡会流进孔里造成虚焊。JLC 默认照常生产，发现了再邮件提醒 [S07] 第 17 条。

### 4.6 数量、DFM、交期

- PCB 打样以 5 pcs 为最小档（生产时间表的最小一列是 5 pcs；"$2 for 5pcs"）[S14][S15]。
- 贴片数量：经济型 2–50 pcs [S04]；⚠ FAQ 写"想贴 30 片以上就拼板或改选标准型"[S06] 第 10 条；国内站写"≤30（50）"[S02]。→ 写成"经济型一般几十片以内，具体以下单页为准"。
- 下单流程：上传 Gerber → 上传 BOM / CPL（点 "Process BOM & CPL"）→ 选料、确认 → 报价 [S06] 第 9 条、[S13]。贴片单**必须先付款**（不支持 Review Before Payment），因为下单就会占用元件库存 [S07] 第 9 条。
- 交期（会变）：
  - PCB，1–2 层，≤100 × 100 mm（FR4 / 1.6 mm / 1 oz / HASL / 绿油白字）：5 pcs 24 小时；<50 pcs 1–2 天；≥50 pcs 5–6 天 [S14]。
  - 贴片：能力页写经济型 1–3 天、标准型 ≥4 天 [S04]；⚠ FAQ 写"PCB 做完后 90% 的贴片单 24 小时内完成，最多 48 小时"[S06] 第 13 条。→ 写成"PCB 1–2 天 + 贴片 1–3 天左右（不含物流）"。
  - 物流（参考）：DHL 约 3–5 天，平邮约 15–25 天 [S15]。
- JLC 只贴自己生产的 PCB [S06] 第 14 条。Mark 点 JLC 会自己加 [S06] 第 12 条。
- 没贴的元件不随货发（海关原因）[S07] 第 15 条。

### 4.7 在线 Gerber 查看器与 DFM

- 上传 Gerber 后，系统自动识别**板子尺寸和层数**。点 "Gerber Viewer" 检查文件；有问题按提示改，没问题就加入购物车 [S15]。
- 两种付款方式："Review Before Payment"（审核通过后再付）和 "Pay Directly"（先付，审核不过全额退款）[S15]。
- 可以选"确认生产文件（confirm production file）"，生产稿做好后人工再看一遍 [S25]。嘉立创同样建议"下单确认生产稿检查"[S03]。
- **JLCDFM**（https://jlcdfm.com ，嘉立创对应的是 https://www.jlc-dfm.com ）：免费在线工具。上传 Gerber 压缩包（zip / rar，≤50 MB）后，有 5 个分析模块（走线、阻焊、钻孔、丝印、元件装配），30 多个检查点，问题会在图上标出位置，可以下载 PDF 报告；还能匹配 BOM 并显示 3D 效果 [S26]。
- JLC 自己的 KiCad 8 教程建议：上传前用第三方 Gerber 查看器检查外形是否闭合、GM1 层的开槽和 V 割线、钻孔是否对齐、过孔是否盖油、丝印 [S11]。

---

## 5. KiCad 10 导出 Gerber / 钻孔 / 坐标给 JLC

本节按 KiCad 10.0.6 写。8.0.9 的旧写法和逐项对照见 `facts_kicad10.md` #1–#54 [S67]。

### 5.1 Gerber（绘制对话框）要点

- **JLC 没有 KiCad 10 的 Gerber 教程**。JLC 帮助中心只有 KiCad 5–9 的版本：8 版 [S11]（8.0.4 上测的）和 9 版 [S63]（9.0.4 上测的，2026-09-24 更新）。下面以 10.0.6 的界面为准 [S54][S55]，JLC 的要求取自这两篇教程。
- 入口：PCB 编辑器 **File → Fabrication Outputs → Gerbers (.gbr)…**（中文：文件 → 制造输出 → Gerbers (.gbr)...），或者 文件 → 绘制...；两条路打开的对话框标题都是 **绘制** [S55 `menubar_pcb_editor.cpp`][S54]。和 8 一样。
- 导出前**再跑一次 DRC** [S11]。对话框底部的按钮仍是 运行 DRC... / 生成钻孔文件... / 关闭 / 绘制 [S54]。
- 要勾选的层（对话框里叫 **包含层**）：**F.Cu、B.Cu、F.Paste、B.Paste、F.Silkscreen、B.Silkscreen、F.Mask、B.Mask、Edge.Cuts** [S11][S54]。4 层以上再加 In1.Cu、In2.Cu…。
- 通用选项 里要勾：**绘制前检查填充区填充内容**（Check zone fills before plotting；8 叫 绘制前检查域填充）、**使用 Protel Gerber 文件扩展名**（"JLCPCB prefers Protel filename extensions" [S11]）、**剔除阻焊开窗中的丝印**（Subtract soldermask from silkscreen；8 在 Gerber 选项 里，10 挪到了 通用选项）[S54][S55 `dialog_plot_base.cpp`]。
- 10 的绘制对话框里**没有了**：绘制位号、绘制封装文本、绘制封装值、强制绘制隐藏文字、绘制模式、过孔盖油 [S55]。8 版教程 [S11] 让勾的 "绘制位号 / 绘制封装文本 / 过孔盖油" 在 10 里都找不到，不用找。10 新增了 设计变体:、在制造层上显示 DNP（隐藏 / 画叉显示）、包含焊盘编号 [S55]。
- **不勾**：使用 钻孔/定位 文件原点、生成 Gerber 作业文件、使用 Gerber X2 格式(推荐)、包含网表特性、禁用自定义光圈 (宏光圈) (不推荐)。坐标格式 "4.6, 单位 mm"。这些选项的名字和默认值都和 8 一样 [S54][S55 vs S65]。8 版教程截图里这几项都没勾 [S11 图 3]；9 版教程勾了 Protel、X2、网表特性 [S63]（只看过摘要）。
- ⚠ 嘉立创国内站**不接受 Gerber X2** [S03] → 必须取消勾选 "使用 Gerber X2 格式(推荐)"。9 版教程勾 X2 和这一条冲突，课程继续教**不勾**。
- 对话框里的阻焊提示和 8 一样："Global solder mask minimum width and/or margin are not set to 0. Most board manufacturers expect 0 …" [S55]。KiCad 10 新建板的阻焊扩展、阻焊最小宽度默认都是 0 [S59]。
- **过孔盖油不在绘制对话框里了。** KiCad 9 起改成在 **文件 → 电路板配置... → 电路板叠层 → 阻焊/锡膏 → 过孔盖油: 顶层 ☑ 底层 ☑**（"Tent vias:" / "Front" / "Back"）里整板设置 [S55][S54]。文档原话："Since KiCad 9.0, via tenting is globally controlled in Board Setup, and can be overridden in the properties dialog for each via." [S56 约 5221 行]。单个过孔可以在过孔属性的 **阻焊覆盖:** 里改（IPC-4761 分类，例如 来自规则 / 双面盖油 (Type I-b) / 塞孔 (Type III)）[S67 p5]。新建板默认两面都盖油（`board_design_settings.cpp:231–232`）[S55][S59]。也有用户反映 9.0 起在 Plot 对话框里找不到 Tent vias [S66]。
- QB12 板文件 setup 里 `tenting` 正面、背面都是 `yes`，没有过孔单独改过 [S53 `hardware/pcb/out/QB12.kicad_pcb`]。kicad-cli 绘图时直接用板上的这个设置。→ 课程写法："导出前在 电路板配置 → 阻焊/锡膏 确认 过孔盖油 顶层、底层都勾了。"
- 历史（只对照用）：KiCad 8 时过孔盖油是 Plot 对话框里的整板选项，8.0 英文文档写 "Do not tent vias" [S30]，8.0.4 截图 [S11] 和 8.0.9 翻译 [S33] 写 "Tent vias / 过孔盖油"。

### 5.2 Excellon 钻孔设置

钻孔对话框标题仍是 **生成钻孔文件**。10 的版面和 8 不一样：椭圆孔、映射文件改成了复选框，几个标签改了名，孔数量 框没有了 [S55 `dialog_gendrill_base.cpp`][S54]。

| 选项（10.0.6 中文界面） | 8.0.9 的写法 | QB12 / JLC 怎么设 | 说明 |
|---|---|---|---|
| 格式：Excellon / Gerber X2 | 同左 | **Excellon** | 大多数厂家要 Excellon [S30]。10 在 Gerber X2 下面多了 生成盖油层 [S55] |
| Y 轴镜像 | 同左 | 不勾 [S11] | 找第三方生产时一般不要用 [S30] |
| 最少钻头种类（Minimal header） | 同左 | 不勾 [S11] | 厂家要求时才勾 [S30] |
| 将电镀孔 (PTH) 和非电镀孔 (NPTH) 到合并单个文件中（原译文语序就是这样） | 合并金属化孔 (PTH) 和非金属化 (NPTH) 到单个文件中 | **不勾 → PTH、NPTH 分成两个文件** [S11] | 默认分开；"厂家要求时才合并" [S30] |
| **对椭圆孔使用备选钻孔模式**（复选框） | 椭圆孔钻孔模式：使用铣孔命令 / 使用备选钻孔模式（单选） | **勾** [S11] | 不勾就是用铣孔命令（route）。JLC 要备选模式 |
| **生成映射:**（复选框 + 下拉框：Postscript / Gerber X2 / DXF / SVG / PDF） | 映射文件格式（单选）+ 生成映射文件 按钮 | **勾，选 Gerber X2** [S11] | 钻孔图可选，给人看的；JLC "highly recommended" [S11] |
| **原点:** 绝对 / 钻孔/定位 文件原点 | 钻孔原点 | JLC 教程选 **绝对** [S11]；QB12 脚本用辅助原点（见 5.3） | 绝对 = 页面左上角；钻孔/定位 文件原点 = 板上设定的原点 [S30] |
| **单位:** 毫米 (mm) / 英寸 | 钻孔单位（界面默认英寸） | **毫米** [S11] | 10 里毫米排第一，界面默认毫米 [S55] |
| **零点:** 十进制格式(推荐) … | 零的格式 | **十进制格式(推荐)** [S11] | 按厂家建议 |
| 按钮：生成报告文件... / 关闭 / **生成** | 生成钻孔文件 / 生成映射文件 / 生成报告文件... / 关闭 | — | 10 里没有单独的 生成映射文件 按钮，勾了 生成映射: 就一起生成 |

- 钻孔对话框入口：绘制 对话框底部的 "生成钻孔文件..."，或 文件 → 制造输出 → 钻孔文件 (.drl)... [S54][S55]。
- ⚠ 上表 "默认" 说的是 `_base.cpp` 里的初始值。实际对话框会记住上次的选择，学员打开时看到的可能不一样 [S67 不确定第 5 条]。
- kicad-cli 10.0.6 `pcb export drill` 的默认值和 8 一样（excellon / absolute / decimal / alternate / mm / map pdf），新增参数 `--generate-report`、`--report-path`、`--generate-tenting` [S58]。

### 5.3 原点：使用 钻孔/定位 文件原点 与辅助原点（aux origin）

- 绘制对话框的 "使用 钻孔/定位 文件原点"（Use drill/place file origin）：勾上后，坐标以板上设定的钻孔 / 定位原点为零点；不勾就用绝对原点（图纸左上角）[S30][S54]。名字和 8 一样。
- 设定原点：**放置 → 钻孔/定位 文件原点**（Place → Drill/Place File Origin），和 8 一样 [S55 `menubar_pcb_editor.cpp`][S54]。
- 坐标文件对话框也有同一个选项 "使用 钻孔/定位 文件原点"，含义相同；钻孔对话框里对应的是 **原点:** → 钻孔/定位 文件原点 [S54]。
- **原则（推导）**：Gerber、钻孔、坐标三份文件要用**同一个原点**。JLC 教程用的是"全绝对"（Gerber 不勾 + 钻孔 绝对）[S11]。QB12 现在的脚本用的是"全辅助原点"（Gerber `--use-drill-file-origin`、钻孔 `--drill-origin plot`、坐标 `--use-drill-file-origin`）[S53 `hardware/pcb/export_jlc.sh` 第 9–15 行]。两种都自洽，**不要混用**。

### 5.4 KiCad .pos vs JLC CPL

| KiCad .pos（CSV）列 | JLC CPL 列 | 注意 |
|---|---|---|
| Ref | Designator | — |
| Val | （不需要） | — |
| Package | （不需要） | — |
| PosX | Mid X | KiCad 只输出数字；JLC 样例带 "mm" 后缀 [S10] |
| PosY | Mid Y | KiCad 导出时**把 Y 取反**（源码注释："Keep the Y axis oriented from bottom to top"），10 没变 [S34][S55 `place_file_exporter.cpp`] |
| Rot | Rotation | 可能需要按 JLC 的 0° 修正（4.5） |
| Side（`top` / `bottom`） | Layer（`Top` / `Bottom`） | 大小写不同 |

- KiCad 10.0.6 CSV 表头和 8.0.9 一样：`Ref,Val,Package,PosX,PosY,Rot,Side`（用 QB12 实际导出核对）[S59]。JLC 教程也让你把 Ref, PosX, PosY, Rot, Side 改成 Designator, Mid X, Mid Y, Rotation, Layer [S13]（S13 是 JLC 的 KiCad 10 BOM / 坐标教程）。
- 导出入口：**文件 → 制造输出 → 元件定位文件 (.pos, .gbr)...**（File → Fabrication Outputs → Component Placement (.pos, .gbr)…），对话框标题仍是 **生成布置文件** [S54][S55]。JLC 建议：CSV 格式、毫米、两面合成一个文件 [S13]。
- 10.0.6 对话框里的选项 [S55 `dialog_gen_footprint_position_file_base.cpp`][S54]：
  - 格式：**纯文本** / CSV / Gerber X3（8 叫 ASCII）；单位；
  - **生成包含正面和背面定位的单个文件**（复选框；8 是 "文件: 正反面分开 / 独立的电路板文件" 单选）；
  - 仅包含贴片封装；排除具有通孔焊盘的所有封装；排除所有设置了 '不作装配 (DNP)' 特性的封装；排除所有被标记为「从物料清单中移除」的封装（10 新增）；包含电路板边框层；
  - 使用 钻孔/定位 文件原点；对底层的封装使用负 X 坐标；
  - 设计变体（10 新增）；
  - 按钮 **生成坐标文件**（8 叫 生成定位文件）。
- 封装属性里勾了 "从坐标文件中移除"（8 叫 从定位文件中移除）的封装不会出现在文件里 [S67 截图 #4]。
- kicad-cli `pcb export pos` 的默认值和 8 一样（both / ascii / in），新增参数 `--variant` [S58]。`--smd-only` 筛掉 SW1，`--exclude-fp-th` 筛掉 J1、SW1、U2，和 8 一样 [S59]。
- ⚠ KiCad 导出的是**封装锚点（footprint position / anchor）**，不是焊盘的几何中心 [S34][S55 源码用 `GetPosition()`]。大多数库封装的锚点就在中心，但锚点在 1 脚的封装（常见于连接器）会让预览里的位置偏掉。Fabrication Toolkit 提供 `FT Position Offset`（x,y 偏移）和 `FT Origin`（选参考点，例如 `Anchor`）来处理 [S36]。

### 5.5 插件

- **Fabrication Toolkit（bennymeg）**：JLC 官方教程推荐它 [S12][S13]。它在 KiCad **官方 PCM** 里，名字是 "Fabrication Toolkit"，2026-10-19 的索引里最新 5.3.0，支持 KiCad 6.00 以上、没有上限，10 能装 [S60]。一键生成 Gerber zip、`bom.csv`、`positions.csv`（列为 Designator, Mid X, Mid Y, Rotation, Layer）和 IPC 网表。默认勾选 "Apply automatic component translations"（自动修正旋转 / 位置）[S13]。它生成的 BOM 列是 `Designator, Footprint, Quantity, Value, LCSC Part #`（用的是 Value 而不是 Comment）[S13]。
- **kicad-jlcpcb-tools（Bouni）**：生成 Gerber、Excellon、BOM、CPL；内置 JLC 元件库搜索，可以直接把 LCSC 料号分配给封装 [S35]。它自己的仓库索引写 2026.04.03 版，支持 KiCad 8.0–10.0 [S61]。⚠ **仍不在官方 PCM 里** [S60]，要在 PCM 里添加作者的仓库地址 `https://raw.githubusercontent.com/Bouni/bouni-kicad-repository/main/repository.json` [S35]，或者 git clone 到 `scripting/plugins` 目录。带"Footprint rotation correction"旋转修正 [S35]。
- 两个插件二选一即可。课程如果要"零改表头"，推荐 Fabrication Toolkit（JLC 自己推荐的）。
- KiCad 10 的插件分两种 [S56][S57]：
  - 老的 SWIG 动作插件（上面两个都是）在 10 里还能用，入口仍是 **工具 → 外部插件** [S56 约 7377 行]；
  - 新的 IPC 插件（PCM 里写 runtime ipc）要先在 **偏好设置 → 插件 → 启用 KiCad API** 打开 API [S57 约 3021 行]。开了 API 以后具体怎么用**没装插件试过，未核实** [S67 不确定第 7 条]。

### 5.6 QB12 现有导出产物（本地事实）[S53]

- `outputs/QB12/QB12_Gerber.zip` 里有 11 个文件：`QB12-F_Cu.gtl, B_Cu.gbl, F_Mask.gts, B_Mask.gbs, F_Paste.gtp, B_Paste.gbp, F_Silkscreen.gto, B_Silkscreen.gbo, Edge_Cuts.gm1, PTH.drl, NPTH.drl`。钻孔图和 job 文件也会生成，但不打进 zip。用的是 Protel 扩展名，Edge.Cuts 输出为 `.gm1`，PTH / NPTH 分成两个文件。PTH.drl 里有 4 个 G85 槽孔。这些和 8.0.9 导出时一样 [S59]。
- 导出用 kicad-cli **10.0.6**（`hardware/pcb/export_jlc.sh`，路径由 `tools/kicad_env.sh` 里的 `$KCLI` 给出）；坐标只导顶面。CPL 转换后的表头 `Designator,Mid X,Mid Y,Layer,Rotation`，值带 mm，Layer 为 `Top`（`outputs/QB12/QB12_CPL_坐标文件.csv`）。
- 文件头（解压 zip 读的）[S59]：
  - Gerber：`G04 #@! TF.GenerationSoftware,KiCad,Pcbnew,10.0.6*`（8.0.9 时是 `…,8.0.9`）；
  - 钻孔：`; DRILL file KiCad 10.0.6 date …`（8.0.9 时是 `; DRILL file {KiCad 8.0.9} date …`，10 去掉了花括号），另有一行 `; #@! TF.GenerationSoftware,Kicad,Pcbnew,10.0.6`。

---

## 6. KiCad 10 操作：菜单名与默认快捷键

- 快捷键来源：KiCad 10.0.6 源码里的动作定义（`pcb_actions.cpp`、`actions.cpp`）[S55]，加上 KiCad 10.0 文档 [S56]。
- 中文界面名来源：本机 10.0.6 的 zh_CN `kicad.mo` [S54]，旧译名对照 8.0.9 的 zh_CN.po [S64]。
- 菜单路径来源：10.0.6 源码 `menubar_pcb_editor.cpp` [S55]。
- 快捷键可以在"偏好设置 → 快捷键"里改，**默认快捷键可能因版本不同，以菜单为准**。
- macOS 上 Ctrl 显示为 ⌘；10 的 macOS 版有几处单独的默认键，表里标了 "mac"。修饰键的显示随平台变：GTK（Linux）显示 Shift+Ctrl+…，mac 显示 ⇧⌘…，键本身是 Ctrl+Shift+… [S55]。mac 上实际显示成 ⇧⌘ 还是 Shift+Cmd **没开 GUI 确认**。

### 6.1 总表

| 功能 | 英文菜单 / 位置（KiCad 10） | 中文界面（10.0.6） | 默认快捷键（10.0） | 与 8.0.9 的差别 |
|---|---|---|---|---|
| 顶层菜单 | File / Edit / View / Place / Route / Inspect / Tools / Preferences / Help | 文件 (F) 编辑 (E) 视图 (V) 放置 (P) 布线 (U) 检查 (I) 工具 (T) 设置 (R) 帮助 (H) | — | 同 |
| 从原理图更新 PCB | Tools → Update PCB from Schematic…（原理图、PCB 编辑器都有） | 工具 → 从原理图更新 PCB... | **F8** | 同。对话框选项变多了，见下方说明 |
| 分配封装（Footprint Assignment Tool） | 原理图：Tools → Assign Footprints… | 工具 → 分配封装... | 无 | 同 |
| 封装编辑器 | PCB：Tools → Footprint Editor；或从项目管理器打开 | 封装编辑器 | 无（"Open in Footprint Editor" 在封装编辑器中打开选中封装：Ctrl+E） | 同 |
| 电路板配置（Board Setup） | File → Board Setup… | 文件 → 电路板配置... | 无 | 菜单同；左侧树变了，见下一行 |
| 　电路板配置 左侧树 | Board Stackup / Design Rules / Board Data | 电路板叠层（板层编辑器 / 物理叠层 / 板面处理 / 阻焊/锡膏 / **填充区栅格线偏移**）；设计规则（约束 / 预设尺寸 / 泪滴 / 长度调整规则 / **调整配置** / 网络类 / **元件类** / 自定义规则 / 违规严重级别）；**电路板数据 → 嵌入文件** | — | 加粗的是 9 / 10 新增的 [S55]。子项的确切顺序以界面为准 |
| 　设计规则 → 约束 | Design Rules → Constraints | 设计规则 → 约束 | — | 同 |
| 　预设尺寸（线宽 / 过孔表） | Design Rules → Pre-defined Sizes | 预设尺寸 | — | 同 |
| 　网络类 | Design Rules → Net Classes | 网络类 | — | 同 |
| 　自定义规则 | Design Rules → Custom Rules | 自定义规则 | — | 同 |
| 画板框（Edge.Cuts） | 切到 Edge.Cuts 层（中文"板框"）后用 Place → Draw Lines / Draw Rectangles | 放置 → **绘制线条** / 绘制矩形 | 画线 **Ctrl+Shift+L**；矩形无 | 8 叫 绘制线，键同 |
| 下一个 / 上一个栅格 | 左侧栅格按钮 / 偏好设置 → 栅格 | 切换到下一栅格 / 上一栅格 | **N / Shift+N** | 同 |
| 快速栅格 1 / 2 | — | 切换到快速栅格 1 / 2 | **Alt+1 / Alt+2** | 同 |
| 栅格原点 | Place → Grid Origin | 放置 → 栅格原点 | 无 | 同 |
| 栅格重写开关 | 左工具栏 | 栅格重写 | Ctrl+Shift+G | 同 |
| 移动 | 右键 / 编辑 | 移动 | **M** | 同 |
| 精确移动 | — | 精确移动... | Shift+M | 同 |
| 逆时针 / 顺时针旋转 | — | 逆时针旋转 / 顺时针旋转 | **R / Shift+R** | 同 |
| 换面 / 翻转 | — | 换面 / 翻转 | **F** | 同 |
| 拖动（45° / 自由角度） | — | 拖动 (45 度模式) / 拖动 (自由角度) | **D / G** | 同 |
| 属性 | — | 属性... | E | 同 |
| 非活动层显示（正常 / 变暗 / 隐藏 三态切换） | View | — | **H** | 同（8 也是 H；课程 p1 原来写的 Ctrl+H 是错的）[S67 #85] |
| 自适应缩放（Zoom to Fit） | View | — | Windows / Linux **Home**；mac **⌘0** | 同（8 在 mac 上也是 ⌘0） |
| 高亮网络 / 测量 | Inspect | — | `（反引号）/ Ctrl+Shift+M | 同 |
| 单端布线（交互式布线器） | Route → Route Single Track | 布线(单端) | **X** | 同 |
| 差分对布线 | Route → Route Differential Pair | 布线(差分) | **6** | 同 |
| 长度调整 | Route | — | **7 / 8 / 9** | 同 |
| 布线中放过孔并换层 | （布线中） | 放置过孔 | **V** | 同 [S56 约 2040 行] |
| 循环切换层对预设 | — | — | **Shift+V** | 9 新增 |
| 独立过孔 | Place → Place Vias | 放置 → **放置过孔** | **Ctrl+Shift+X** | ⚠ **改了**。8 叫 添加过孔、键 Ctrl+Shift+V；10 的 Ctrl+Shift+V 是 **特殊粘贴...**（`actions.cpp:382`）[S55 `pcb_actions.cpp:330`][S56 约 2081、10214 行] |
| 线宽切换 | 顶部线宽下拉框 | 切换到下一个 / 上一个走线宽度 | **W / Shift+W** | 同 |
| 过孔尺寸加 / 减 | 顶部过孔下拉框 | 增大 / 减小过孔尺寸 | `'`（单引号）/ `\`（反斜杠） | 同 |
| 自定义线宽 / 过孔 | — | 自定义走线/过孔尺寸... | Q | 同 |
| 交互布线设置 | Route → Interactive Router Settings… | 交互布线设置... | Ctrl+< | 同 |
| 覆铜区（Zone） | Place → Draw Filled Zones | **绘制填充区** | **Ctrl+Shift+Z**（mac ⌥Z） | 8 叫 添加填充域，键同 |
| 填充所有填充区 | Edit → Fill All Zones | **填充所有填充区** | **B** | 8 叫 填充所有域，键同 |
| 取消填充所有填充区 | Edit → Unfill All Zones | **取消填充所有填充区** | **Ctrl+B** | 8 叫 取消填充所有域，键同 |
| 规则域 / 禁布区（Rule area / Keepout） | Place → Draw Rule Areas | **绘制规则域** | **Ctrl+Shift+K** | 8 叫 添加规则区，键同 |
| 放置封装 | Place → Place Footprint | **放置封装** | **A** | 8 叫 添加封装，键同 |
| 创建阵列（摆过孔阵列等；支持封装、过孔、图形） | 选中对象后用（右键菜单位置以界面为准） | 创建阵列... | Ctrl+T | 同 |
| 设计规则检查（DRC） | Inspect → Design Rules Checker | 检查 → 设计规则检查 | **无默认快捷键** | 同 |
| 网络检查（Net Inspector） | View → Panels → Net Inspector | **视图 → 面板 → 网络检查**（停靠面板） | 无 | ⚠ 8 在 检查 → 网络检查，是独立窗口；10 的 检查 菜单里没有这一项了 |
| 电路板统计 | Inspect → Show Board Statistics | 检查 → **显示电路板统计报告**（对话框标题 电路板统计报告） | 无 | 8 叫 显示电路板统计信息 |
| 3D 查看器 | View → 3D Viewer | 视图 → 3D 查看器 | **Alt+3** | 同 |
| 绘制（Plot） | File → Plot… | 文件 → 绘制... | 无 | 同 |
| Gerber | File → Fabrication Outputs → Gerbers (.gbr)… | 文件 → 制造输出 → Gerbers (.gbr)... | 无 | 同。制造输出 子菜单多了 **ODB++ 输出文件...**；IPC-D-356 那项改写成 "网表文件" |
| 钻孔文件 | File → Fabrication Outputs → Drill Files (.drl)… | 钻孔文件 (.drl)... | 无 | 同 |
| 坐标文件 | File → Fabrication Outputs → Component Placement (.pos, .gbr)… | 元件定位文件 (.pos, .gbr)... | 无 | 同 |
| 钻孔 / 定位原点 | Place → Drill/Place File Origin | 放置 → 钻孔/定位 文件原点 | 无 | 同 |
| 导出 Specctra DSN | File → Export → Specctra DSN… | 文件 → 导出 → **Specctra DSN...** | 无 | 8.0.9 误译成 "光绘 DSN..."，10 已经改对。快捷键列表里这个动作叫 "导出无栅格自动布线器 DSN..." |
| 导入 Specctra 会话 | File → Import → Specctra Session… | 文件 → 导入 → Specctra 会话... | 无 | 同 [S56 约 5150 行] |
| 外部插件 | Tools → External Plugins | 工具 → 外部插件 | — | 同 |
| 插件与内容管理器（PCM） | 项目管理器 / Tools | 扩展内容管理器 | Ctrl+M | 同 |

说明：
- 中文名取自 10.0.6 的 `kicad.mo` [S54]，菜单结构取自 `menubar_pcb_editor.cpp` [S55]。8.0.9 时用中文界面实拍过（`assets/kicad_shots.md`），顶层菜单和 文件 → 导入 / 导出 都是中文，部分对话框的 Cancel / OK 按钮和 "Elapsed time" 是英文；10.0.6 的截图还没重拍，拍法见 `facts_kicad10.md`「27 张截图在 KiCad 10 里怎么拍」。
- 10 的 检查 菜单：显示电路板统计报告 / 测量工具 / 设计规则检查 / 上一个标记 / 下一个标记 / 排除此标记 / 间距解析 / 约束解析 / 显示封装分配 / 将封装与库比较 [S55]。
- 10 的 工具 菜单新增：DRC 规则编辑器、填充区管理器...、多通道、迁移 3D 模型 [S55]。
- 从原理图更新 PCB 对话框（10）：选项多了 根据符号分组对封装进行分组、将设计图块布局应用到新分组；分组 更新封装（用符号指定的封装替换原有封装 / 删除没有对应符号的封装 / 忽略锁定设置）和 更新字段（从符号更新封装字段 / 移除无法在符号中找到的封装字段）；变更列表叫 要应用的变更；按钮 更新 PCB / 关闭 [S54]。
- 9 起项目管理器多了 作业集：文件 → 新建作业集文件...（`.kicad_jobset`），也能用 `kicad-cli jobset run` 跑 [S57][S58]。课程可以不讲。
- 布线时按 V 的效果：放过孔并换到层对的另一层，和 8 一样 [S56 约 2040 行]。

### 6.2 交互式布线要点 [S56]

- 线宽怎么决定（优先级）：起点是已有走线的端点、并且打开了对应按钮 → 沿用那根线的宽度；下拉框选 "use netclass width" → 用网络类线宽；选了预设尺寸 → 用预设值。和 8 一样。
- 线宽**不会低于** 约束 里的最小走线宽度 [S56 约 2026 行]。注意 10 新建板的最小走线宽度默认是 0.2 mm（8 是 0，见 6.4）；QB12 设的是 0.15 mm。
- 一次布线只能用一种线宽，布线中按 W / Shift+W 在 电路板配置 的预设线宽之间切换。
- 网络类的线宽 / 过孔尺寸是"默认值"，不是上下限，手动改成别的值**不会报 DRC**；要限制就用 自定义规则。
- 任何规则都不能低于 约束 的最小值（例：网络类间距设 0.1 mm，约束 最小间距 0.2 mm → 实际用 0.2 mm）。
- 差分对靠**网络名后缀**识别：`+` / `-` 或 `P` / `N`（例：`USB+` / `USB-`、`USB_P` / `USB_N`），两种后缀不能混用 [S56]。QB12 的 `USB_DP` / `USB_DN`（基名 `USB_D` + P / N）符合规则 [S53]。注意 QB12 的电机网络 `ML+` / `ML-`、`MR+` / `MR-` 也会被当成差分对（只是命名巧合，无害）。
- 差分对换层时按 V 会放一对过孔。
- 过孔的网络（10 的说法，和 8 不同）[S56 约 2085 行]：
  - 布线器放的过孔会随原理图更新改网络；
  - 用 放置过孔（Ctrl+Shift+X）放独立过孔时：放在**走线或焊盘**上，取那里的网络，并且**打开** "通过网自动更新"（Automatically update via nets）；只放在**覆铜区**上，取覆铜区的网络，并且关闭自动更新。
  - 做缝合过孔（stitching via）时要确认 "通过网自动更新" 是关的。
- 布线状态栏的文字和 8 一样：布线: / 已解析网络类 / 走线宽度 / 现存线路 / 最小间距 / 角的样式 / 模式 / 绕走 / 推挤 / 高亮碰撞 [S54]。

### 6.3 覆铜区（Zone）与花焊盘（Thermal relief）[S55][S54]

10 把 "域" 大多改叫 "填充区" / "覆铜区"，覆铜区属性对话框也重新排过 [S55 `dialog_copper_zones_base.cpp`、`panel_zone_properties_base.cpp`]：

- **覆铜区属性**（8 叫 覆铜域属性；选中后按 E）：
  - 层、网络、**填充区名称**（8 叫 域名称）。网络列表的 "隐藏自动生成的网络名称" 和 排序方式 没有了；
  - **优先级不在这个对话框里了**，要点 **打开填充区管理器...** 去改（也可以从 工具 → 填充区管理器... 打开）；
  - 选项卡：**间距与焊盘连接**（8 是 电气特性 一组）/ 显示重写 / 栅格填充；
  - 电气间隙（Clearance，和网络类取较大值）；最小宽度；
  - **焊盘连接:** 实心 / 缓释热焊盘 (花焊盘) / **在电镀孔上 (PTH) 使用缓释热焊盘 (花焊盘)**（贴片焊盘实心连接；8 叫 仅金属化孔 (PTH) 使用缓释热焊盘）/ 无；
  - 缓释热焊盘 (花焊盘) 间隙；散热引线宽度；
  - 填充方式：复选框 **栅格填充**（不勾就是实心；8 是 实心 / 网格 下拉框）；
  - 外框显示：图线 / **阴影填充** / 完全阴影填充（8 叫 阴影线 / 完全阴影线）；
  - **死铜移除:** 总是启用 / 从不启用 / 仅低于面积限制时，配 **面积限制:**（8 叫 最小死铜尺寸）。
- KiCad 10 的新建默认值和 8 一样 [S59]：覆铜间隙 0.5 mm，最小宽度 0.25 mm，花焊盘间隙 0.5 mm，辐条宽 0.5 mm，死铜移除"总是"。
- 约束 里的 "最小散热引线数量"（Minimum thermal relief spoke count）默认仍是 2 [S59]。辐条不够会报 DRC "缓释热焊盘 (花焊盘) 与填充区的连接不完整"（Thermal relief connection to zone incomplete，starved_thermal）[S54]。
- 默认覆铜填充是手动的：改了东西要按 B 重新填充。也可以在 偏好设置 → PCB 编辑器 → 编辑选项 → **其他** → **自动重新对填充区填充** 里打开（8 的路径是 … → 杂项 → 自动重新填充）[S54]。
- 绘制对话框里勾 "**绘制前检查填充区填充内容**"，DRC 里勾 "在执行 DRC 之前重新填充所有**覆铜区**"（Refill all zones before performing DRC），可以避免输出过期的覆铜 [S54]。
- 规则域（8 叫 规则区）：属性对话框叫 **规则域属性**，选项卡 禁布规则 / 布置规则，名字叫 **域名称**；禁布项为 禁止放置走线 / 禁止放置过孔 / 禁止放置焊盘 / **禁止填充填充区**（8 叫 禁止填充 (铺铜)）/ 禁止放置封装 [S54][S67 截图 #18]。
- 嘉立创也建议铺铜面上的焊盘用"十字焊盘"（花焊盘），理由是铜导热快，影响焊接 [S24]。

### 6.4 KiCad 10 默认值 vs JLC 能力（讲课时值得点出来）[S59][S55][S01][S03]

新建板的默认值用 pcbnew 10.0.6 新建一块板读出来 [S59]，和 8 相比只有 **最小走线宽度** 变了。

| 项目 | KiCad 10 默认 | JLC / 嘉立创要求 | 结论 |
|---|---|---|---|
| 丝印线宽 | 0.1 mm（`DEFAULT_SILK_LINE_WIDTH`），同 8 | EN ≥0.15 mm；CN 常规 ≥0.15 mm（高精 0.1 mm） | ⚠ 建议改成 ≥0.15 mm |
| 丝印字粗 | 0.1 mm（`DEFAULT_SILK_TEXT_WIDTH`），同 8 | 同上 | ⚠ 同上 |
| 丝印字高 | 1.0 mm，同 8 | ≥1.0 mm | 刚好在下限 |
| 默认网络类 | 间距 0.2 mm / 线宽 0.2 mm / 过孔 0.6 / 0.3 mm，同 8 | 0.10 / 0.10 mm；过孔 0.15 / 0.25 mm | 宽裕 |
| **最小走线宽度**（约束） | **0.2 mm**（`DEFAULT_TRACKMINWIDTH`，`board_design_settings.h:81`）；8 是 0 | 0.10 mm | 宽裕。QB12 自己设成 0.15 mm，不受影响 |
| 铜到板边 | 0.5 mm，同 8 | ≥0.2 mm（锣）/ 0.4 mm（V 割） | 宽裕 |
| 最小钻孔孔径（8 叫 最小通孔） | 0.3 mm，同 8 | 0.15 mm（推荐 ≥0.2 mm） | 宽裕 |
| 孔到孔 | 0.25 mm，同 8 | 过孔 0.2 mm / 焊盘孔 0.45 mm | 焊盘孔的要求比 KiCad 默认严 |
| 铜到孔 | 0.25 mm，同 8 | 过孔孔到走线 0.2 mm；PTH 到走线 0.28 mm | PTH 要求更严 |
| 最小过孔外径（8 叫 最小过孔直径）/ 焊环 | 0.5 / 0.1 mm，同 8 | 过孔外径 ≥0.25 mm | 宽裕 |
| 阻焊扩展 / 最小宽度 | 0 / 0，同 8 | JLC 按 1:1 开窗 | 一致 |
| 板厚 | 1.6 mm，同 8 | 1.6 mm 是标准板厚 | 一致 |
| 过孔盖油 | 顶层、底层都盖油（存在 电路板配置 → 阻焊/锡膏；8 是绘制选项） | — | 见 5.1 |

约束 页面里几个字段的名字也改了 [S54][S67 截图 #9]：**最小过孔外径**、**最小钻孔孔径**（"Minimum drill size:"）、新增 **爬电的最小槽宽**、**填充策略**、**允许圆角/倒角超出填充区外框**、**圆弧/圆近似**；铜箔到板边间距、孔到孔的间距、最小散热引线数量 不变。网络类表头 "微形内径" 的错别字在 10.0.6 里还在；分配列改叫 **匹配规则 (支持正则表达式)**，新增 **调整配置**、**PCB 颜色** 两列 [S54]。

---

## 7. Freerouting 与 KiCad 10

### 7.1 是什么

- Freerouting 是自动布线器，支持标准 Specctra / Electra DSN 接口的软件都能用：读入 `.dsn`，输出布好线的 `.ses` 会话文件 [S38]。
- 有 GUI、命令行和 API（API 是 beta）几种用法 [S38]。

### 7.2 两种用法

**A. 独立程序（standalone）**
1. KiCad：**File → Export → Specctra DSN…**（文件 → 导出 → **Specctra DSN...**；8.0.9 误译成 "光绘 DSN..."，10 已改对）[S55][S54]。这个导出器没有可配置选项 [S30]。
2. Freerouting GUI：File > Open… 打开 `.dsn` → 点"魔棒"图标开始自动布线 → 等所有轮次结束（"may take from a few minutes to several hours"）→ File > Save as… 存成 `.ses` [S38]。
3. KiCad：**File → Import → Specctra Session…**（文件 → 导入 → Specctra 会话...），和 8 一样 [S55][S54][S56 约 5150 行]。
- 命令行：`java -jar freerouting.jar -de MyBoard.dsn -do MyBoard.ses -inc GND,VCC`。`-inc` 表示**忽略这些网络类**（例如 GND 留给铺铜）[S38]。
- 不用安装包、直接跑 jar 需要 Java JRE。README 现在写的是选 **JRE 25**（Temurin）[S38]。
- 本仓库的做法：`hardware/pcb/route_a.py` / `route_b.py` 调 `pcbnew.ExportSpecctraDSN` / `ImportSpecctraSES`，Freerouting 1.9.0 放在 `tools/`。迁移到 KiCad 10 时（提交 b4f28e3）已经在 10.0.6 上重跑通过 [S53][S67 #118]。

**B. KiCad 插件（plugin）**
- 官方 PCM 里叫 "Freerouting"，最新 2.4.1，支持 KiCad 6.0 以上；描述写"It needs Java JRE 25"；下载包约 59 MB（从体积推测内含 Freerouting 程序本体，未逐一核实）[S60]。
- 用法：扩展内容管理器（Ctrl+M）搜 Freerouting 安装 → 打开 PCB → （可选）先删掉已有走线和过孔 → **工具 → 外部插件 → Freerouting** → 等 Freerouting 退出，插件会自动把结果导回来 [S39]。
- ⚠ **这个插件没在 KiCad 10 上实际跑过，能不能用未核实** [S67 不确定第 4 条]。PCM 写的兼容范围是 6.0 以上，入口写法在 10 里也还在。课上要演示的话先实测。
- ⚠ Java 版本要求会随版本变，以 PCM 描述或 README 为准。

### 7.3 典型限制和还要手改的地方

- **设计规则传递**（社区经验，KiCad 9.0.1 + Freerouting 2.0.1）：电路板配置 → 设计规则 → **约束 里的规则会被忽略**，只有**网络类**的参数（如线宽）会写进 DSN 传过去。帖子里对间距、过孔是否传递说法不一 [S40]。10 上没有单独核实。→ 建议：跑 Freerouting 前把线宽、间距、过孔都写进网络类；导回后**必须跑一次 DRC**。
- **覆铜**：Freerouting 不生成覆铜。有用户反映 Freerouting 会"忽略"已有的 copper fill。论坛回复认为这是正常现象：覆铜是填充算法算出来的，会自动给走线让间距；想让某块区域不走线，就用规则域"禁止放置走线"（Keep out tracks；回复者自己也不确定 Freerouting 是否认这个规则域）[S41]。→ 实践建议（推导）：导出 DSN 前先 取消填充所有填充区（Ctrl+B），导回后按 B 重新填充，再跑 DRC。
- 导回后通常还要手改（**经验总结，不是官方清单**；依据是第 8 节的器件要求）：
  1. 电源 / 电机 / 电池这些大电流线的宽度和走法（8.1）；
  2. DRV8833 的 VM、VCP、VINT 电容回路要短（8.4）；
  3. USB D+ / D− 并行等长、远离天线（8.2）；
  4. ESP32-S3 天线净空区不能有铜、不能走线（8.3）；
  5. 过孔数量太多、锐角、绕远的线；
  6. 地平面被切碎 → 加缝合过孔（8.7）。

---

## 8. 设计指导（有出处）

### 8.1 线宽 vs 电流（IPC-2221 / IPC-2152）

**IPC-2221 外层公式**（4pcb 计算器原文 [S42]）：

```
Area[mil²] = ( I[A] / ( k · ΔT[°C]^b ) )^(1/c)
Width[mil] = Area[mil²] / ( Thickness[oz] × 1.378 [mil/oz] )
外层（external）：k = 0.048, b = 0.44, c = 0.725
内层（internal）：k = 0.024, b = 0.44, c = 0.725
```

等价写法：`I = 0.048 × ΔT^0.44 × A^0.725`（外层，A 的单位是 mil²）。

- 这个公式是对 IPC-2221 曲线的拟合。原始曲线只覆盖 ≤35 A、线宽 ≤0.4 inch、温升 10–100 °C、铜厚 0.5–3 oz，超出范围就是外推 [S42]。
- 公式假设板子放在常温常压空气中，测试板是"厚板上的一根线"。薄板（≤30 mil）建议多降额 [S43]。Altium 认为 IPC-2221 的结果"very conservative"（很保守）[S43]。
- IPC-2152 是后来的标准，数据更多（多组列线图），考虑了有没有平面、线到平面的距离、空气还是真空等因素；"there has been some debate as to the applicability of each standard"（两种标准各适用于什么场合还有争议）[S43]。IPC-2152 原文要付费，本表没有直接引用它的数值。

**本表计算：1 oz（1.378 mil）外层、ΔT = 10 °C**（ΔT^0.44 = 2.754；计算日期 2026-10-19）

| 线宽 mm | 线宽 mil | 截面积 A（mil²） | I（A）@ΔT 10 °C | 线宽按 −20% 公差（×0.8）后的 I（A） |
|---|---|---|---|---|
| 0.2 | 7.87 | 10.85 | **0.75** | 0.63 |
| 0.3 | 11.81 | 16.28 | **1.00** | 0.85 |
| 0.4 | 15.75 | 21.70 | **1.23** | 1.05 |
| 0.5 | 19.69 | 27.13 | **1.45** | 1.23 |
| 0.8 | 31.50 | 43.40 | **2.03** | 1.73 |

- 例：0.3 mm → A = 11.81 × 1.378 = 16.28 mil²；I = 0.048 × 2.754 × 16.28^0.725 = 0.048 × 2.754 × 7.56 ≈ 1.00 A。
- 反算：1 A → 0.30 mm；1.5 A → 0.53 mm；2 A → 0.78 mm（ΔT 10 °C，1 oz 外层）。
- ΔT 放宽到 20 °C 时：0.4 mm ≈ 1.67 A，0.8 mm ≈ 2.76 A。
- 为什么要看"−20%"一列：JLC 线宽公差 ±20% [S01]。JLC 博客也建议"Size marginal power traces against the low end"（临界的电源线按公差下限来算）[S19]。
- ⚠ 不同来源的数字有出入：JLC 博客说 1 oz 外层 0.25 mm（10 mil）线"carries about 1 A"[S19]，公式算出来是 0.875 A；另一篇 JLC 博客举例"3 A（10 °C，外层）≈1.27 mm（1 oz）"[S20]，公式算出来是 1.37 mm。差 10–15% 属于不同曲线 / 计算器的正常差异。课程里给范围，并说明用的是哪个公式。
- 对照 QB12 的网络类 [S53]：Default 0.2 mm（≈0.75 A）、Rail 0.3 mm（≈1.0 A）、Motor 0.4 mm（≈1.23 A）、Power 0.5 mm（≈1.45 A）、Batt 0.8 mm（≈2.0 A）。数值都是 ΔT 10 °C。DRV8833 的 PWP 封装额定 1.5 A RMS / H 桥（峰值 2 A）[S48 `ds/drv.txt:21`]。电机线够不够宽，要看实际电机电流和允许温升。这里只是给作者的计算参考，**不是结论**。

### 8.2 USB 2.0 全速 D+ / D−（90 Ω 差分）

- 速率：USB 2.0 低速 1.5 Mbps、**全速 12 Mbps**、高速 480 Mbps；USB 2.0 阻抗"90 Ω ±15% differential, 45 Ω ±15% single ended"[S45]。
- ESP32-S3 的 USB 是全速（Full-speed USB OTG + USB Serial/JTAG，内置收发器）[S52 `ds/chip.txt:3144-3147, 3219`]。
- Espressif 的布局要求 [S46 "USB" 一节]：
  - 靠芯片一侧给 USB 线上的电阻、电容预留位置；
  - 用差分对并行等长走线，"Maintain a differential pair impedance of 90 Ω with a tolerance of ±10%"；
  - 尽量少换层，必须换层时在每个换层点加一对地回流过孔；
  - USB 线下面要有连续的参考层（推荐地）；
  - USB 线两侧包地。
- **为什么在 12 Mbps、短线上影响不大**：全速驱动器的上升 / 下降时间是 **4–20 ns**（高速是 500 ps）[S44]。按 Altium 的估算，全速信号在双层 FR-4 上的"临界长度"约 **2.4 inch（≈61 mm，10% 判据）或 6 inch（≈152 mm，25% 判据）**（按 4 ns 上升时间）[S44]。QB12 整板才 56 mm 长，USB 线从 Type-C 到模块只有其中一段，比临界长度短得多 → 阻抗失配引起的反射很小（推导）。
  - 但 Altium 作者也提醒："the critical length rule is almost never correctly used"，最好还是按 90 Ω 设计 [S44]。
- 双层板上做 90 Ω 的参考尺寸（Altium 用 Dk 4.8 的厚双层板算的）：普通差分微带线约 16 mil 宽 / 5 mil 间距；共面差分（两侧和底层都铺地）约 9.5 mil 宽 / 5 mil 间距 / 离地 5 mil [S44]。JLC 双层板 Dk 是 4.5 [S01]，数字会不同，要用 JLC 阻抗计算器重算。⚠ **JLC 只给 4 层及以上做阻抗控制** [S01]，双层板按线宽线距 ±20% 公差管控，阻抗不保证。
- 教学结论（推导）：QB12 上 D+ / D− 并行、等长、短、底层有完整地、两侧包地、远离天线，这些比"精确 90 Ω"更重要。

### 8.3 ESP32-S3-WROOM-1 天线净空与模块摆放

- 模块数据手册本身不画净空尺寸。它的说法是："the latter [WROOM-1U] has no antenna keepout zone. To learn more about the keepout zone for module's antenna on the base board, please refer to ESP32-S3 Hardware Design Guidelines > Section General Principles of PCB Layout for Modules" [S47 `ds/esp.txt:607-609`]。第 11.2 节也只是让你去看硬件设计指南 [S47 `ds/esp.txt:3475-3480`]。
- 模块推荐焊盘图上标了 18（宽）、25.5（长）、"Antenna Area"、6 等数字（单位 mm）[S47 `ds/esp.txt:3353-3374`]，也就是模块天线区约 6 mm 深。
- 硬件设计指南 [S46] "General Principles of PCB Layout for Modules" 一节：
  - "It is suggested to place the module's on-board PCB antenna **outside the base board**, and the feed point of the antenna close to the edge of the base board."（天线最好伸出底板，馈点靠近板边）
  - 天线伸不出板边时：馈点仍要尽量靠板边，并且"cut off the base board on both sides of the antenna and below it"（把天线两侧和下方的底板切掉），给天线足够的净空；"the module should not be placed in the center of the board with clearance created by hollowing out on all four sides"（不要把模块放在板中间、靠四面挖空来做净空）。
  - "sufficient ground copper and dense ground vias should be placed on the base board near the antenna"（天线附近的底板要有足够的地铜和密集的地过孔）。
  - 装进外壳后："A clearance of **at least 15 mm** is recommended in all directions"（天线四周建议至少 15 mm 净空）。
- 净空图（`esp32s3-module-clearance.png`，天线馈点在右侧）上读到的标注：红色虚线框是 Clearance Area；天线一侧的净空宽度 **Min 15**（mm）；天线区高 **6**；另外有 **Max 2** 和 **Max 1** 两个标注，表示模块边缘和板边 / 净空区边界之间允许的最大偏移 [S46]。⚠ "Max 2 / Max 1"具体量的是哪两条边，请作者对照原图写，不要凭文字转述。
- 其它 RF 相关要求 [S46]：天线远离晶振、高频时钟等高频器件；USB 口、USB 转串口芯片、UART 线（包括走线、过孔、测试点、排针）要尽量远离天线；UART 线包地并打地过孔。
- 双层板要求 [S46]：顶层放信号和元件；"Layer 2 (BOTTOM): Do not place any components on this layer and keep traces to a minimum. Please make sure there is a complete GND plane for the chip, RF, and crystal."（底层不放元件、少走线，保证芯片、RF、晶振下面有完整的地平面）。"Note that there are no official two-layer modules."（官方没有双层模块）
- 模块底部 EPAD：焊到底板地上"is not a must"（不是必须的），但可以改善散热；焊膏不要太多，否则模块会被垫高，其它引脚可能焊不牢 [S47 `ds/esp.txt:2972-2975`]。
- EN 引脚建议加 RC 延时（通常 R = 10 kΩ、C = 1 µF）[S47 `ds/esp.txt:2977-2979`]。

### 8.4 DRV8833 布局（TI 数据手册第 10 节）[S48]

- 原文 `ds/drv.txt:962-968`：
  - "The VM pin should be bypassed to GND using low-ESR ceramic bypass capacitors with a recommended value of **10-μF** rated for VM. This capacitor should be placed **as close to the VM pin as possible** with a thick trace or ground plane connection to the device GND pin."
  - "A low-ESR ceramic capacitor must be placed in between the VM and VCP pins. TI recommends a value of **0.01-μF rated for 16 V**. Place this component as close to the pins as possible."
  - "Bypass VINT to ground with a **2.2-μF** ceramic capacitor rated 6.3 V. Place this bypass capacitor as close to the pin as possible."
- 引脚表 `ds/drv.txt:221-232`："Both the GND pin and device PowerPAD must be connected to ground."（GND 脚和 PowerPAD 都必须接地）；VM 要"10-µF (minimum) ceramic bypass capacitor to GND"；VCP 接"0.01-μF, 16-V (minimum) X7R ceramic capacitor to VM"。
- 散热 10.1.1 `ds/drv.txt:971-981`：PowerPAD 必须和 PCB 铜导热连接。有地平面的多层板，用若干过孔把散热焊盘接到地平面；"On PCBs without internal planes, copper area can be added on either side of the PCB … If the copper area is on the opposite side of the PCB from the device, thermal vias are used to transfer the heat between top and bottom layers."（没有内层的板，在两面加铜；铜在另一面时用散热过孔导热）"In general, the more copper area that can be provided, the more power can be dissipated."（铜面积越大，能散的功率越多）细节见 TI SLMA002、SLMA004。
- `ds/drv.txt:982`："The PW package option is not thermally enhanced"。QB12 用的是 HTSSOP（PWP，带 PowerPAD）的 DRV8833PWPR [S53]。
- 大电容（Bulk capacitance）9.1 节 `ds/drv.txt:904-920, 941-942`：需要多大取决于电机电流、电源内阻、线缆寄生电感、允许纹波、电机类型、制动方式，"system-level testing is required"（要靠系统测试确定）；电容耐压要高于工作电压，因为电机可能把能量回灌到电源。

### 8.5 TP4056 散热焊盘（ESOP-8）[S49]

- `ds/tp.txt:604-616`："RPROG at PROG pin should be as close to TP4056 as possible, also the parasitic capacitance at PROG pin should be kept as small as possible. The capacitance at VCC pin and BAT pin should be as close to TP4056 as possible."
- `ds/tp.txt:618-660`：散热路径是"die → copper lead frame → package lead (especially the ground lead) → PC board copper"，PCB 铜就是散热器；焊盘铜要尽量宽，并向外扩展到大铜面；"Feed through vias to inner or backside copper layers are also useful"（打过孔到内层或背面的铜也有用）；"requires that the **exposed metal pad on the back side** of the TP4056 package be **soldered to the PC board ground**"（背面的裸露焊盘必须焊到 PCB 地上），否则热阻变大。
- `ds/tp.txt:557-566`："Because of the small size of the thin SOP-8 or ESOP-8 package, it is important to use a good thermal PC board layout to maximize the available charge current."（封装小，必须做好散热布局才能用满充电电流）
- 热调节 / 最高结温 145 °C（`ds/tp.txt:45, 198`）。

### 8.6 USBLC6-2 靠近连接器（ST）[S50]

- 本地 Rev 5 `ds/usb.txt:316-318`："Important: A good precaution to take is to put the protection device **as close as possible to the disturbance source (generally the connector)**."（保护器件要尽量靠近干扰源，一般就是连接器）
- `ds/usb.txt:251-255`："the track from data lines to I/O pins, from VCC to VBUS pin and from GND plane to GND pin must be **as short as possible** to avoid overvoltages due to parasitic phenomena"（数据线到 I/O 脚、VCC 到 VBUS 脚、地平面到 GND 脚的走线都要尽量短，避免寄生电感造成过冲）
- 算例 `ds/usb.txt:187-199`：10 mm 长、0.5 mm 宽的走线约 6 nH；IEC 61000-4-2 8 kV 接触放电时 dI/dt = 24 A/ns，每段走线多出 144 V，钳位电压从 +31.2 V 涨到 +319.2 V。这个例子很适合在课上讲"为什么要短"。
- 在线最新版 DS4260 **Rev 7（2021-12-24）**保留了同样两句话，PCB 布局图里还标了 VBUS 上"C = 100nF"[S50 在线版]。
- ST 有没有专门的应用笔记（app note）讲这一点：本表**没有找到确定的编号**，数据手册里的原话已经够用。

### 8.7 去耦电容的摆放（各数据手册的共同点）

- 规律：**电容要尽量靠近电源脚，地端尽快接到地（过孔或地平面），回路要短**。
  - Espressif："Place appropriate decoupling capacitors at the rest of the power pins. Ground vias should be added close to the capacitor's ground pad to ensure a short return path."（其余电源脚放合适的去耦电容，电容地焊盘旁边打地过孔，回流路径要短）[S46]
  - Espressif："The ground pads of the chip and surrounding circuit components should make full contact with the ground copper pour rather than being connected via traces."（芯片和周围器件的地焊盘要和地铜充分接触，不要用走线连）[S46]
  - DRV8833：10 µF / 0.01 µF / 2.2 µF 都写了"as close to the pin(s) as possible"[S48 `ds/drv.txt:962-968`]。
  - TP4056：VCC、BAT 的电容尽量靠近芯片 [S49 `ds/tp.txt:614-616`]。
  - AP2112（U3 现用 AP2112K-3.3TRG1）：输入、输出各 1.0 µF 陶瓷电容即稳定，建议 X7R / X5R 介质 [S51 Features、Note 4]。原 ME6211 的引文已作废；AP2112 手册是否写摆放距离：待核。
- 2.4 GHz 相关：Espressif 还建议在 VDD3P3 的 pin2 / pin3 附近加 CLC / LC 滤波，抑制高频谐波 [S46]。这是芯片级的设计；用模块时模块内部已经做了，底板主要做好 3V3 去耦。

### 8.8 铺铜与缝合过孔基础

- 铺铜的作用（嘉立创）：减小地线阻抗、提高抗干扰能力；降低压降；减小环路面积 [S24]。
- 实心还是网格：大电流、低频电路多用完整（实心）铺铜。嘉立创用干膜工艺，"在设计允许的情况下，铺铜时尽量减小网格铺铜……采用实心铺铜就是比较好的方法"[S24]。JLC 的网格铜最小线宽 / 间距是 0.25 mm [S01]。
- 接地不良的铜皮会变成天线："当长度大于噪声频率相应波长的 1/20 时，就会产生天线效应"，地过孔间距要小于 λ/20 [S24]。
  - 本表计算（2026-10-19）：2.4 GHz 时自由空间 λ ≈ 125 mm → λ/20 ≈ 6.2 mm；板内按 εeff ≈ 3.4 估算 λ ≈ 68 mm → λ/20 ≈ 3.4 mm。→ QB12 天线附近的地过孔间距按 3–6 mm 量级考虑，Espressif 只写"dense ground vias"（密集地过孔）[S46]。
- 双层板做法（推导，依据 [S46] 双层板要求）：底层尽量做整片 GND；顶层空白处铺 GND，用缝合过孔把上下两层地连起来，特别是在芯片、晶振、天线附近和走线把地切开的地方。
- 死铜：KiCad 10 默认"死铜移除：总是启用"，和 8 一样 [S34][S59]。没有连接的孤岛铜会被自动删除。
- KiCad 10 怎么放缝合过孔：10 里也**没有**专门的"缝合过孔"命令 [S55][S56]。可以用 **放置 → 放置过孔（Place → Place Vias，Ctrl+Shift+X）**放独立过孔，再用 **创建阵列...（Ctrl+T）**摆成阵列。⚠ 8 的快捷键 Ctrl+Shift+V 在 10 里是 特殊粘贴 [S55 `pcb_actions.cpp:330`、`actions.cpp:382`]。网络规则（6.2）：只放在覆铜区上时取覆铜区的网络，并且不跟着原理图更新改网络；放在走线或焊盘上时会打开 "通过网自动更新" [S56 约 2085 行]。
- 官方 PCM 里的相关插件（2026-10-19 的索引）[S60]：
  - "Via Stitching"（jOaSbA）**4.0.0** 版，**KiCad 10.0 以上**，是 IPC 插件，要先在 偏好设置 → 插件 → 启用 KiCad API [S57]；
  - "Via Patterns"（adamws）**0.5** 版，KiCad **9.0 以上**，IPC 插件；
  - "RF-Tools"（easyw）1.3.2 版，KiCad 8.0+，10 能装；
  - "kicad-action-scripts"（jsreynaud，含 ViaStitching）现在是 9.0.7 版，**只支持 KiCad 9.0，10 用不了**（8 时是 8.0.5 版、只支持 8.0）。
  - ⚠ IPC 插件开了 API 以后具体怎么用，没装插件试过，**未核实** [S67]。版本随时更新，装之前在 PCM 里看兼容范围。

---

## 9. QB12 工程里已有的相关事实（本地文件，2026-10-19 读取，2026-10-20 按 KiCad 10 重新核对）[S53]

- 板文件格式 `(version 20260206)`、`(generator_version "10.0")`，是 KiCad 10 格式（`hardware/pcb/out/QB12.kicad_pcb`；迁移前是 KiCad 8 的 `(version 20240108)`）。本机 kicad-cli **10.0.6**，路径见 `tools/kicad_env.sh` 的 `$KCLI`。
- 过孔盖油：板文件 setup 里 `tenting` 正面 `yes`、背面 `yes`，没有过孔单独改（见 5.1）。
- 网络类：Default 0.2 mm / 间距 0.18 / 过孔 0.6 / 0.3；Power 0.5 mm（GND、VBUS）/ 过孔 0.8 / 0.4；Motor 0.4 mm（ML±、MR±、ISENA / ISENB）；Rail 0.3 mm（3V3）；Batt 0.8 mm / 间距 0.2（BAT+、VSYS）。
- 约束（Constraints）：最小间距 0.15、最小走线宽度 0.15、最小过孔外径 0.5、最小钻孔孔径 0.3、铜到板边 0.3、孔到孔 0.25、过孔最小焊环 0.1、铜到孔 0.25（mm）。迁移到 10 后数值没变，`out/` 和 `pkg/QB12_KiCad/` 两份 `.kicad_pro` 一致（2026-10-20 核对）。
- BOM（`QB12_BOM_嘉立创SMT.csv`）表头 `Comment,Designator,Footprint,Quantity,LCSC Part #`。例：U1 ESP32-S3-WROOM-1-N8R2 = C2913204；U2 DRV8833PWPR = C50506；U3 AP2112K-3.3TRG1 = C51118；U4 TP4056-42-ESOP8 = C16581。⚠ 料号的库存、基础 / 扩展分类会变，下单时确认。
- 导出脚本 `hardware/pcb/export_jlc.sh`：第 4 行 `source` 了 `tools/kicad_env.sh`，命令都用 `"$KCLI"`。kicad-cli 调用在**第 9–15 行**（Gerber 第 9–11 行带 `--subtract-soldermask --use-drill-file-origin --no-x2 --no-netlist`；钻孔第 12–13 行；打 zip 第 14 行；坐标第 15 行），CPL 转换在**第 23–25 行**（8.0.9 时分别是第 8–14 行和第 22–24 行）。Gerber 和坐标都用辅助原点，钻孔用 `--drill-origin plot`、Excellon、PTH / NPTH 分开、毫米、钻孔图 Gerber X2；坐标只导顶面。过孔盖油不在命令行里设，kicad-cli 用板上的设置（见 5.1）。
- 文件头：Gerber `G04 #@! TF.GenerationSoftware,KiCad,Pcbnew,10.0.6*`；钻孔 `; DRILL file KiCad 10.0.6 date …`（见 5.6）[S59]。
- DRC（kicad-cli 10.0.6，2026-10-20）[S59]：
  - `pkg/QB12_KiCad` 的副本：**95 条** = 86 丝印间距（silk_overlap）+ 2 丝印压铜（silk_over_copper：LED1 的点；J1 背面 "USB-C 5V"）+ 4 丝印到板边（silk_edge_clearance）+ 3 封装与库不一致（lib_footprint_mismatch：SW1、U2、J1）。8.0.9 时同一份封装包是 132 条（87 + 38 + 4 + 3）。丝印压铜从 38 降到 2 的原因**没查到**（规则没改，可能是 10 改了检查算法），课程只写实测数字，不解释原因。
  - `out/QB12.kicad_pcb`：**143 条警告**、0 错误、0 未连接 = 86 silk_overlap + 51 lib_footprint_issues + 4 silk_edge_clearance + 2 silk_over_copper（`hardware/pcb/out/QB12_drc.json`、`data/board.json` 的 `drc` 字段）。
  - 10 的 DRC 名称：silk_overlap 叫 **丝印间距**（"Silkscreen clearance"；8 叫 丝印重叠）；lib_footprint_mismatch 叫 封装与来源库中的封装**存在不一致**，条目文字例如 "封装 'X' 与库 'QB12' 中的副本不匹配"；条目格式例："SW1 的 线段, 位于 F.Silkscreen" [S55 `drc_item.cpp`][S54]。
  - DRC 对话框 "忽略的测试" 有 **7 项**（8 时 4 项）：missing_courtyard、track_not_centered_on_via、tuning_profile_track_geometries、footprint_filters_mismatch、pth_inside_courtyard、npth_inside_courtyard、footprint_type_mismatch [S59]。`.kicad_pro` 里明写为 ignore 的是其中 4 项（footprint_type_mismatch、missing_courtyard、npth_inside_courtyard、pth_inside_courtyard），另外 3 项 `.kicad_pro` 里没写（推测是 10 的默认严重级别）。
  - DRC 对话框里 8 的 "报告所有走线的所有错误" 复选框，10 挪进了右上齿轮菜单，叫 **为每条走线报告全部错误**（msgid "Report All Errors for Each Track"；旧的小写 msgid "Report all errors for each track" 在 mo 里还留着，译文仍是 报告所有走线的所有错误）[S54][S67 截图 #19]。

---

## 10. 不确定 / 需下单时再确认

1. **扩展库换料费**：EN FAQ 写 $3 / 种 [S06]，报价页写 $3.07 / 种（经济型）、$1.53 / 种（标准型）[S05]，金额随汇率变。**嘉立创国内站的人民币价格没能抓取**（jlcsmt.com TLS 校验失败、robots 禁止）→ 下单页确认。
2. **工程费、钢网费、焊点单价**：FAQ 和报价页的数字不一样（$8.00 vs $8.18 等）[S05][S06]。课程只讲费用由哪些项组成。
3. **默认表面处理**：JLC、嘉立创的能力页和 FAQ 都没写默认值 → 下单页确认（生产时间表用 HASL 做基准配置 [S14]）。有铅还是无铅，按 RoHS 需要选。
4. **板上标记 / 客编**：JLCPCB 国际站默认不加任何标记 [S25]；嘉立创默认在丝印层"适当位置"加客编，可以付费或免费指定位置（具体收费没核实）[S03]。下单时看"客编 / 订单号"选项，必要时在丝印层留位置。
   - **（2026-10-19 补充）** S25 原页面（`raw/How-to-mark-on-PCB.txt`）写着 JLCPCB 国际站自 2026 年 5 月起不再提供订单号标记，并提醒 "DO NOT add JLCJLCJLCJLC"。QB12 背面丝印留了 `JLCJLCJLCJLC` 占位（finalize.py）→ 国际站下单时它会原样印出来；嘉立创国内站的客编规则以下单页为准。
5. **经济型贴片数量上限**：2–50 [S04]、"30 片以上要拼板"[S06]、"≤30（50）"[S02] 三种写法。
6. **经济型有没有 AOI**：EN 写有 [S04]，CN 写无 [S02]。
7. **贴片单板尺寸上限、标准型 BGA 间距、回流温度**：EN 和 CN 写法不同（见 4.1）。
8. **贴片交期**：1–3 天 [S04] vs "90% 24 小时内"[S06]；PCB 24 小时只适用于 ≤100 × 100 mm、5 pcs、标准配置 [S14]。节假日另算。
9. **板厚可选范围**：0.4–4.5 [S01 表格] vs 0.4–3.2 [S01 FAQ] vs 0.4–4.8 [S02]。1.6 mm 在所有说法里都可选。
10. **丝印最小线宽**：EN 0.15 mm [S01]；CN 能力表 0.1 mm [S02] 和《下单前必看》常规 0.15 mm / 高精 0.1 mm [S03]。→ 课程统一按 **≥0.15 mm、字高 ≥1 mm** 教。
11. **孔位公差**：能力页 ±0.075 mm [S01] vs 博客 ±0.05 mm [S21] → 用能力页的数字。
12. **2 层板电测方式**（飞针全测还是抽测）：本表没找到 FR-4 2 层板的官方说明 → 看下单页 "Electrical Test" 选项。
13. **元件库规模和基础料数量**：FAQ 的数字自相矛盾 [S06]，不要引用。
14. **过孔盖油（Tent vias）**：KiCad 9 起已不在绘制对话框里，改到 电路板配置 → 电路板叠层 → 阻焊/锡膏 → 过孔盖油: 顶层 / 底层，单个过孔可在属性的 阻焊覆盖: 里改 [S55][S56]（见 5.1）。新板默认两面盖油，QB12 也是两面盖油。这一条在 10 里已经确定，不再是不确定项；只是如果学员还在用 KiCad 8，界面会是旧的 Plot 选项（8 时文档写 "Do not tent vias" [S30]、界面写 "Tent vias / 过孔盖油" [S11][S33]）。
15. **KiCad 中文菜单名**：现在取自 10.0.6 安装包的 `kicad.mo` [S54]，8.0.9 的旧译名见 [S33][S64]。不同小版本的翻译可能不同。8.0.9 的 "光绘 DSN" 误译在 10.0.6 里已改对（Specctra DSN...）；叠层表 "厚度" 列被译成 **线宽**、网络类表头 "微形内径" 这两个错还在；叠层表的芯板类型在 10.0.6 显示成没翻译的 **Core** [S54][S67]。10.0.6 的截图还没重拍：**网络检查面板默认显示哪些列、外观面板的层列表、主界面工具栏**在 10 里长什么样没开 GUI 看，未核实 [S67]。
16. **Freerouting**：Java 版本要求（现在是 JRE 25 [S60][S38]）、插件版本、哪些规则能经 DSN 传过去 [S40]，都会随版本变。**Freerouting 插件 2.4.1 在 KiCad 10 上能不能跑没实测**（项目自己的 route_a / route_b 脚本在 10.0.6 上能跑）[S67]。课上演示前要实测。
17. **ESP32-S3 净空图里的 "Max 2 / Max 1"** 具体量的是什么：请作者对照 [S46] 原图。15 mm 净空、天线伸出板边、馈点靠近板边这几点是文字明确写了的。
18. **双层板 90 Ω 差分的具体线宽线距**：Altium 的数字基于 Dk 4.8 [S44]，JLC 双层板 Dk 4.5 [S01]，而且 JLC 不给双层板做阻抗控制 → 用 JLC 阻抗计算器自己算，课上标明"仅供参考"。
19. **USBLC6-2 的 ST 应用笔记**：没找到确定编号，只引用了数据手册原文 [S50]。
20. **最便宜的 PCB 价（$2 / 5 pcs）和各种优惠券**都是促销，随时会变 [S15]。

21. **（2026-10-20 新增，KiCad 10 相关）**
    - **丝印压铜 DRC 从 38 条降到 2 条的原因**没查到（见 §9）。
    - **JLC KiCad 9 教程的原文**只看过 WebFetch 摘要，"勾 X2" 这一点最好打开原页核对一次 [S63]。
    - **钻孔、坐标对话框打开时的默认状态**：5.2 / 5.4 写的是 `_base.cpp` 里的初始值，实际对话框会记住上次的选择 [S55]。
    - **mac 上修饰键怎么显示**（⇧⌘ 还是 Shift+Cmd）没开 GUI 确认。
    - **IPC 插件（Via Stitching 4.0.0 等）开了 API 以后具体怎么用**：没装插件试过。
