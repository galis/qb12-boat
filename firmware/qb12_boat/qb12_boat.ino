// Boat QB12 遥控船固件 · ESP32-S3 + Bluepad32 + DRV8833
// 基线来自 courses/circuit/l9.js（第 9 课），在它上面加了：电机反向开关、断连/失联停机、缓加速、低电压限速/停机、插 USB 禁电机、串口状态、
// 蓝牙发射功率开到最大、RSSI 测量和信号弱时手柄震动提醒（11-11）、手机 Wi‑Fi 遥控模式（11-11）。
// 两种模式：手柄（Xbox 蓝牙）/ 手机（船开热点 QB12-XXXX，密码 qb12boat，浏览器开 192.168.4.1）。
// 长按板上 BOOT 键（SW2）1.5 秒切换，记在 flash 里；开机 LED 闪 1 下 = 手柄，闪 2 下 = 手机。
// 直线修正（11-11，下水前进会偏）：手柄 LB/RB 或网页按钮每次 1%，LB+RB 按住 1 秒归零，存在 flash 里。
// 操控：只用右摇杆，前后 = 油门，左右 = 转向（11-11 用户要求：手柄和手机网页都只用一个摇杆）。
// 开发板：esp32_bluepad32 4.1.0（基于 arduino-esp32 2.0.x）→ ESP32S3 Dev Module，USB CDC On Boot = Enabled
// 注意：这个板包是 2.x 内核，PWM 要用 ledcSetup/ledcAttachPin/ledcWrite(通道)，不能用 3.x 的 ledcAttach(引脚)
// 11-03 已上真板（只接 USB）烧录运行。接电机试车先把船架空（桨离水），并且拔掉 USB（插着 USB 电机不转）。
#include <Bluepad32.h>
#include <esp_bt.h>                // esp_ble_tx_power_set：蓝牙发射功率
#include <uni.h>                   // Bluepad32 底层：拿手柄的连接句柄
#include <btstack.h>               // gap_read_rssi：读信号强度
#include <WiFi.h>
#include <esp_wifi.h>
#include <esp_http_server.h>       // 自带 WebSocket（CONFIG_HTTPD_WS_SUPPORT）
#include <Preferences.h>
#include "phone_page.h"

// ---- 引脚：和 hardware/pcb/netlist.py 一一对应 ----
const int AIN1 = 4, AIN2 = 5;      // 左电机 J3
const int BIN1 = 6, BIN2 = 7;      // 右电机 J4
const int NSLEEP = 15, NFAULT = 16;
const int VBAT = 1, LED = 2;
const int USB_DET = 9;
const int BOOT_BTN = 0;            // SW2，按下为低（R8 上拉）             // VBUS 经 R17/R18 各 100k 分压，插 USB 时约 2.5 V

// ---- 可调参数 ----
const bool REVERSE_LEFT  = false;  // 左电机转向反了就改 true（或者对调 J3 两根线）
const bool REVERSE_RIGHT = true;   // 11-05 实测前进时右电机逆时针（应顺时针），改 true。右电机同理。一正一反桨时，桨转向由桨决定，这里管电机线的接法
const float DEADZONE  = 0.08;      // 摇杆死区
const float TURN_GAIN = 0.6;       // 转向量（摇杆左右打满时差速多少），下水试过再调
const float LOW_VBAT  = 3.6;       // 低于这个电压（V）限速
const float LOW_SCALE = 0.3;       // 低电压时的速度上限
const float CUT_VBAT  = 3.3;       // 低于这个电压停机，保护电池
const float CUT_RESUME = 3.5;      // 停机后要回升到这个电压才放开（电机停了电池会回弹，防止反复启停）
const float USB_ON_V  = 4.2;       // VBUS 高于这个电压算插着 USB（只用电池时 VBUS 可能被倒灌到 3 V 左右，见 PLAN.md）
const float USB_OFF_V = 3.8;       // 回滞：低于这个才算拔掉
const float SLEW_PER_S = 3.0;      // 油门每秒最多变化多少（满油门=1），防止电池瞬间压降和机械冲击
const int RSSI_WARN = -85;         // 信号低于这个（dBm）手柄每 2 秒震一下：该往回开了（11-11 下水实测不到 10 m 断连，船没拿回来）
const esp_power_level_t TX_PWR = ESP_PWR_LVL_P21;
const char *AP_PASS = "qb12boat";  // 手机模式热点密码（至少 8 位）
const int AP_CHANNEL = 6;
const uint32_t WS_TIMEOUT_MS = 500;  // 手机模式：超过这么久没收到指令就停
const int PHONE_WARN = -78;        // 手机模式：船收到的手机信号低于这个（dBm），网页提示往回开
const uint32_t MODE_HOLD_MS = 1500;  // BOOT 键长按多久切换模式
const float TRIM_STEP = 0.01;      // 直线修正每按一次 1%
const float TRIM_MAX  = 0.30;      // 最多修 30%（超过 15% 多半是机械问题：桨装反、桨不一样、轴卡）   // 发射功率开到最大档（板包默认 +9 dBm）
const int FULL = 1023;             // 10 位 PWM：0 ~ 1023
// PWM 通道：每个引脚一个通道
const int CH_A1 = 0, CH_A2 = 1, CH_B1 = 2, CH_B2 = 3;

ControllerPtr pad = nullptr;       // 当前连上的手柄
float vbatF = 4.0;                 // 滤波后的电池电压（V），setup 里用实测值初始化
float vbusV = 0;                   // VBUS 电压（V）
bool usbIn = false;                // 插着 USB：电机不转（VBUS 走线和 USB 口扛不住电机电流）
bool cut = false;                  // 电池过低停机中
uint32_t lastLogMs = 0;
float curL = 0, curR = 0;          // 当前输出（经过缓加速）
uint32_t lastInputMs = 0;          // 最近一次读到手柄数据的时间（只用于串口显示）
uint32_t lastLoopMs = 0;
enum { MODE_PAD = 0, MODE_PHONE = 1 };
int mode = MODE_PAD;
volatile float wsX = 0, wsY = 0;   // 手机发来的转向、油门（-1..1）
volatile uint32_t wsLastMs = 0;    // 最近一次收到手机指令的时间
volatile int phoneRssi = 0;
volatile float chipTemp = NAN;     // ESP32 芯片温度（°C），每 2 秒读一次
uint32_t lastTempMs = 0;        // 船收到的手机信号（dBm），0 = 没有手机连着
uint32_t btnDownMs = 0;
// 直线修正：trim > 0 往右修（压低右电机），trim < 0 往左修（压低左电机）
volatile float trim = 0;
volatile int trimReq = 0;          // 网页按钮发来的请求：+1 / -1，主循环里处理
bool trimDirty = false;
uint32_t trimChangedMs = 0, bothDownMs = 0;
bool lbPrev = false, rbPrev = false;
void changeTrim(int dir) {
  if (dir == 0) trim = 0;
  else trim = constrain(trim + dir * TRIM_STEP, -TRIM_MAX, TRIM_MAX);
  if (fabs(trim) < 0.001) trim = 0;
  trimDirty = true; trimChangedMs = millis();
  Serial.printf("直线修正 %+.0f%%（正 = 往右修，压低右电机）\n", trim * 100);
}
volatile int rssi = 0;             // 最近一次测到的信号强度（dBm），0 = 还没测到
int rssiMin = 0;                   // 这次连接以来最弱的一次
uint32_t lastRssiMs = 0, lastBuzzMs = 0;

// ---- RSSI：BTstack 跑在自己的任务里，读 RSSI 要排到它的线程上执行，结果从事件里回来 ----
static hci_con_handle_t rssiHandle = HCI_CON_HANDLE_INVALID;
static btstack_packet_callback_registration_t rssiEvt;
static btstack_context_callback_registration_t rssiReq;
static bool rssiEvtAdded = false;
static void onHciEvent(uint8_t type, uint16_t ch, uint8_t *pkt, uint16_t size) {
  if (type == HCI_EVENT_PACKET && hci_event_packet_get_type(pkt) == GAP_EVENT_RSSI_MEASUREMENT)
    rssi = (int8_t)gap_event_rssi_measurement_get_rssi(pkt);
}
static void doReadRssi(void *ctx) {           // 在 BTstack 线程里执行
  if (!rssiEvtAdded) { rssiEvt.callback = &onHciEvent; hci_add_event_handler(&rssiEvt); rssiEvtAdded = true; }
  if (rssiHandle != HCI_CON_HANDLE_INVALID) gap_read_rssi(rssiHandle);
}
void requestRssi() {
  rssiReq.callback = &doReadRssi;
  rssiReq.context = nullptr;
  btstack_run_loop_execute_on_main_thread(&rssiReq);
}

void setTxPowerMax() {
  esp_ble_tx_power_set(ESP_BLE_PWR_TYPE_DEFAULT, TX_PWR);
  esp_ble_tx_power_set(ESP_BLE_PWR_TYPE_ADV, TX_PWR);
  esp_ble_tx_power_set(ESP_BLE_PWR_TYPE_SCAN, TX_PWR);
  for (int h = ESP_BLE_PWR_TYPE_CONN_HDL0; h <= ESP_BLE_PWR_TYPE_CONN_HDL8; h++)   // 每条连接单独设，没连上的会报错，不管
    esp_ble_tx_power_set((esp_ble_power_type_t)h, TX_PWR);
}

void onConnected(ControllerPtr c) {
  if (pad == nullptr) {
    pad = c;
    ControllerProperties pr = c->getProperties();            // 按手柄蓝牙地址找底层设备，找不到再按编号
    uni_hid_device_t *d = uni_hid_device_get_instance_for_address(pr.btaddr);
    if (!d) d = uni_hid_device_get_instance_for_idx(c->index());
    rssiHandle = d ? d->conn.handle : HCI_CON_HANDLE_INVALID;
    rssi = 0; rssiMin = 0;
    setTxPowerMax();               // 连上之后连接句柄才有效，再设一遍
  }
  lastInputMs = millis();
}
void onDisconnected(ControllerPtr c) {
  if (c == pad) {                  // 断连：主循环里目标速度直接归零
    pad = nullptr;
    rssiHandle = HCI_CON_HANDLE_INVALID;
    Serial.printf("手柄断开，断开前最后 RSSI %d dBm，本次最弱 %d dBm\n", (int)rssi, rssiMin);
  }
}

// 一路电机。s：-1 全速后退 … 0 停 … +1 全速前进
// 慢衰减：一个脚常高，另一个脚 PWM；PWM 为低的那段在推电机
void drive(int ch1, int ch2, float s) {
  s = constrain(s, -1.0f, 1.0f);
  int d = (1 - fabs(s)) * FULL;
  if (fabs(s) < 0.02) { ledcWrite(ch1, 0);    ledcWrite(ch2, 0);    }  // 滑行
  else if (s > 0)     { ledcWrite(ch1, FULL); ledcWrite(ch2, d);    }  // 正转
  else                { ledcWrite(ch1, d);    ledcWrite(ch2, FULL); }  // 反转
}

// 向目标慢慢靠近；目标是 0（停）时不缓，立刻停
float slew(float cur, float target, float maxStep) {
  if (target == 0) return 0;
  if (target > cur + maxStep) return cur + maxStep;
  if (target < cur - maxStep) return cur - maxStep;
  return target;
}

// ---- 手机模式：热点 + 网页 + WebSocket ----
const char *stateStr();
static esp_err_t pageHandler(httpd_req_t *req) {
  httpd_resp_set_type(req, "text/html; charset=utf-8");
  return httpd_resp_send(req, PHONE_PAGE, HTTPD_RESP_USE_STRLEN);
}
static esp_err_t wsHandler(httpd_req_t *req) {
  if (req->method == HTTP_GET) return ESP_OK;               // 握手
  uint8_t buf[40];
  httpd_ws_frame_t f = {};
  f.payload = buf;
  esp_err_t e = httpd_ws_recv_frame(req, &f, sizeof(buf) - 1);
  if (e != ESP_OK) return e;
  buf[f.len] = 0;
  if (f.type != HTTPD_WS_TYPE_TEXT) return ESP_OK;
  float a, b;
  int td;
  if (sscanf((char *)buf, "t,%d", &td) == 1) {           // 网页修正按钮：t,1 往右修；t,-1 往左修；t,0 归零
    trimReq = td > 0 ? 1 : (td < 0 ? -1 : 2);
  } else if (sscanf((char *)buf, "%f,%f", &a, &b) == 2) {
    wsX = constrain(a, -1.0f, 1.0f);
    wsY = constrain(b, -1.0f, 1.0f);
    wsLastMs = millis();
  }
  char out[160];
  int n = snprintf(out, sizeof(out), "{\"v\":%.2f,\"r\":%d,\"t\":%d,\"c\":%.0f,\"l\":%d,\"m\":%d,\"s\":\"%s\"}",
                   vbatF, (int)phoneRssi, (int)lroundf(trim * 100), isnan(chipTemp) ? 0.0f : (float)chipTemp,
                   (int)lroundf(curL * 100), (int)lroundf(curR * 100), stateStr());
  httpd_ws_frame_t o = {};
  o.type = HTTPD_WS_TYPE_TEXT;
  o.payload = (uint8_t *)out;
  o.len = n;
  return httpd_ws_send_frame(req, &o);
}
void startPhoneMode() {
  uint8_t mac[6];
  WiFi.mode(WIFI_AP);
  WiFi.softAPmacAddress(mac);
  char ssid[16];
  snprintf(ssid, sizeof(ssid), "QB12-%02X%02X", mac[4], mac[5]);
  WiFi.softAP(ssid, AP_PASS, AP_CHANNEL, 0, 2);
  WiFi.setTxPower(WIFI_POWER_19_5dBm);                       // Wi‑Fi 发射功率最大档
  httpd_handle_t srv = nullptr;
  httpd_config_t cfg = HTTPD_DEFAULT_CONFIG();
  if (httpd_start(&srv, &cfg) == ESP_OK) {
    httpd_uri_t page = {};
    page.uri = "/"; page.method = HTTP_GET; page.handler = pageHandler;
    httpd_register_uri_handler(srv, &page);
    httpd_uri_t ws = {};
    ws.uri = "/ws"; ws.method = HTTP_GET; ws.handler = wsHandler; ws.is_websocket = true;
    httpd_register_uri_handler(srv, &ws);
  }
  Serial.printf("手机模式：热点 %s，密码 %s，浏览器打开 http://%s\n", ssid, AP_PASS, WiFi.softAPIP().toString().c_str());
}
void readPhoneRssi() {
  wifi_sta_list_t l;
  if (esp_wifi_ap_get_sta_list(&l) == ESP_OK && l.num > 0) phoneRssi = l.sta[0].rssi;
  else phoneRssi = 0;
}

void setup() {
  // 通道 → 频率 20kHz、10 位；再把引脚挂到通道上
  const int pins[4] = {AIN1, AIN2, BIN1, BIN2};
  for (int ch = 0; ch < 4; ch++) { ledcSetup(ch, 20000, 10); ledcAttachPin(pins[ch], ch); }
  drive(CH_A1, CH_A2, 0); drive(CH_B1, CH_B2, 0);
  Serial.begin(115200);
  pinMode(NFAULT, INPUT);          // 外面有 R10 上拉
  pinMode(LED, OUTPUT);
  pinMode(NSLEEP, OUTPUT);
  digitalWrite(NSLEEP, HIGH);      // 唤醒 DRV8833（平时被 R9 拉低）
  vbatF = analogReadMilliVolts(VBAT) * 2 / 1000.0;
  pinMode(BOOT_BTN, INPUT_PULLUP);
  Preferences pref;
  pref.begin("qb12", true);
  mode = pref.getUChar("mode", MODE_PAD);
  trim = pref.getFloat("trim", 0);
  pref.end();
  for (int i = 0; i <= mode; i++) { digitalWrite(LED, HIGH); delay(150); digitalWrite(LED, LOW); delay(250); }   // 闪 1 下 = 手柄，2 下 = 手机
  BP32.setup(&onConnected, &onDisconnected);
  setTxPowerMax();
  if (mode == MODE_PHONE) {
    BP32.enableNewBluetoothConnections(false);   // 不扫描蓝牙，把天线时间留给 Wi‑Fi
    startPhoneMode();
  }
  Serial.printf("模式：%s（长按 BOOT 1.5 秒切换）\n", mode == MODE_PAD ? "手柄" : "手机");
  lastLoopMs = millis();
}

void loop() {
  BP32.update();
  uint32_t now = millis();
  float dt = (now - lastLoopMs) / 1000.0f;
  lastLoopMs = now;

  float x = 0, y = 0;              // 没连上手柄：保持 0，船自己停
  bool linked = false;
  // BOOT 键长按切换模式：先停电机，保存，重启
  if (digitalRead(BOOT_BTN) == LOW) {
    if (btnDownMs == 0) btnDownMs = now;
    else if (now - btnDownMs >= MODE_HOLD_MS) {
      drive(CH_A1, CH_A2, 0); drive(CH_B1, CH_B2, 0);
      Preferences pref;
      pref.begin("qb12", false);
      pref.putUChar("mode", mode == MODE_PAD ? MODE_PHONE : MODE_PAD);
      pref.end();
      Serial.println("切换模式，重启");
      for (int i = 0; i < 10; i++) { digitalWrite(LED, i % 2); delay(80); }
      ESP.restart();
    }
  } else btnDownMs = 0;

  if (mode == MODE_PHONE) {
    if (now - wsLastMs < WS_TIMEOUT_MS) {      // 手机模式：0.5 秒内收到过指令才算连着
      linked = true;
      x = wsX; y = wsY;
      if (fabs(x) < DEADZONE) x = 0;
      if (fabs(y) < DEADZONE) y = 0;
      x *= TURN_GAIN;
    }
    if (now - lastRssiMs >= 500) { lastRssiMs = now; readPhoneRssi(); }
    if (now - lastTempMs >= 2000) { lastTempMs = now; chipTemp = temperatureRead(); }
  } else if (pad && pad->isConnected()) {
    if (pad->hasData()) lastInputMs = now;      // hasData() 为真表示这一轮有新数据
    // 不按"多久没新数据"判失联：Xbox 只在摇杆值变化时发数据，推到底不动也会没数据（11-05 实测 1 s 内误判停机）。
    // 失联只靠蓝牙断开：BLE 连接超时后 onDisconnected 把 pad 清空，目标速度归零。
    linked = true;
    {
      x =  pad->axisRX() / 512.0;  // 右摇杆左右 = 转向，约 -512 ~ 512
      y = -pad->axisRY() / 512.0;  // 右摇杆前后 = 油门；往前推读到的是负数，取反
      if (fabs(x) < DEADZONE) x = 0;
      if (fabs(y) < DEADZONE) y = 0;
      x *= TURN_GAIN;
      uint8_t dp = pad->dpad();    // 十字键：简单模式
      if (dp & DPAD_UP)    { x = 0;    y = 0.8;  }
      if (dp & DPAD_DOWN)  { x = 0;    y = -0.6; }
      if (dp & DPAD_LEFT)  { x = -0.5; y = 0.5;  }
      if (dp & DPAD_RIGHT) { x = 0.5;  y = 0.5;  }
      // LB 往左修、RB 往右修（按下那一下算一次）；两个一起按住 1 秒归零
      bool lb = pad->l1(), rb = pad->r1();
      if (lb && rb) {
        if (bothDownMs == 0) bothDownMs = now;
        else if (now - bothDownMs >= 1000 && trim != 0) { changeTrim(0); pad->playDualRumble(0, 400, 0xFF, 0xFF); }
      } else {
        bothDownMs = 0;
        if (lb && !lbPrev) { changeTrim(-1); pad->playDualRumble(0, 60, 0x60, 0x60); }
        if (rb && !rbPrev) { changeTrim(+1); pad->playDualRumble(0, 60, 0x60, 0x60); }
      }
      lbPrev = lb; rbPrev = rb;
    }
  }

  // 每 0.5 秒测一次信号；太弱就让手柄震一下提醒往回开（震动 200 ms，每 2 秒最多一次）
  if (mode == MODE_PAD && linked && now - lastRssiMs >= 500) { lastRssiMs = now; requestRssi(); }
  int r = rssi;
  if (mode == MODE_PAD && linked && r != 0) {
    if (rssiMin == 0 || r < rssiMin) rssiMin = r;
    if (r < RSSI_WARN && now - lastBuzzMs >= 2000) { lastBuzzMs = now; pad->playDualRumble(0, 200, 0xC0, 0xC0); }
  }

  if (trimReq) { int q = trimReq; trimReq = 0; changeTrim(q == 2 ? 0 : q); }
  if (trimDirty && now - trimChangedMs > 2000) {   // 停手 2 秒再写 flash，少写几次
    Preferences pref; pref.begin("qb12", false); pref.putFloat("trim", trim); pref.end();
    trimDirty = false;
  }

  float L = constrain(y + x, -1.0f, 1.0f);   // 差速混控
  float R = constrain(y - x, -1.0f, 1.0f);
  // 直线修正：船头往右转要左边推得多（和摇杆往右 L=y+x 变大一致），所以往右修 = 压低右电机，往左修 = 压低左电机
  if (trim > 0) R *= 1 - trim;
  else          L *= 1 + trim;

  vbatF += (analogReadMilliVolts(VBAT) * 2 / 1000.0 - vbatF) * 0.02;   // R11/R12 各 100k，分压 1/2
  vbusV = analogReadMilliVolts(USB_DET) * 2 / 1000.0;
  if (vbusV > USB_ON_V) usbIn = true;
  else if (vbusV < USB_OFF_V) usbIn = false;
  if (vbatF < CUT_VBAT) cut = true;
  else if (vbatF > CUT_RESUME) cut = false;
  bool low = vbatF < LOW_VBAT;
  if (low) { L *= LOW_SCALE; R *= LOW_SCALE; }
  if (usbIn || cut) { L = 0; R = 0; }

  curL = slew(curL, L, SLEW_PER_S * dt);
  curR = slew(curR, R, SLEW_PER_S * dt);
  drive(CH_A1, CH_A2, REVERSE_LEFT  ? -curL : curL);
  drive(CH_B1, CH_B2, REVERSE_RIGHT ? -curR : curR);

  // 状态灯：连上常亮 · 没连慢闪 · 电量低或驱动报警快闪（插着 USB 时不看电量，方便插线调试时看手柄连没连上）
  bool fault = digitalRead(NFAULT) == LOW;
  bool on;
  if (fault || (low && !usbIn)) on = (now / 100) % 2;
  else if (!linked) on = (now / 500) % 2;
  else              on = true;
  digitalWrite(LED, on);

  if (now - lastLogMs >= 1000) {   // 每秒一行状态，插 USB 用串口监视器看
    lastLogMs = now;
    int8_t txp = esp_ble_tx_power_get(ESP_BLE_PWR_TYPE_DEFAULT);
    if (mode == MODE_PHONE)
      Serial.printf("[手机] 修正 %+.0f%%  VBAT %.2fV  VBUS %.2fV  USB %s  手机 %s  信号 %d dBm  %s  L %+.2f R %+.2f  转向 %+.2f 油门 %+.2f  指令间隔 %lums\n",
                    trim * 100, vbatF, vbusV, usbIn ? "插着(电机禁用)" : "没插", linked ? "已连" : "未连", (int)phoneRssi, stateStr(),
                    curL, curR, (float)wsX, (float)wsY, (unsigned long)(now - wsLastMs));
    else
    Serial.printf("[手柄] 修正 %+.0f%%  VBAT %.2fV  VBUS %.2fV  USB %s  手柄 %s  RSSI %d dBm(最弱 %d)  发射档 %d  %s%sL %+.2f R %+.2f  右X %d 右Y %d  数据间隔 %lums\n",
                  trim * 100, vbatF, vbusV, usbIn ? "插着(电机禁用)" : "没插",
                  pad ? "已连" : "未连", pad ? (int)rssi : 0, rssiMin, (int)txp,
                  cut ? "电池过低停机 " : (low ? "电量低限速 " : ""),
                  fault ? "驱动报警 " : "", curL, curR,
                  pad ? pad->axisRX() : 0, pad ? pad->axisRY() : 0, (unsigned long)(now - lastInputMs));
  }

  delay(10);
}

// 给网页看的状态（WebSocket 线程里调用，只读全局变量）
const char *stateStr() {
  if (usbIn) return "插着 USB，电机禁用";
  if (cut) return "电池过低，已停机";
  if (vbatF < LOW_VBAT) return "电量低，限速";
  if (digitalRead(NFAULT) == LOW) return "驱动报警";
  return "正常";
}
