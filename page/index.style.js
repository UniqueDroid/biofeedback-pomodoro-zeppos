import { getDeviceInfo } from '@zos/device'
import { px } from '@zos/utils'
import ui from '@zos/ui'

// Komplett neue Architektur (Jans Anweisung: von Grund auf neu, anderes
// Geruest) - @zeppos/zml BasePage + separate layout/style-Dateien, exakt
// wie in den offiziellen Zepp-Beispielen (@zeppos/zml/examples), statt
// des bisherigen rohen Page()/hmUI.createWidget()-Ansatzes.
export const { width: DEVICE_WIDTH, height: DEVICE_HEIGHT } = getDeviceInfo()

export const COLOR = {
  dim: 0x888888,
  cyan: 0x00e5ff,
  green: 0x00ff66,
  amber: 0xffb300,
  statusDefault: 0xaaaaaa,
  btnIdle: 0x1e293b,
  btnActive: 0x3e1f1f,
  btnPress: 0x334155,
}

export const TITLE_STYLE = {
  x: 0,
  y: px(85),
  w: DEVICE_WIDTH,
  h: px(32),
  color: COLOR.dim,
  text_size: px(22),
  align_h: ui.align.CENTER_H,
  align_v: ui.align.CENTER_V,
  text: 'SMART POMODORO',
}

export const TIME_STYLE = {
  x: 0,
  y: px(131),
  w: DEVICE_WIDTH,
  h: px(110),
  color: COLOR.green,
  text_size: px(90),
  char_space: px(2),
  align_h: ui.align.CENTER_H,
  align_v: ui.align.CENTER_V,
  text: '25:00',
}

export const VITAL_STYLE = {
  x: 0,
  y: px(251),
  w: DEVICE_WIDTH,
  h: px(38),
  color: COLOR.cyan,
  text_size: px(28),
  align_h: ui.align.CENTER_H,
  text: 'HR: -- bpm | Stress: --',
}

const M = px(30)
export const STATUS_STYLE = {
  x: M,
  y: px(295),
  w: DEVICE_WIDTH - M * 2,
  h: px(60),
  color: COLOR.statusDefault,
  text_size: px(24),
  align_h: ui.align.CENTER_H,
  text_style: ui.text_style.WRAP,
  text: 'Bereit für 25 Min Fokus',
}

const BTN_W = px(300)
export const BUTTON_STYLE = {
  x: (DEVICE_WIDTH - BTN_W) / 2,
  y: px(370),
  w: BTN_W,
  h: px(64),
  radius: px(32),
  normal_color: COLOR.btnIdle,
  press_color: COLOR.btnPress,
  text: 'Fokus Starten',
  color: 0xffffff,
  text_size: px(28),
}
