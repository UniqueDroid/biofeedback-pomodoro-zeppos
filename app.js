import { BaseApp } from '@zeppos/zml/base-app'

App(
  BaseApp({
    globalData: {},
    onCreate() {
      this.log('app onCreate')
    },
    onDestroy() {
      this.log('app onDestroy')
    },
  }),
)
