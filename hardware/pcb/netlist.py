"""Boat QB12 主控板：唯一的网表来源。原理图、BOM、后面的 PCB 都从这里生成。
引脚号按各器件数据手册：ESP32-S3-WROOM-1、DRV8833PWP(HTSSOP-16)、AP2112K(SOT-23-5，原 ME6211 缺货替换，引脚相同)、
TP4056(ESOP-8)、USBLC6-2SC6(SOT-23-6)、AO3401A(SOT-23)、TYPE-C-31-M-12(16P)。
"""

# lib: 基础 / 扩展（嘉立创 SMT 元件库，2026-10-13 在立创商城核对）
PARTS = {
    # ---------- IC / 模组 ----------
    "U1": dict(value="ESP32-S3-WROOM-1-N8R2", lcsc="C2913204", fp="ESP32-S3-WROOM-1", lib="扩展", kind="ic",
               desc="主控模组（8MB Flash + 2MB PSRAM）",
               left=[("2", "3V3", "3V3"), ("3", "EN", "EN"), ("27", "IO0", "BOOT"), ("39", "IO1", "VBAT_ADC"),
                     ("38", "IO2", "LED_STAT"), ("17", "IO9", "USB_DET"), ("13", "IO19", "USB_DN"), ("14", "IO20", "USB_DP"),
                     ("1,40,41", "GND", "GND")],
               right=[("4", "IO4", "AIN1"), ("5", "IO5", "AIN2"), ("6", "IO6", "BIN1"), ("7", "IO7", "BIN2"),
                      ("8", "IO15", "nSLEEP"), ("9", "IO16", "nFAULT")]),
    "U2": dict(value="DRV8833PWPR", lcsc="C50506", fp="HTSSOP-16-EP", lib="扩展", kind="ic", desc="双路 H 桥电机驱动",
               left=[("16", "AIN1", "AIN1"), ("15", "AIN2", "AIN2"), ("9", "BIN1", "BIN1"), ("10", "BIN2", "BIN2"),
                     ("1", "nSLEEP", "nSLEEP"), ("8", "nFAULT", "nFAULT"), ("12", "VM", "VSYS"),
                     ("11", "VCP", "VCP"), ("14", "VINT", "VINT")],
               right=[("2", "AOUT1", "ML+"), ("4", "AOUT2", "ML-"), ("7", "BOUT1", "MR+"), ("5", "BOUT2", "MR-"),
                      ("3", "AISEN", "ISENA"), ("6", "BISEN", "ISENB"), ("13", "GND", "GND"), ("EP", "PAD", "GND")]),
    "U3": dict(value="AP2112K-3.3TRG1", lcsc="C51118", fp="SOT-23-5", lib="扩展", kind="ic", desc="3.3V LDO 600mA",
               left=[("1", "VIN", "VSYS"), ("3", "EN", "VSYS"), ("2", "GND", "GND")],
               right=[("5", "VOUT", "3V3"), ("4", "NC", "NC")]),
    "U4": dict(value="TP4056-42-ESOP8", lcsc="C16581", fp="ESOP-8", lib="扩展", kind="ic", desc="锂电池线性充电",
               left=[("4", "VCC", "VBUS"), ("8", "CE", "VBUS"), ("1", "TEMP", "GND"), ("2", "PROG", "PROG")],
               right=[("5", "BAT", "BAT+"), ("7", "CHRG", "CHRG"), ("6", "STDBY", "STDBY"), ("3", "GND", "GND"),
                      ("EP", "PAD", "GND")]),
    "U5": dict(value="USBLC6-2SC6", lcsc="C7519", fp="SOT-23-6", lib="扩展", kind="ic", desc="USB 数据线 ESD 保护",
               left=[("1", "I/O1", "USB_DP"), ("6", "I/O1", "USB_DP"), ("3", "I/O2", "USB_DN"), ("4", "I/O2", "USB_DN")],
               right=[("5", "VBUS", "VBUS"), ("2", "GND", "GND")]),
    "Q1": dict(value="AO3401A", lcsc="C15127", fp="SOT-23", lib="基础", kind="ic", desc="P-MOS，USB/电池自动切换",
               left=[("3", "D", "BAT_SW"), ("1", "G", "VBUS")], right=[("2", "S", "VSYS")]),
    "Q2": dict(value="AO3401A", lcsc="C15127", fp="SOT-23", lib="基础", kind="ic", desc="P-MOS，电源开关（大电流走这里）",
               left=[("2", "S", "BAT+"), ("1", "G", "PWR_EN_N")], right=[("3", "D", "BAT_SW")]),
    # ---------- 接口 / 开关 ----------
    "J1": dict(value="TYPE-C-31-M-12", lcsc="C165948", fp="USB-C-SMD-16P", lib="扩展", kind="ic", desc="USB-C 16P 母座",
               right=[("A4,A9,B4,B9", "VBUS", "VBUS"), ("A5", "CC1", "CC1"), ("B5", "CC2", "CC2"),
                      ("A6,B6", "DP", "USB_DP"), ("A7,B7", "DN", "USB_DN"), ("A8", "SBU1", "NC"), ("B8", "SBU2", "NC"),
                      ("A1,A12,B1,B12", "GND", "GND"), ("SH", "SHELL", "GND")], left=[]),
    "J2": dict(value="WAFER-PH2.0-2PWB", lcsc="C3029440", fp="PH2.0-2P-SMD-H", lib="扩展", kind="ic", desc="电池接口",
               left=[("1", "+", "BAT+"), ("2", "−", "GND")], right=[]),
    "J3": dict(value="WAFER-PH2.0-2PWB", lcsc="C3029440", fp="PH2.0-2P-SMD-H", lib="扩展", kind="ic", desc="左电机",
               left=[("1", "+", "ML+"), ("2", "−", "ML-")], right=[]),
    "J4": dict(value="WAFER-PH2.0-2PWB", lcsc="C3029440", fp="PH2.0-2P-SMD-H", lib="扩展", kind="ic", desc="右电机",
               left=[("1", "+", "MR+"), ("2", "−", "MR-")], right=[]),
    "SW1": dict(value="MSK12C02", lcsc="C431540", fp="SW-SMD-MSK12C02", lib="扩展", kind="ic", desc="电源拨动开关（只控制 Q2 栅极）",
                left=[("1", "ON", "GND"), ("3", "OFF", "NC")], right=[("2", "COM", "PWR_EN_N")]),
    "SW2": dict(value="TS-1187A-B-A-B", lcsc="C318884", fp="SW-SMD-5.1x5.1", lib="基础", kind="sw", desc="BOOT 按键",
                pins=("BOOT", "GND")),
    "SW3": dict(value="TS-1187A-B-A-B", lcsc="C318884", fp="SW-SMD-5.1x5.1", lib="基础", kind="sw", desc="RESET 按键",
                pins=("EN", "GND")),
    # ---------- 二极管 / LED ----------
    "D1": dict(value="SS34", lcsc="C8678", fp="SMA", lib="基础", kind="d", desc="USB 供电二极管", pins=("VBUS", "VSYS")),
    "LED1": dict(value="红 0603", lcsc="C2286", fp="LED-0603", lib="基础", kind="led", desc="充电中", pins=("LED1_A", "CHRG")),
    "LED2": dict(value="绿 0805", lcsc="C2297", fp="LED-0805", lib="基础", kind="led", desc="充满", pins=("LED2_A", "STDBY")),
    "LED3": dict(value="绿 0805", lcsc="C2297", fp="LED-0805", lib="基础", kind="led", desc="状态灯", pins=("LED3_A", "GND")),
    # ---------- 电阻 ----------
    "R1": dict(value="5.1kΩ", lcsc="C23186", fp="0603", lib="基础", kind="r", desc="CC1 下拉", pins=("CC1", "GND")),
    "R2": dict(value="5.1kΩ", lcsc="C23186", fp="0603", lib="基础", kind="r", desc="CC2 下拉", pins=("CC2", "GND")),
    "R3": dict(value="2kΩ", lcsc="C22975", fp="0603", lib="基础", kind="r", desc="充电电流 ≈0.55A", pins=("PROG", "GND")),
    "R4": dict(value="1kΩ", lcsc="C21190", fp="0603", lib="基础", kind="r", desc="LED1 限流", pins=("VBUS", "LED1_A")),
    "R5": dict(value="1kΩ", lcsc="C21190", fp="0603", lib="基础", kind="r", desc="LED2 限流", pins=("VBUS", "LED2_A")),
    "R6": dict(value="1kΩ", lcsc="C21190", fp="0603", lib="基础", kind="r", desc="LED3 限流", pins=("LED_STAT", "LED3_A")),
    "R7": dict(value="10kΩ", lcsc="C25804", fp="0603", lib="基础", kind="r", desc="EN 上拉", pins=("3V3", "EN")),
    "R8": dict(value="10kΩ", lcsc="C25804", fp="0603", lib="基础", kind="r", desc="IO0 上拉", pins=("3V3", "BOOT")),
    "R9": dict(value="10kΩ", lcsc="C25804", fp="0603", lib="基础", kind="r", desc="nSLEEP 下拉", pins=("nSLEEP", "GND")),
    "R10": dict(value="10kΩ", lcsc="C25804", fp="0603", lib="基础", kind="r", desc="nFAULT 上拉", pins=("3V3", "nFAULT")),
    "R11": dict(value="100kΩ", lcsc="C25803", fp="0603", lib="基础", kind="r", desc="电压检测分压", pins=("BAT_SW", "VBAT_ADC")),
    "R12": dict(value="100kΩ", lcsc="C25803", fp="0603", lib="基础", kind="r", desc="电压检测分压", pins=("VBAT_ADC", "GND")),
    "R13": dict(value="10kΩ", lcsc="C25804", fp="0603", lib="基础", kind="r", desc="Q1 栅极下拉", pins=("VBUS", "GND")),
    "R14": dict(value="100kΩ", lcsc="C25803", fp="0603", lib="基础", kind="r", desc="Q2 栅极上拉（关机）", pins=("BAT+", "PWR_EN_N")),
    "R15": dict(value="0.2Ω 1206", lcsc="C25335", fp="1206", lib="扩展", kind="r", desc="A 路限流 ≈1A", pins=("ISENA", "GND")),
    "R16": dict(value="0.2Ω 1206", lcsc="C25335", fp="1206", lib="扩展", kind="r", desc="B 路限流 ≈1A", pins=("ISENB", "GND")),
    "R17": dict(value="100kΩ", lcsc="C25803", fp="0603", lib="基础", kind="r", desc="USB 检测分压", pins=("VBUS", "USB_DET")),
    "R18": dict(value="100kΩ", lcsc="C25803", fp="0603", lib="基础", kind="r", desc="USB 检测分压", pins=("USB_DET", "GND")),
    # ---------- 电容 ----------
    "C1": dict(value="10µF", lcsc="C19702", fp="0603", lib="基础", kind="c", desc="TP4056 输入", pins=("VBUS", "GND")),
    "C2": dict(value="10µF", lcsc="C19702", fp="0603", lib="基础", kind="c", desc="电池端", pins=("BAT+", "GND")),
    "C3": dict(value="1µF", lcsc="C15849", fp="0603", lib="基础", kind="c", desc="LDO 输入", pins=("VSYS", "GND")),
    "C4": dict(value="10µF", lcsc="C19702", fp="0603", lib="基础", kind="c", desc="LDO 输出", pins=("3V3", "GND")),
    "C5": dict(value="10µF", lcsc="C19702", fp="0603", lib="基础", kind="c", desc="模组电源", pins=("3V3", "GND")),
    "C6": dict(value="100nF", lcsc="C14663", fp="0603", lib="基础", kind="c", desc="模组电源", pins=("3V3", "GND")),
    "C7": dict(value="1µF", lcsc="C15849", fp="0603", lib="基础", kind="c", desc="EN 延时", pins=("EN", "GND")),
    "C8": dict(value="100nF", lcsc="C14663", fp="0603", lib="基础", kind="c", desc="ADC 滤波", pins=("VBAT_ADC", "GND")),
    "C9": dict(value="22µF", lcsc="C45783", fp="0805", lib="基础", kind="c", desc="电机电源储能", pins=("VSYS", "GND")),
    "C10": dict(value="22µF", lcsc="C45783", fp="0805", lib="基础", kind="c", desc="电机电源储能", pins=("VSYS", "GND")),
    "C14": dict(value="22µF", lcsc="C45783", fp="0805", lib="基础", kind="c", desc="电机电源储能", pins=("VSYS", "GND")),
    "C15": dict(value="22µF", lcsc="C45783", fp="0805", lib="基础", kind="c", desc="电机电源储能", pins=("VSYS", "GND")),
    "C11": dict(value="100nF", lcsc="C14663", fp="0603", lib="基础", kind="c", desc="VM 去耦", pins=("VSYS", "GND")),
    "C12": dict(value="10nF", lcsc="C57112", fp="0603", lib="基础", kind="c", desc="VCP 电荷泵", pins=("VCP", "VSYS")),
    "C13": dict(value="2.2µF", lcsc="C23630", fp="0603", lib="基础", kind="c", desc="VINT 去耦", pins=("VINT", "GND")),
}


def pin_list(ref):
    p = PARTS[ref]
    if p["kind"] == "ic":
        return [(num, name, net) for (num, name, net) in p.get("left", []) + p.get("right", [])]
    a, b = p["pins"]
    return [("1", "", a), ("2", "", b)]


def nets():
    out = {}
    for ref in PARTS:
        for num, name, net in pin_list(ref):
            if net == "NC":
                continue
            out.setdefault(net, []).append(f"{ref}.{num}")
    return out


def check():
    problems = []
    for net, conns in sorted(nets().items()):
        if len(conns) < 2:
            problems.append(f"网络 {net} 只有一个连接点：{conns}")
    return problems


if __name__ == "__main__":
    n = nets()
    for k in sorted(n):
        print(f"{k:10s} {len(n[k]):2d}  {' '.join(n[k])}")
    print("检查：", check() or "全部网络至少两个连接点")
