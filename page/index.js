import * as hmUI from '@zos/ui'
import {
  HeartRate,
  Stress,
  Vibrator,
  VIBRATOR_SCENE_SHORT_LIGHT,
  VIBRATOR_SCENE_STRONG_REMINDER,
} from '@zos/sensor'
import { setPageBrightTime } from '@zos/display'
import { px } from '@zos/utils'

// Boilerplate-Korrekturen gegen die echte Zepp OS API (node_modules/
// @zeppos/device-types), analog zu bike-hud-zeppos:
// - HeartRate/Stress kennen kein start()/stop() - onCurrentChange()/
//   onChange() startet die Messung implizit, offCurrentChange()/
//   offChange() stoppt sie.
// - Stress.getCurrent() liefert ein Objekt { value, time }, keine Zahl.
// - Permission-Strings waren falsch (device:os.sensor.* existiert nicht;
//   real: data:user.hd.heart_rate / data:user.hd.stress).
// - setPageBrightScreen existiert nicht, real: setPageBrightTime
//   (Millisekunden statt Sekunden).
// - Vibrator.setMode(1) nahm eine rohe Zahl an - die echte API braucht
//   entweder start({mode: KONSTANTE}) oder setMode({mode: KONSTANTE}).
//   Einheitlich auf start({mode}) umgestellt, mit den echten
//   VIBRATOR_SCENE_*-Konstanten statt geratener Zahlen.
// - getDeviceInfo().width/height NICHT fuer Layout-Koordinaten nutzen -
//   lieferte auf diesem Geraet 480 statt der echten physischen 432
//   (siehe Kommentar in build() unten, gemessen anhand Jans Foto vom
//   nach rechts verschobenen Button). App zielt eh nur auf PikeW,
//   also feste, aus devices.json bekannte Aufloesung verwenden.

const W = 432
const H = 514

const COLOR = {
  dim: 0x888888,
  cyan: 0x00e5ff,
  green: 0x00ff66,
  amber: 0xffb300,
  statusDefault: 0xaaaaaa,
  btnIdle: 0x1e293b,
  btnActive: 0x3e1f1f,
  btnPress: 0x334155,
}

const FOCUS_SEC = 25 * 60
const BREAK_SEC = 5 * 60
const BREATHING_SEC = 10 * 60
const HIGH_STRESS_THRESHOLD = 60
const HIGH_HR_THRESHOLD = 95

const STATES = { IDLE: 'IDLE', FOCUS: 'FOCUS', BREAK: 'BREAK', BREATHING: 'BREATHING' }

Page({
  state: {
    mode: STATES.IDLE,
    remainingSeconds: FOCUS_SEC,
    intervalId: null,

    heartRateSensor: null,
    stressSensor: null,
    onHrChange: null,
    onStressChange: null,
    vibrator: null,

    currentHr: 0,
    currentStress: 0,
    stressReadings: [],
    hrReadings: [],

    titleWidget: null,
    timeWidget: null,
    vitalWidget: null,
    statusWidget: null,
    btnControl: null,
  },

  build() {
    // Gemessene Ursache fuer den nach rechts verschobenen Button (Jans
    // Foto: Pille-Mitte bei x=236 statt 216 auf einem 432px-Screenshot,
    // exakt der halbe Unterschied zwischen 480 und 432): getDeviceInfo()
    // liefert hier offenbar 480 als "width" statt der echten 432 - eine
    // Art virtuelle/Referenz-Breite, nicht die physische Pixelbreite, in
    // der Widgets tatsaechlich positioniert werden. Deshalb NICHT mehr
    // fuer Layout-Berechnungen verwenden - App zielt eh nur auf PikeW,
    // also direkt die aus devices.json bekannte echte Aufloesung nehmen.
    this.renderUI()

    try {
      setPageBrightTime({ brightTime: 60 * 60 * 1000 })
    } catch (e) {
      // kosmetisch, kein Blocker
    }

    try {
      this.state.heartRateSensor = new HeartRate()
      this.state.stressSensor = new Stress()
      this.state.vibrator = new Vibrator()
    } catch (e) {
      this.state.statusWidget.setProperty(hmUI.prop.TEXT, 'Sensoren nicht verfügbar')
    }
  },

  renderUI() {
    const M = px(30)

    // Vorherige Referenzlinie war selbstbezueglich (x=W/2 mit demselben
    // W wie der Rest des Inhalts) - haette einen Fehler in W selbst gar
    // nicht aufgedeckt, nur ob Inhalt konsistent ZU SICH SELBST ist.
    // Jan bestaetigt: mit blossem Auge auf der Uhr sieht's schief aus,
    // nicht nur auf Fotos - also doch ein echter Bug. Jetzt ein
    // unabhaengiger Test: ein voller Balken von x=0 bis x=W in einer
    // Signalfarbe. Wenn W stimmt, beruehrt er beide Bildschirmraender
    // exakt - jede Luecke oder jedes Ueberstehen zeigt sofort, ob W
    // (432) tatsaechlich der nutzbaren Zeichenflaeche entspricht.
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: px(15),
      w: W,
      h: px(10),
      color: 0xff0000,
    })

    // Jan: Ausrichtung sollte mittiger sein (Block hing eher oben, viel
    // Leerraum unten) und die beiden Zeilen unter der Zeit waren zu klein.
    // Ganzer Block 35px tiefer (zentriert den ~344px hohen Inhalt auf
    // dem 514px hohen Screen), vitalWidget/statusWidget vergroessert.
    this.state.titleWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: px(85),
      w: W,
      h: px(32),
      color: COLOR.dim,
      text_size: px(22),
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      text: 'SMART POMODORO',
    })

    this.state.timeWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: px(131),
      w: W,
      h: px(110),
      color: COLOR.green,
      text_size: px(90),
      char_space: px(2),
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      text: '25:00',
    })

    this.state.vitalWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: px(251),
      w: W,
      h: px(38),
      color: COLOR.cyan,
      text_size: px(28),
      align_h: hmUI.align.CENTER_H,
      text: 'HR: -- bpm | Stress: --',
    })

    this.state.statusWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      x: M,
      y: px(295),
      w: W - M * 2,
      h: px(60),
      color: COLOR.statusDefault,
      text_size: px(24),
      align_h: hmUI.align.CENTER_H,
      text_style: hmUI.text_style.WRAP,
      text: 'Bereit für 25 Min Fokus',
    })

    // Weder Emoji-Entfernung noch das feste W=432 haben die Verschiebung
    // behoben (Jan: "hat sich nichts geändert") - beides war die falsche
    // Spur. Nuki/SmartLock hat exakt dieselbe Zentrierungsformel
    // (x: (DEVICE_WIDTH - 300) / 2) und funktioniert dort nachweislich,
    // ABER OHNE jedes px() auf dem Button (reine Pixel-Literale fuer
    // x/y/w/h/radius/text_size). Hier war stattdessen px() im Spiel
    // (btnW = px(300) etc.) - jetzt exakt Nukis Muster uebernommen,
    // keine px()-Aufrufe mehr auf diesem Widget.
    const btnW = 300
    this.state.btnControl = hmUI.createWidget(hmUI.widget.BUTTON, {
      x: (W - btnW) / 2,
      y: 370,
      w: btnW,
      h: 64,
      radius: 32,
      normal_color: COLOR.btnIdle,
      press_color: COLOR.btnPress,
      text: 'Fokus Starten',
      color: 0xffffff,
      text_size: 28,
      click_func: () => this.handleControlClick(),
    })
  },

  handleControlClick() {
    this.vibrateShort()
    if (this.state.mode === STATES.IDLE) {
      this.startFocusSession()
    } else {
      this.stopSession()
    }
  },

  startFocusSession() {
    this.state.mode = STATES.FOCUS
    this.state.remainingSeconds = FOCUS_SEC
    this.state.stressReadings = []
    this.state.hrReadings = []

    this.state.titleWidget.setProperty(hmUI.prop.TEXT, 'FOKUS PHASE')
    this.state.timeWidget.setProperty(hmUI.prop.COLOR, COLOR.green)
    this.state.btnControl.setProperty(hmUI.prop.MORE, {
      text: 'Abbrechen',
      normal_color: COLOR.btnActive,
    })
    this.state.statusWidget.setProperty(hmUI.prop.TEXT, 'Vitals werden überwacht…')

    this.startSensors()
    this.startTimer()
  },

  startSensors() {
    if (this.state.heartRateSensor) {
      this.state.onHrChange = () => {
        try {
          this.state.currentHr = this.state.heartRateSensor.getCurrent() || 0
          if (this.state.currentHr > 0 && this.state.mode === STATES.FOCUS) {
            this.state.hrReadings.push(this.state.currentHr)
          }
          this.updateVitalsDisplay()
        } catch (e) {
          // ein einzelner fehlerhafter Messwert soll die Session nicht abbrechen
        }
      }
      this.state.heartRateSensor.onCurrentChange(this.state.onHrChange)
    }

    if (this.state.stressSensor) {
      this.state.onStressChange = () => {
        try {
          const result = this.state.stressSensor.getCurrent()
          const value = result && typeof result.value === 'number' ? result.value : 0
          this.state.currentStress = value
          if (value > 0 && this.state.mode === STATES.FOCUS) {
            this.state.stressReadings.push(value)
          }
          this.updateVitalsDisplay()
        } catch (e) {
          // s.o.
        }
      }
      this.state.stressSensor.onChange(this.state.onStressChange)
    }
  },

  updateVitalsDisplay() {
    const hr = this.state.currentHr > 0 ? `${this.state.currentHr}` : '--'
    const st = this.state.currentStress > 0 ? `${this.state.currentStress}` : '--'
    this.state.vitalWidget.setProperty(hmUI.prop.TEXT, `HR: ${hr} bpm | Stress: ${st}`)
  },

  startTimer() {
    if (this.state.intervalId) clearInterval(this.state.intervalId)
    this.state.intervalId = setInterval(() => {
      if (this.state.remainingSeconds > 0) {
        this.state.remainingSeconds--
        this.updateTimerDisplay()
        if (this.state.mode === STATES.BREATHING) {
          this.processBreathingPhase()
        }
      } else {
        this.handleTimerCompletion()
      }
    }, 1000)
  },

  updateTimerDisplay() {
    const m = String(Math.floor(this.state.remainingSeconds / 60)).padStart(2, '0')
    const s = String(this.state.remainingSeconds % 60).padStart(2, '0')
    this.state.timeWidget.setProperty(hmUI.prop.TEXT, `${m}:${s}`)
  },

  handleTimerCompletion() {
    this.vibrateAlarm()
    if (this.state.mode === STATES.FOCUS) {
      this.evaluateBioFeedbackAndTriggerBreak()
    } else {
      this.stopSession()
      this.state.statusWidget.setProperty(hmUI.prop.TEXT, 'Pause beendet! Gut erholt?')
    }
  },

  evaluateBioFeedbackAndTriggerBreak() {
    const avgStress =
      this.state.stressReadings.length > 0
        ? this.state.stressReadings.reduce((a, b) => a + b, 0) / this.state.stressReadings.length
        : 0
    const avgHr =
      this.state.hrReadings.length > 0
        ? this.state.hrReadings.reduce((a, b) => a + b, 0) / this.state.hrReadings.length
        : 0

    const isHighTension = avgStress >= HIGH_STRESS_THRESHOLD || avgHr >= HIGH_HR_THRESHOLD

    if (isHighTension) {
      this.state.mode = STATES.BREATHING
      this.state.remainingSeconds = BREATHING_SEC

      this.state.titleWidget.setProperty(hmUI.prop.TEXT, 'BIO-DECOMPRESSION')
      this.state.timeWidget.setProperty(hmUI.prop.COLOR, COLOR.cyan)
      this.state.statusWidget.setProperty(hmUI.prop.MORE, {
        text: `Hoher Stress (${Math.round(avgStress)})! 10m Atem-Pause`,
        color: COLOR.amber,
      })
    } else {
      this.state.mode = STATES.BREAK
      this.state.remainingSeconds = BREAK_SEC

      this.state.titleWidget.setProperty(hmUI.prop.TEXT, 'REGULÄRE PAUSE')
      this.state.timeWidget.setProperty(hmUI.prop.COLOR, COLOR.amber)
      this.state.statusWidget.setProperty(hmUI.prop.MORE, {
        text: 'Gute Werte! 5 Min erholen.',
        color: COLOR.green,
      })
    }

    this.state.btnControl.setProperty(hmUI.prop.TEXT, 'Pause Beenden')
    this.updateTimerDisplay()
  },

  processBreathingPhase() {
    const cyclePos = (BREATHING_SEC - this.state.remainingSeconds) % 12
    let phase = ''
    if (cyclePos < 4) {
      phase = 'Einatmen… (Bauch weiten)'
    } else if (cyclePos < 8) {
      phase = 'Luft sanft halten…'
    } else {
      phase = 'Langsames Ausatmen…'
    }

    if (cyclePos === 0 || cyclePos === 4 || cyclePos === 8) {
      this.vibratePulse()
    }

    this.state.statusWidget.setProperty(hmUI.prop.TEXT, phase)
  },

  stopSession() {
    if (this.state.intervalId) clearInterval(this.state.intervalId)
    this.stopSensors()

    this.state.mode = STATES.IDLE
    this.state.remainingSeconds = FOCUS_SEC
    // War bisher stehen geblieben - Sensoren sind hier schon gestoppt,
    // aber der letzte Messwert klebte weiter im UI (Jans Screenshot: "HR:
    // 82 bpm" im Ruhezustand, obwohl noch nie eine Session lief).
    this.state.currentHr = 0
    this.state.currentStress = 0
    this.state.titleWidget.setProperty(hmUI.prop.TEXT, 'SMART POMODORO')
    this.state.timeWidget.setProperty(hmUI.prop.MORE, { text: '25:00', color: COLOR.green })
    this.state.vitalWidget.setProperty(hmUI.prop.TEXT, 'HR: -- bpm | Stress: --')
    this.state.statusWidget.setProperty(hmUI.prop.MORE, {
      text: 'Bereit für 25 Min Fokus',
      color: COLOR.statusDefault,
    })
    this.state.btnControl.setProperty(hmUI.prop.MORE, {
      text: 'Fokus Starten',
      normal_color: COLOR.btnIdle,
    })
  },

  stopSensors() {
    if (this.state.heartRateSensor && this.state.onHrChange) {
      this.state.heartRateSensor.offCurrentChange(this.state.onHrChange)
    }
    if (this.state.stressSensor && this.state.onStressChange) {
      this.state.stressSensor.offChange(this.state.onStressChange)
    }
  },

  vibrateShort() {
    if (this.state.vibrator) {
      try {
        this.state.vibrator.start({ mode: VIBRATOR_SCENE_SHORT_LIGHT })
      } catch (e) {}
    }
  },

  vibratePulse() {
    this.vibrateShort()
  },

  vibrateAlarm() {
    if (this.state.vibrator) {
      try {
        this.state.vibrator.start({ mode: VIBRATOR_SCENE_STRONG_REMINDER })
      } catch (e) {}
    }
  },

  onDestroy() {
    if (this.state.intervalId) clearInterval(this.state.intervalId)
    this.stopSensors()
  },
})
