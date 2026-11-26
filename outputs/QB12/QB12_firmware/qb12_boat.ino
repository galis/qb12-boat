// Boat QB12 遥控船固件 · ESP32-S3 + Bluepad32 + DRV8833
// 基线来自 project/course/l9.js（第 9 课），在它上面加了：电机反向开关、断连/失联停机、缓加速、低电压限速。
// 开发板：esp32_bluepad32 4.1.0（基于 arduino-esp32 2.0.x）→ ESP32S3 Dev Module，USB CDC On Boot = Enabled
// 注意：这个板包是 2.x 内核，PWM 要用 ledcSetup/ledcAttachPin/ledcWrite(通道)，不能用 3.x 的 ledcAttach(引脚)
// 没上过真板，只验证过编译。上板先把船架空（桨离水），再试。
#include <Bluepad32.h>

// ---- 引脚：和 project/pcb/netlist.py 一一对应 ----
const int AIN1 = 4, AIN2 = 5;      // 左电机 J3
const int BIN1 = 6, BIN2 = 7;      // 右电机 J4
const int NSLEEP = 15, NFAULT = 16;
const int VBAT = 1, LED = 2;

// ---- 可调参数 ----
const bool REVERSE_LEFT  = false;  // 左电机转向反了就改 true（或者对调 J3 两根线）
const bool REVERSE_RIGHT = false;  // 右电机同理。一正一反桨时，桨转向由桨决定，这里管电机线的接法
const float DEADZONE  = 0.08;      // 摇杆死区
const float LOW_VBAT  = 3.5;       // 低于这个电压（V）限速
const float LOW_SCALE = 0.3;       // 低电压时的速度上限
const float SLEW_PER_S = 3.0;      // 油门每秒最多变化多少（满油门=1），防止电池瞬间压降和机械冲击
const uint32_t LINK_TIMEOUT_MS = 500;   // 手柄超过这么久没发新数据，就当失联，停电机
const int FULL = 1023;             // 10 位 PWM：0 ~ 1023
// PWM 通道：每个引脚一个通道
const int CH_A1 = 0, CH_A2 = 1, CH_B1 = 2, CH_B2 = 3;

ControllerPtr pad = nullptr;       // 当前连上的手柄
float vbatF = 4.0;                 // 滤波后的电池电压（V）
float curL = 0, curR = 0;          // 当前输出（经过缓加速）
uint32_t lastInputMs = 0;          // 最近一次读到手柄数据的时间
uint32_t lastLoopMs = 0;

void onConnected(ControllerPtr c) {
  if (pad == nullptr) pad = c;
  lastInputMs = millis();
}
void onDisconnected(ControllerPtr c) {
  if (c == pad) pad = nullptr;     // 断连：主循环里目标速度直接归零
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

void setup() {
  // 通道 → 频率 20kHz、10 位；再把引脚挂到通道上
  const int pins[4] = {AIN1, AIN2, BIN1, BIN2};
  for (int ch = 0; ch < 4; ch++) { ledcSetup(ch, 20000, 10); ledcAttachPin(pins[ch], ch); }
  drive(CH_A1, CH_A2, 0); drive(CH_B1, CH_B2, 0);
  pinMode(NFAULT, INPUT);          // 外面有 R10 上拉
  pinMode(LED, OUTPUT);
  pinMode(NSLEEP, OUTPUT);
  digitalWrite(NSLEEP, HIGH);      // 唤醒 DRV8833（平时被 R9 拉低）
  BP32.setup(&onConnected, &onDisconnected);
  lastLoopMs = millis();
}

void loop() {
  BP32.update();
  uint32_t now = millis();
  float dt = (now - lastLoopMs) / 1000.0f;
  lastLoopMs = now;

  float x = 0, y = 0;              // 没连上手柄：保持 0，船自己停
  bool linked = false;
  if (pad && pad->isConnected()) {
    if (pad->hasData()) lastInputMs = now;      // hasData() 为真表示这一轮有新数据
    linked = (now - lastInputMs) < LINK_TIMEOUT_MS;
    if (linked) {
      x =  pad->axisX() / 512.0;   // 左摇杆，约 -512 ~ 512
      y = -pad->axisY() / 512.0;   // 往前推读到的是负数，取反
      if (fabs(x) < DEADZONE) x = 0;
      if (fabs(y) < DEADZONE) y = 0;
      uint8_t dp = pad->dpad();    // 十字键：简单模式
      if (dp & DPAD_UP)    { x = 0;    y = 0.8;  }
      if (dp & DPAD_DOWN)  { x = 0;    y = -0.6; }
      if (dp & DPAD_LEFT)  { x = -0.5; y = 0.5;  }
      if (dp & DPAD_RIGHT) { x = 0.5;  y = 0.5;  }
    }
  }

  float L = constrain(y + x, -1.0f, 1.0f);   // 差速混控
  float R = constrain(y - x, -1.0f, 1.0f);

  vbatF += (analogReadMilliVolts(VBAT) * 2 / 1000.0 - vbatF) * 0.02;   // R11/R12 各 100k，分压 1/2
  bool low = vbatF < LOW_VBAT;
  if (low) { L *= LOW_SCALE; R *= LOW_SCALE; }

  curL = slew(curL, L, SLEW_PER_S * dt);
  curR = slew(curR, R, SLEW_PER_S * dt);
  drive(CH_A1, CH_A2, REVERSE_LEFT  ? -curL : curL);
  drive(CH_B1, CH_B2, REVERSE_RIGHT ? -curR : curR);

  // 状态灯：连上常亮 · 没连慢闪 · 电量低或驱动报警快闪
  bool fault = digitalRead(NFAULT) == LOW;
  bool on;
  if (fault || low) on = (now / 100) % 2;
  else if (!linked) on = (now / 500) % 2;
  else              on = true;
  digitalWrite(LED, on);

  delay(10);
}
