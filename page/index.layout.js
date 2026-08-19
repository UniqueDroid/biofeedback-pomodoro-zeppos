import ui from '@zos/ui'
import {
  COLOR,
  TITLE_STYLE,
  TIME_STYLE,
  VITAL_STYLE,
  STATUS_STYLE,
  BUTTON_STYLE,
} from './index.style'

export const layout = {
  refs: {},

  render(vm) {
    this.refs.title = ui.createWidget(ui.widget.TEXT, { ...TITLE_STYLE })
    this.refs.time = ui.createWidget(ui.widget.TEXT, { ...TIME_STYLE })
    this.refs.vital = ui.createWidget(ui.widget.TEXT, { ...VITAL_STYLE })
    this.refs.status = ui.createWidget(ui.widget.TEXT, { ...STATUS_STYLE })
    this.refs.button = ui.createWidget(ui.widget.BUTTON, {
      ...BUTTON_STYLE,
      click_func: () => vm.handleControlClick(),
    })
  },

  setTitle(text) {
    this.refs.title.setProperty(ui.prop.TEXT, text)
  },

  setTimeText(text) {
    this.refs.time.setProperty(ui.prop.TEXT, text)
  },

  setTimeColor(color) {
    this.refs.time.setProperty(ui.prop.COLOR, color)
  },

  setVital(text) {
    this.refs.vital.setProperty(ui.prop.TEXT, text)
  },

  setStatus(text, color) {
    this.refs.status.setProperty(ui.prop.MORE, color ? { text, color } : { text })
  },

  setButton(text, normalColor) {
    this.refs.button.setProperty(
      ui.prop.MORE,
      normalColor ? { text, normal_color: normalColor } : { text },
    )
  },

  resetIdle() {
    this.setTitle('SMART POMODORO')
    this.setTimeText('25:00')
    this.setTimeColor(COLOR.green)
    this.setVital('HR: -- bpm | Stress: --')
    this.setStatus('Bereit für 25 Min Fokus', COLOR.statusDefault)
    this.setButton('Fokus Starten', COLOR.btnIdle)
  },
}
