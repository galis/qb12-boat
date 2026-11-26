#!/usr/bin/env python3
"""report.py - write assets/kicad_shots.md from out/manifest.json + the hand-checked notes below.

The "texts" lists were read off the final screenshots (KiCad 8.0.9 zh_CN); update them when a shot
is re-taken with a different state.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
KSHOT = Path(os.environ.get("KSHOT", "/tmp/claude-0/-home-claude/a03b22b4-4de2-59bd-890a-4be94b9a8f94/scratchpad/kshot"))
ASSETS = Path(os.environ.get("ASSETS", HERE.parent.parent / "assets"))

ORDER = [l.split("\t")[0] for l in (ASSETS / "kicad_shots_list.txt").read_text().splitlines() if l.strip()]
MEANING = dict(l.split("\t", 1) for l in (ASSETS / "kicad_shots_list.txt").read_text().splitlines() if "\t" in l)

TEXTS = {
"kicad_layers_panel": "面板标题 外观；选项卡 层 / 对象；层列表（颜色块 + 眼睛图标）F.Cu、B.Cu、F.Adhesive、B.Adhesive、F.Paste、B.Paste、F.Silkscreen、B.Silkscreen、F.Mask、B.Mask、User.Drawings、User.Comments、User.Eco1、User.Eco2、Edge.Cuts、Margin、F.Courtyard（最后一行被滚动条截半）；层显示选项；预设 (Ctrl+Tab): ---；左边带一点板子右上角（天线禁布区、U1）和右侧工具栏。放大 1.5 倍。",
"kicad_stackup": "标题 电路板配置；左侧树 电路板叠层 → 板层编辑器 / **物理叠层** / 板面处理 / 阻焊/锡膏，文本与图形 → 默认 / 格式 / 文本变量，设计规则 → 约束 / 预设尺寸 / 泪滴 / 长度调整规则 / 网络类 / 自定义规则 / 违规严重级别；铜层: 2；阻抗控制 ☐；添加介电层... / 移除介电层...；列 层 编号 类型 材料 线宽 颜色 Epsilon R Loss Tan；F.Silkscreen 顶层丝印，F.Paste 顶层锡膏，F.Mask 顶层阻焊 0.01 mm 3.3 / 0，F.Cu 铜层 0.035 mm，介质 1 核心 FR4 1.51 mm 4.5 / 0.02，B.Cu 铜层 0.035 mm，B.Mask 底层阻焊 0.01 mm，B.Paste 底层锡膏，B.Silkscreen 底层丝印；材料、颜色多为 未指定；电路板叠层厚度: 1.6 mm；调整电介质厚度；导出到剪贴板；从另一个电路板导入设置...；按钮 Cancel / OK（英文，没翻译）",
"kicad_constraints": "电路板配置 → 设计规则 → **约束**。铜层: 最小间距 0.15、最小走线宽度 0.15、最小连接宽度 0、最小孔环宽度 0.1、最小过孔直径 0.5、铜到孔的间距 0.25、铜箔到板边间距 0.3（mm）；过孔: 最小通孔 0.3、孔到孔的间距 0.25；微孔: 最小微孔直径 0.2、最小微孔孔径 0.1；丝印层: 最小项目间距 0、最小文本高度 0.8、最小文本线宽 0.08；弧线/圆 由线段逼近: 最大允许偏差 0.005 mm（注: < 0.005 mm 时覆铜填充可能会变慢。）；域填充策略: 允许圆角超出域的外框 ☐、最小散热引线数量 2；长度调整: 计算走线长度时考虑叠层高度 ☑",
"kicad_predef_sizes": "电路板配置 → 设计规则 → **预设尺寸**。走线: 宽度 0.2 / 0.3 / 0.4 / 0.5 / 0.8 mm；过孔: 直径 / 孔径 0.6 / 0.3 mm、0.8 / 0.4 mm；差分对走线: 宽度 / 间隙 / 过孔间隙（空）。⚠ 交付的 QB12 工程这张表是**空的**，截图用的工作副本填入了 QB12 实际用到的线宽和两种过孔。",
"kicad_netclasses": "电路板配置 → 设计规则 → **网络类**。上表 网络类: 列 名称 铜皮间距 走线宽度 过孔外径 过孔内孔 微孔外径 微形内径（原文如此，是翻译笔误） 差分对宽度 差分对间隙；Default 0.18 / 0.2 / 0.6 / 0.3 / 0.3 / 0.1 / 0.2 / 0.25，Batt 0.2 / 0.8 / 0.8 / 0.4，Motor 0.18 / 0.4 / 0.8 / 0.4，Power 0.18 / 0.5 / 0.8 / 0.4，Rail 0.18 / 0.3 / 0.6 / 0.3（mm）。下表 网络类分配: 匹配规则 / 网络类 —— GND→Power、VBUS→Power、ML+ ML- MR+ MR- ISENA ISENB→Motor、3V3→Rail、BAT+ VSYS→Batt；右边 满足匹配规则 'GND' 的网络: GND",
"kicad_fp_editor": "标题 U2 [从 QB12.kicad_pcb] — 封装编辑器；菜单 文件 (F) 编辑 (E) 视图 (V) 放置 (P) 检查 (I) 工具 (T) 设置 (R) 帮助 (H)；提示条 正在从电路板编辑 U2。保存只会更新电路板。；工具栏 0.5000 mm (19.69 mils)、缩放倍数 13.00、当前层 F.Silkscreen；画面: 上下两排焊盘 1–16（椭圆，带编号）、中间 17 号散热焊盘上 4 个孔（标 17）、黄色 F.Silkscreen 外框和 1 脚圆点、F.Fab 上的 ${REFERENCE} 和 DRV8833PWPR（后者在底边被截一半）；右侧 外观 层列表（F.Cu、内层、B.Cu …）、预设 (Ctrl+Tab) 出现两次（第二个本应是“视角”，界面原样）；状态栏 U2 / DRV8833PWPR / 库 QB12 / 封装名称 TSSOP-16_L5.0-W4.4-P0.65-LS6.4-BL-EP / 焊盘 21。注意封装名是 TSSOP-16_…-BL-EP，不是 HTSSOP。",
"kicad_fp_props": "标题 封装属性；选项卡 通用 / 间距重写和设置 / 3D 模型；字段 表头 名称 数值 显示 宽度 高度 线宽 层；Reference U2（显示 ☑，0.8 mm，F.Silkscreen）、Value DRV8833PWPR（F.Fab）、Footprint、Datasheet、Description、LCSC Part C50506（F.Fab）、LCSC C50506（F.Silkscreen，不显示）；坐标 X 114.5 / Y 111 mm、方向 -90、侧面 顶层、锁定 ☐；特性: 封装类型 贴片、不在原理图中、从定位文件中移除、从物料清单中移除、忽略封装外框要求、DNP (不作装配)（都没勾）；按钮 从库中更新封装... / 替换封装... / 编辑封装... / 编辑库封装...；库链接: QB12:TSSOP-16_L5.0-W4.4-P0.65-LS6.4-BL-EP；Cancel / OK",
"kicad_pad_props": "标题 焊盘属性；选项卡 通用 / 连接 / 间距重写；焊盘类型 贴片；焊盘编号 17；网络名称 GND；位置 X 114.5 Y 111 mm；焊盘形状 矩形；焊盘尺寸 X 2.74 Y 2.74 mm；角度 0；形状与孔的偏移 ☐；指定焊盘到 Die 的长度 ☐；铜层: F.Cu；工艺层: F.Paste ☑、F.Mask ☑（其余不勾）；制造属性: 无；底部 封装 U2 (DRV8833PWPR), 正面, 旋转 -90°；在草图模式下预览焊盘 ☐；右侧焊盘预览（红色方块 17）。右上角一块无内容区域（虚拟屏没画出来）用对话框底色填平。",
"kicad_fp_lib_table": "标题 封装库；选项卡 全局库 / **工程专用库**；表头 活动的 名称 库路径 库格式 选项 描述；一行 ✔ QB12 ${KIPRJMOD}/QB12.pretty KiCad “Boat QB12 footprints from LCSC/EasyEDA”；按钮 迁移库。截到表格下方为止（下面的 可用的替换路径 列表和 Cancel/OK 被裁掉：里面 ${KIPRJMOD} 显示的是本机临时目录）",
"kicad_pcb_main": "标题 QB12 — PCB 编辑器；菜单 文件 (F) 编辑 (E) 视图 (V) 放置 (P) 布线 (U) 检查 (I) 工具 (T) 设置 (R) 帮助 (H)；工具栏 走线: 使用网络类宽度 / 过孔: 使用网络类尺寸 / F.Cu (PgUp) / 0.5000 mm (19.69 mils)（栅格）/ 缩放倍数 5.00；右侧 外观（层 / 对象）、预设 (Ctrl+Tab)、视角 (Shift+Tab)、选择筛选器（所有项目 锁定项目 封装 文本 走线 过孔 焊盘 图形 域 规则区 测量标注 其他项目）；底部 焊盘 217 过孔 177 走线段 391 网络 36 未布线 0；Z 4.72；栅格 0.5000；mm",
"kicad_edge_only": "主窗口；只开 Edge.Cuts（白色圆角矩形板框）和 F.Courtyard（洋红色元件外框）；外观面板里其余层的眼睛都是关的；过孔、焊盘、锚点也隐藏。J1（USB-C）外框伸出下边、SW1 外框伸出左边。状态栏 焊盘 217 过孔 177 走线段 391 网络 36 未布线 0",
"kicad_net_highlight": "主窗口；VSYS 网络亮、其余变暗；左下状态栏 网络名称 VSYS 网络码 16 焊盘 12 过孔 2 网络长度 56.0606 mm 在板上 56.0606 mm 在封装中 0.0000 mm；最下面一行残留提示 找到了' U2'（之前用过查找）",
"kicad_net_inspector": "标题 网络检查；网络名称筛选:（空）；显示 0 焊盘网络 ☑；分组: ☐；通配符；表头 网络 名称 焊盘数量 过孔数量 过孔长度 走线长度 Die 引线长度 总长度 F.Cu B.Cu；可见 001 3V3 … 021 MR+，其中 007 USB_DN 5 / 0 / 走线 18.6008 mm、008 USB_DP 5 / 0 / 16.7461 mm、009 GND 56 / 149、016 VSYS 12 / 2 / 52.9600 mm（总长 56.1600 mm）；按钮 关闭 / 创建报告...",
"kicad_route_live": "主窗口，缩放倍数 20.00；正在画 USB_DP（U5 1 脚 → 往 U1 14 脚），红色亮线 + 间距轮廓，飞线连到 U1 的 14 USB_DP 焊盘，上面平行的是 USB_DN；底部状态栏 布线: USB_DP、已解析的网络类: Default、角的样式 45 度、模式 绕走、走线宽度: 0.2000 mm (从 现存线路)、最小间距: 0.1800 mm (从 网络类 'Default')；右下 布线(单端)",
"kicad_zone_props": "标题 覆铜域属性；层 F.Cu ☑ / B.Cu ☐；网络 列表选中 GND；隐藏自动生成的网络名称 ☑；根据焊盘数量对网络进行排序 ☐；通用: 域名称（空）、域优先级 0；形状: 锁定 ☐、外框显示 阴影线、外框阴影线间距 0.5 mm、拐角平滑 无、圆角半径；电气特性: 电气间隙 0.3 mm、最小宽度 0.25 mm、焊盘连接 实心、缓释热焊盘 (花焊盘) 间隙 0.5 mm、散热引线宽度 0.5 mm；填充: 填充类型 实心填充、方向、栅格宽度、栅格间隙、平滑效果、平滑量、死铜移除 总是启用、最小死铜尺寸 10 mm²；Cancel / OK",
"kicad_bcu_view": "主窗口；当前层 B.Cu (PgDn)；只开 B.Cu + Edge.Cuts：整片蓝色 GND 铺铜、底层走线切出的细缝、过孔（黄心）、右上角天线禁布区（蓝色斜线框，里面没铜）、U2 / U4 下面的散热过孔群",
"kicad_zones_unfilled": "主窗口（标题 *QB12 — PCB 编辑器，星号 = 已修改）；铺铜只剩板边一圈带斜线的外框；GND 焊盘之间出现飞线；底部状态栏 未布线 154（填充时是 0）",
"kicad_keepout_props": "标题 规则区属性；层: F.Cu ☑ B.Cu ☑（其余不勾）；区名称（空）；锁定 ☐；基本规则: 禁止放置走线 ☑、禁止放置过孔 ☑、禁止放置焊盘 ☐、禁止填充 (铺铜) ☑、禁止放置封装 ☐；外框显示 阴影线；外框阴影线间距 0.5 mm；Cancel / OK",
"kicad_drc": "标题 设计规则检查；在执行 DRC 之前重新填充所有覆铜域 ☑；报告所有走线的所有错误 ☐；选项卡 违规 (132) / 未连接项目 (0) / 原理图一致性 (不运行) / 忽略的测试 (4)；条目 警告: 丝印重叠 —— 位号 'C3' / F.Silkscreen 上的 线段 …；显示: 所有 ☐ 错误 ☑ 0、警告 ☑ 132、排除 ☐；按钮 保存... / 删除标记 / 删除所有标记 / 关闭 / 运行 DRC。132 = 87 丝印重叠 + 38 丝印压在阻焊开窗上 + 4 丝印离板边太近 + 3 封装与库不一致（kicad-cli 在同一工程上的分类；board.json 的 180 是 10-13 那次，多 51 条“封装库没登记”）",
"kicad_3d_top": "标题 3D 查看器；菜单 文件 (F) 编辑 (E) 视图 (V) 设置 (S) 帮助 (H)（注意这里是 设置 (S)）；顶视图；右侧 外观: 电路板主体 F.Cu B.Cu Adhesive Solder Paste F.Silkscreen B.Silkscreen F.Mask B.Mask User.* / 通孔模型 贴片模型 虚拟模型 POS 文件外的模型 标记为 DNP 的模型 模型边框 / 值 位号 封装文本 板外丝印 / 3D 坐标轴 背景起始色 背景终止色 / 使用电路板叠层颜色 ☐ / 预设 (Ctrl+Tab) 视角 (Shift+Tab)；绿色阻焊；没有高亮元件",
"kicad_3d_angle": "同一个 3D 查看器，鼠标拖动转成斜视；能看出 PH2.0 插座、USB-C、ESP32 模组屏蔽罩、按键的高度；没有高亮元件；状态栏 渲染时间 … ms",
"kicad_plot_gerber": "标题 **绘制**；绘制格式: Gerber；输出目录: gerber/；包含层 勾 F.Cu B.Cu F.Paste B.Paste F.Silkscreen B.Silkscreen F.Mask B.Mask Edge.Cuts；在所有层上绘制（都不勾）；通用选项: 绘制图纸边框和标题栏 ☐、绘制封装值 ☑、绘制位号 ☑、绘制封装文本 ☑、强制绘制隐藏的值或参考位号 ☐、制造层上的草图焊盘 ☐、绘制前检查域填充 ☑、钻孔标记: 无、缩放比例: 1:1、绘制模式: 填充、使用 钻孔/定位 文件原点 ☐、镜像绘制、负片绘制（灰）、过孔盖油 ☑；Gerber 选项: 使用 Protel Gerber 文件扩展名 ☑、生成 Gerber 作业文件 ☐、剔除阻焊开窗中的丝印 ☑、坐标格式: 4.6, 单位 mm、使用 Gerber X2 格式(推荐) ☐、包含网表特性 ☐、禁用自定义光圈 (宏光圈) (不推荐) ☐；输出信息；按钮 运行 DRC... / 生成钻孔文件... / 关闭 / 绘制",
"kicad_drill": "标题 生成钻孔文件；输出文件夹: gerber/；钻孔文件格式: Excellon ◉、Y 轴镜像 ☐、最少钻头种类 ☐（= Minimal header 的译名）、合并金属化孔 (PTH) 和非金属化 (NPTH) 到单个文件中 ☐；椭圆孔钻孔模式（在左边）: 使用铣孔命令 (推荐) ○ / 使用备选钻孔模式 ◉；Gerber X2 ○；映射文件格式: PostScript / Gerber X2 ◉ / DXF / SVG / PDF；钻孔原点: 绝对 ◉ / 钻孔/定位 文件原点；钻孔单位: 毫米 (mm) ◉ / 英寸 (Inches)；零的格式: 十进制格式(推荐) ◉ / 去掉前导零 / 去掉后导零 / 保留所有零；精度: 3:3；孔数量: 金属化焊盘 8、非金属化焊盘 4、通孔 177、微孔 0、埋孔 0；消息；按钮 生成报告文件... / 生成映射文件 / 关闭 / 生成钻孔文件",
"kicad_pos": "标题 **生成布置文件**（菜单叫 元件定位文件，按钮叫 生成定位文件）；输出目录:（空）；格式: ASCII / CSV ◉ / Gerber X3；单位: 英寸 (Inches) / 毫米 (mm) ◉；文件: 将顶层和底层的文件分开 / 独立的电路板文件 ◉；仅包含贴片封装 ☐；排除具有通孔焊盘的所有封装 ☐；排除所有设置了 'DNP (不作装配)' 特性的封装 ☐；包括电路板边框层（灰）；使用 钻孔/定位 文件原点 ☐；对底层的封装使用负 X 坐标 ☐；输出信息；按钮 关闭 / 生成定位文件",
"kicad_gerbview": "标题 QB12-NPTH.drl — Gerber 查看器；菜单 文件 (F) 视图 (V) 工具 (T) 设置 (S) 帮助 (H)；工具栏 11 QB12-NPTH.drl (Other, Drill)、fmt: mm X3.3 Y3.3 no TZ、元件: / 网络: / 属性: / D 码: <没有选择>、自动缩放；右侧 层管理器（层 / 项目）: 1 QB12-F_Cu.gtl (Copper, L1)、2 QB12-B_Cu.gbl (Copper, L2)、3 QB12-F_Silkscreen.gto (Legend, Top)、4 QB12-B_Silkscreen.gbo (Legend, Bot)、5 QB12-F_Mask.gts (Soldermask, Top)、6 QB12-B_Mask.gbs (Soldermask, Bot)、7 QB12-F_Paste.gtp (Paste, Top)、8 QB12-B_Paste.gbp (Paste, Bot)、9 QB12-Edge_Cuts.gm1 (Profile, NP)、10 QB12-PTH.drl (Other, Drill)、11 QB12-NPTH.drl (Other, Drill)；底部 格式 X1 绘图层 11",
"kicad_assign_fp": "标题 分配封装（CvPcb）；菜单 文件 (F) 编辑 (E) 设置 (S) 帮助 (H)；工具栏 封装筛选规则:（第 1 个按钮按下）+ 搜索框 JST_PH；左栏 封装库（Audio_Module … Connector_JAE）；中栏 符号: 封装分配 —— 1 D1 - RED : LED_SMD:LED_0603_1608Metric、2 J1 - BATT :（空，选中）、3 R1 - 1k : Resistor_SMD:R_0603_1608Metric；右栏 筛选的封装 1 Connector_JST:JST_PH_B2B-PH-K_1x02_P2.00mm_Vertical（选中）…；状态栏 筛选 关键字 (Connector*:*_1x??_*), 搜索文本 (JST_PH): 30 个匹配的封装、库位置: 未知；按钮 应用, 保存原理图并继续 / Cancel / OK",
"kicad_update_pcb": "标题 从原理图更新 PCB；选项: 根据原理图的位号将封装重新链接到原理图符号 ☐、删除没有对应符号的封装 ☐、用原理图中指定的封装替换 ☑；应用变更: 正在处理符号 'D1:LED_SMD:LED_0603_1608Metric'。/ 'J1:Connector_JST:JST_PH_B2B-PH-K_1x02_P2.00mm_Vertical'。/ 'R1:Resistor_SMD:R_0603_1608Metric'。添加 D1 (封装 …)。添加 J1 …。添加 R1 …。总计警告: 0, 错误: 0。；显示: 所有 错误 0 警告 0 操作 信息；按钮 保存... / 关闭 / 更新 PCB",
}

# command | facts.md §6 (what lessons are told to write) | seen in the 8.0.9 UI here | note
MENUS = [
 ("顶层菜单 (PCB 编辑器)", "文件 (F) 编辑 (E) 视图 (V) 放置 (P) 布线 (U) 检查 (I) 工具 (T) 设置 (R) 帮助 (H)（AUTHORS.md）", "同左", "✓"),
 ("“没翻译的顶层菜单”", "§6 说明：8.0.9 的 &Route、&Export、&Import 等仍显示英文", "布线 (U)、文件 → 导入 / 导出 都是中文", "⚠ facts.md 这句不对（至少 PCB 编辑器里），截图里看不到英文菜单；只有 Cancel / OK 按钮和 Elapsed time 是英文"),
 ("电路板配置", "文件 → 电路板配置...", "文件 → 电路板配置...（对话框标题 电路板配置）", "✓（任务说明里写的“电路板设置”不对）"),
 ("物理叠层", "—", "电路板配置 → 电路板叠层 → 物理叠层（同组还有 板层编辑器、板面处理、阻焊/锡膏）", "—"),
 ("约束 / 预设尺寸 / 网络类 / 自定义规则", "设计规则 → 约束 / 预设尺寸 / 网络类 / 自定义规则", "设计规则 → 约束 / 预设尺寸 / 泪滴 / 长度调整规则 / 网络类 / 自定义规则 / 违规严重级别", "✓"),
 ("Gerber", "文件 → 制造输出 → Gerbers (.gbr)...", "同左；打开的对话框标题是 绘制", "✓"),
 ("绘制", "文件 → 绘制...", "文件 → 绘制...", "✓"),
 ("钻孔文件", "钻孔文件 (.drl)...", "文件 → 制造输出 → 钻孔文件 (.drl)...；对话框 生成钻孔文件；绘制 对话框右下也有 生成钻孔文件...", "✓"),
 ("坐标文件", "元件定位文件 (.pos, .gbr)...", "文件 → 制造输出 → 元件定位文件 (.pos, .gbr)...；对话框标题 **生成布置文件**，按钮 生成定位文件", "✓（标题不同，注意别写成“生成定位文件对话框”）"),
 ("制造输出 子菜单其他项", "—", "IPC-2581 文件 (.xml)... / 封装报告 (.rpt)... / IPC-D-356 网络列表文件... / BOM (物料清单)...", "—"),
 ("DRC", "检查 → 设计规则检查，无快捷键", "检查 → 设计规则检查（无快捷键）；对话框标题 设计规则检查", "✓（课程里叫“设计规则检查器”的地方，界面上没有“器”字）"),
 ("网络检查器", "（§6 未列）", "检查 → 网络检查（第一项）；对话框标题 网络检查", "⚠ 界面叫“网络检查”，不是“网络检查器”"),
 ("3D 查看器", "视图 → 3D 查看器，Alt+3", "视图 → 3D 查看器 Alt+3；3D 窗口里菜单是 设置 (S)", "✓"),
 ("取消填充 / 填充所有域", "编辑 → 取消填充所有域 Ctrl+B / 填充所有域 B", "编辑 → 填充所有域 B / 取消填充所有域 Ctrl+B", "✓"),
 ("高亮网络", "（§6 未列）", "` 键（反引号）= 高亮网络（翻译 高亮网络）；再按一次取消", "—"),
 ("属性", "属性... E", "E 打开 封装属性 / 焊盘属性 / 覆铜域属性 / 规则区属性", "✓"),
 ("封装编辑器", "工具 → 封装编辑器；选中后 Ctrl+E 在封装编辑器中打开", "工具 → 封装编辑器；Ctrl+E 打开窗口标题 “U2 [从 QB12.kicad_pcb] — 封装编辑器”，提示条 正在从电路板编辑 U2。保存只会更新电路板。", "✓"),
 ("管理封装库", "（§6 未列）", "设置 → 管理封装库...；对话框标题 封装库，选项卡 全局库 / 工程专用库", "—（不是“封装库表”）"),
 ("从原理图更新 PCB", "工具 → 从原理图更新 PCB... F8", "原理图编辑器 工具 → 从原理图更新 PCB... F8；PCB 编辑器 工具 菜单第一项同名（QB12 没原理图，是灰的）", "✓；只在从项目管理器打开时可用"),
 ("分配封装", "工具 → 分配封装...", "原理图编辑器 工具 → 分配封装...；窗口标题 分配封装", "✓"),
 ("单端 / 差分布线", "布线 → 布线(单端) X / 布线(差分) 6", "布线 (U) → 设置层对... / 布线(单端) X / 布线(差分) 6 / 调整单端走线长度 7 / 调整差分对走线长度 8 / 调整差分对走线 skew 9 / 交互布线设置... Ctrl+<", "✓"),
 ("放置菜单", "添加过孔 Ctrl+Shift+V、添加填充域 Ctrl+Shift+Z、添加规则区 Ctrl+Shift+K、绘制线 Ctrl+Shift+L", "添加封装 A、添加过孔 Shift+Ctrl+V、添加填充域 Shift+Ctrl+Z、添加规则区 Shift+Ctrl+K、绘制线 Shift+Ctrl+L、绘制弧线、绘制矩形、绘制圆形、绘制多边形、钻孔/定位 文件原点、栅格原点 …", "✓（界面里修饰键写作 Shift+Ctrl+…）"),
 ("检查 菜单", "—", "网络检查 / 显示电路板统计信息 / 测量工具 Shift+Ctrl+M / 设计规则检查 / 上一个标记 / 下一个标记 / 排除此标记 / 间距解析 / 约束解析 / 显示封装分配 / 将封装与库比较", "—"),
 ("工具 菜单 (PCB)", "工具 → 外部插件", "从原理图更新 PCB... F8 / 切换到原理图编辑器 / 封装编辑器 / 从库中更新封装... / 清理走线和过孔... / 移除未使用的焊盘... / 清理图形... / 修复电路板 / 按位置重新批注... / 从 PCB 更新原理图... / 脚本控制台 / 外部插件", "✓"),
 ("设置 菜单 (PCB)", "—", "配置路径... / 管理封装库... / 偏好设置... Ctrl+, / 设置语言", "—"),
 ("自适应缩放", "—", "视图 → 自适应缩放 Home", "—"),
]


# lesson captions / alt texts that no longer match (checked 2026-10-19 against lessons/p*.html)
CAPTIONS = [
 ("p2", "kicad_fp_editor", "alt 写“U2 的 HTSSOP-16 封装”", "库里的名字是 QB12:TSSOP-16_L5.0-W4.4-P0.65-LS6.4-BL-EP（-EP = 带裸露焊盘）；DRV8833 的封装 HTSSOP 可以说，但别当成封装名。图注其余（4 个小孔、黄色 1 脚圆点、标题栏“从 QB12.kicad_pcb”）对得上"),
 ("p3", "kicad_edge_only", "图注“紫色圆圈是孔”", "最终截图把过孔 / 焊盘 / 锚点也关了，只剩白色板框和洋红色元件外框（F.Courtyard），没有紫色圆圈了。另外图注里“（ mm，四角 R）”的数字是空的"),
 ("p4", "kicad_net_inspector", "alt 抄成了网络类那张的 alt", "应为“网络检查对话框，列出每个网络的焊盘数、过孔数和长度”之类；图注里 USB_DN 18.6008 mm、USB_DP 16.7461 mm 和截图一致"),
 ("p4", "kicad_net_highlight", "alt 写“交互式布线进行中”", "应为“高亮 VSYS 网络”；图注本身对"),
 ("p5", "kicad_predef_sizes", "图注“QB12 列的正是它用到的两种过孔”", "交付的 QB12 工程预设尺寸表是空的；截图里的 5 种线宽、2 种过孔是工作副本里按 QB12 实际用到的尺寸填的，图注要说明"),
 ("p5", "kicad_zones_unfilled", "图注“取消填充后的 QB12 左上角”“未布线 从 0 变成了 ：”", "最终截图是整块板（自适应缩放），不是左上角；未布线 = 154"),
 ("p6", "kicad_3d_top", "图注“亮绿色的那颗是在 PCB 编辑器里选中的 U2”", "最终截图里没有选中 / 高亮任何元件，删掉这句"),
 ("p6", "kicad_3d_angle", "alt 写“QB12 顶视图”", "应为斜视"),
 ("p7", "kicad_drill", "图注“右边是钻孔原点、单位、零的格式和椭圆孔钻孔模式”", "椭圆孔钻孔模式在左栏（Excellon 下面）；右边两栏是 钻孔原点 / 钻孔单位 / 零的格式 和 孔数量"),
 ("p7", "kicad_pos", "alt 写“生成定位文件对话框”", "对话框标题是“生成布置文件”（按钮叫 生成定位文件）"),
 ("p1", "kicad_layers_panel", "—", "对得上（层显示选项、预设 (Ctrl+Tab) 都在图里）"),
 ("p6", "kicad_drc", "—", "对得上（132 条）"),
]


def main():
    mf = json.loads((KSHOT / "out/manifest.json").read_text())
    L = ["# KiCad 截图清单（kicad_shots.md）", "",
         "KiCad 8.0.9，简体中文界面，在本容器的虚拟屏（Xvfb 1400×900 + openbox 窗口管理器）里由脚本 "
         "`tools/kshot/kshot.py` 自动操作截取。工程：交付的 QB12 KiCad 工程包（2026-10-19 修过的那份）的副本；"
         "需要改状态的截图用的是工作副本（见各条“注意”）。对话框截的是带标题栏的对话框窗口本身，板子视图截的是整个编辑器窗口。"
         "WebP，最宽 1400 px，质量约 80，每张 ≤ 120 KB。", "",
         "状态：real = 真截图；placeholder = 还是灰色占位图。", ""]
    real = sum(1 for n in ORDER if mf.get(n, {}).get("status") == "real")
    L += [f"**{real} / {len(ORDER)} 张是真截图。**", ""]
    L += ["| 名称 | 状态 | 像素 | KB | 课程用途 |", "|---|---|---|---|---|"]
    for n in ORDER:
        m = mf.get(n, {})
        p = ASSETS / f"{n}.webp"
        w = h = kb = "—"
        if p.exists():
            im = Image.open(p)
            w, h, kb = im.width, im.height, f"{p.stat().st_size / 1024:.0f}"
        L.append(f"| `{n}` | {m.get('status', 'placeholder')} | {w}×{h} | {kb} | {MEANING.get(n, '')} |")
    L += ["", "## 每张截图：怎么打开的、画面里有哪些中文", ""]
    for n in ORDER:
        m = mf.get(n, {})
        L += [f"### `{n}` — {MEANING.get(n, '')}", ""]
        L.append(f"* 状态：{m.get('status', 'placeholder')}")
        if m.get("how"):
            L.append(f"* 打开方式：{m['how']}")
        if m.get("caveat"):
            L.append(f"* 注意：{m['caveat']}")
        if n in TEXTS:
            L.append(f"* 画面里的关键文字：{TEXTS[n]}")
        L.append("")
    L += ["## 菜单路径：facts.md §6 vs. 实际 8.0.9 中文界面", "",
          "| 功能 | facts.md §6 / AUTHORS.md | 实际界面（本次截图时看到的） | 结论 |", "|---|---|---|---|"]
    for row in MENUS:
        L.append("| " + " | ".join(row) + " |")
    L += ["", "## 课程里已发现的图注出入（供主编核对）", "",
          "| 课 | 截图 | 课程里写的 | 实际截图 |", "|---|---|---|---|"]
    for row in CAPTIONS:
        L.append("| " + " | ".join(row) + " |")
    L += ["", "## 制作说明", "",
          "* 工具与复现方法：`tools/kshot/README.md`（`python3 prepare.py && python3 kshot.py all && python3 report.py`）。",
          "* 绘制 / 钻孔 / 坐标对话框里的选项是事先按 facts.md §5.1 / §5.2 / §5.4 设成 JLC 推荐值的（工作副本的 "
          "pcbplotparams 和 HOME 里的 pcbnew.json），不是 QB12 交付时脚本用的设置（那套用的是“全辅助原点”，见 §5.3）。",
          "* 画布用的是 KiCad 的 Cairo 渲染（虚拟屏没有显卡）；3D 查看器用 Mesa llvmpipe 的 OpenGL。颜色、字体和普通桌面上一样。",
          ""]
    (ASSETS / "kicad_shots.md").write_text("\n".join(L))
    print("wrote", ASSETS / "kicad_shots.md", real, "real")


if __name__ == "__main__":
    main()
