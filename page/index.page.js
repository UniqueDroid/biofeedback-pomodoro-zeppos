import { BasePage } from '@zeppos/zml/base-page'
import { layout } from './index.layout'
import { COLOR } from './index.style'
import {
  HeartRate,
  Stress,
  Vibrator,
  VIBRATOR_SCENE_SHORT_LIGHT,
  VIBRATOR_SCENE_STRONG_REMINDER,
} from '@zos/sensor'
import { setPageBrightTime } from '@zos/display'

const FOCUS_SEC = 25 * 60
const BREAK_SEC = 5 * 60
const BREATHING_SEC = 10 * 60
const HIGH_STRESS_THRESHOLD = 60
const HIGH_HR_THRESHOLD = 95

const STATES = { IDLE: 'IDLE', FOCUS: 'FOCUS', BREAK: 'BREAK', BREATHING: 'BREATHING' }

Page(
  BasePage({
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
    },

    build() {
      layout.render(this)

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
        layout.setStatus('Sensoren nicht verfügbar')
      }
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

      layout.setTitle('FOKUS PHASE')
      layout.setTimeText('25:00')
      layout.setTimeColor(COLOR.green)
      layout.setButton('Abbrechen', COLOR.btnActive)
      layout.setStatus('Vitals werden überwacht…', COLOR.statusDefault)

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
      layout.setVital(`HR: ${hr} bpm | Stress: ${st}`)
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
      layout.setTimeText(`${m}:${s}`)
    },
    // updateTimerDisplay() belaesst die Farbe unveraendert - die wird
    // separat per setTimeColor() beim Phasenwechsel gesetzt.

    handleTimerCompletion() {
      this.vibrateAlarm()
      if (this.state.mode === STATES.FOCUS) {
        this.evaluateBioFeedbackAndTriggerBreak()
      } else {
        this.stopSession()
        layout.setStatus('Pause beendet! Gut erholt?', COLOR.statusDefault)
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

        layout.setTitle('BIO-DECOMPRESSION')
        layout.setTimeColor(COLOR.cyan)
        layout.setStatus(`Hoher Stress (${Math.round(avgStress)})! 10m Atem-Pause`, COLOR.amber)
      } else {
        this.state.mode = STATES.BREAK
        this.state.remainingSeconds = BREAK_SEC

        layout.setTitle('REGULÄRE PAUSE')
        layout.setTimeColor(COLOR.amber)
        layout.setStatus('Gute Werte! 5 Min erholen.', COLOR.green)
      }

      layout.setButton('Pause Beenden')
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

      layout.setStatus(phase)
    },

    stopSession() {
      if (this.state.intervalId) clearInterval(this.state.intervalId)
      this.stopSensors()

      this.state.mode = STATES.IDLE
      this.state.remainingSeconds = FOCUS_SEC
      this.state.currentHr = 0
      this.state.currentStress = 0
      layout.resetIdle()
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
  }),
)
