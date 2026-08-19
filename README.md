# Bio Pomodoro

An adaptive focus timer for the **Amazfit Bip Max** (Zepp OS, device code `PikeW`, square display) that adjusts break length based on real heart rate and stress readings during a 25-minute focus session, plus guided box-breathing for high-stress breaks.

Full concept: [`KONZEPT.md`](KONZEPT.md).

## Status (19.08.2026)

First build compiles clean. Not yet installed on a real device - heart rate/stress sensor behavior (measurement latency, accuracy while sitting still) is unverified.

## About the source

Same situation as [Bike HUD](https://github.com/UniqueDroid/bike-hud-zeppos): Jan's concept doc came with near-complete boilerplate that assumed an API surface that doesn't exist on-device. Corrections made against `node_modules/@zeppos/device-types`:

- **`HeartRate`/`Stress` have no `start()`/`stop()`.** `onCurrentChange()`/`onChange()` starts continuous measurement implicitly; `offCurrentChange()`/`offChange()` stops it. The boilerplate called `.start()` on both, which doesn't exist on either class.
- **`Stress.getCurrent()` returns `{ value, time }`**, not a plain number - the boilerplate's `getCurrent() || 0` would have held an object, silently breaking every average/threshold comparison downstream.
- **Wrong permission strings.** `device:os.sensor.heart_rate`/`device:os.sensor.stress` aren't real permission codes - the actual ones are `data:user.hd.heart_rate` and `data:user.hd.stress`.
- **Wrong import namespace / screen-on API / device target** - same three issues as Bike HUD (`@zeppos/*` → `@zos/*`, `setPageBrightScreen` → `setPageBrightTime`, round 480px → PikeW 432×514 square).
- **`Vibrator.setMode(1)`** passed a raw number where the real API wants either `start({ mode: CONST })` or `setMode({ mode: CONST })` with one of the real `VIBRATOR_SCENE_*` constants - standardized on `start({ mode })` throughout.
- **`getDeviceInfo()` moved out of module top-level into `build()`**, wrapped in try/catch with a hardcoded PikeW-resolution fallback - a missing `data:os.device.info` permission crashed the entire module before `Page()` ever ran in Bike HUD's first test; same defensive pattern applied here preemptively.

## Design

- Focus (25 min) → evaluate average HR/stress over the session → normal break (5 min) or, if stress ≥ 60 or HR ≥ 95 bpm, an extended 10-minute guided decompression break with a 4-4-4 box-breathing cycle (vibration pulse at each phase change).
- All sensor data stays on the watch - no network, no side service, no export.

## Project structure

```
app.json               # Target "PikeW" (Amazfit Bip Max), permissions: data:user.hd.heart_rate, data:user.hd.stress
app.js                  # App lifecycle
page/index.js             # Everything: UI, sensor handling, bio-feedback evaluation, breathing cycle
assets/logo.svg              # Icon source (circular, per Zepp's store icon spec)
```

## Building

```
npm install
zeus build
```

Sideload-testing via a `zpkd1://` QR code works the same way as in [Bike HUD](https://github.com/UniqueDroid/bike-hud-zeppos) / [SmartLock](https://github.com/UniqueDroid/Nuki-Smartlock-ZeppOS) / [SystemInfo](https://github.com/UniqueDroid/SystemInfo).

## Not implemented yet

- Real-device sensor testing - HR/stress update latency and accuracy are unverified, thresholds (stress ≥60, HR ≥95) are from the concept doc and untested in practice.
- App Store submission (placeholder `appId` 1006655, not yet registered on console.zepp.com).
