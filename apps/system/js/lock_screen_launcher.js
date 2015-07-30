/* global BaseModule, LockScreenWindowManager */
'use strict';

(function() {
  var LockScreenLauncher = function() {};
  LockScreenLauncher.SUB_MODULES = [
    'SecureWindowManager'
  ];
  LockScreenLauncher.SERVICES = [
    'launch',
    'standby'
  ];
  LockScreenLauncher.STATS = [
    'launched'
  ];
  BaseModule.create(LockScreenLauncher, {
    DEBUG: false,
    name: 'LockScreenLauncher',
    launched: false,
    launch: function() {
      return new Promise((resolve) => {
        BaseModule.lazyLoad(['LockScreenWindowManager']).then(() => {
          this.debug('open right away');
          this.lockScreenWindowManager = new LockScreenWindowManager();
          this.lockScreenWindowManager.start();
          this.lockScreenWindowManager.openApp();
          if (this.lockScreenWindowManager.app &&
              this.lockScreenWindowManager.app.iframe &&
              this.lockScreenWindowManager.app.iframe.parentNode) {
            this.launched = true;
          }
          resolve();
        });
      });
    },
    standby: function() {
      return new Promise((resolve) => {
        BaseModule.lazyLoad(['LockScreenWindowManager']).then(() => {
          this.debug('standby mode');
          this.lockScreenWindowManager = new LockScreenWindowManager();
          this.lockScreenWindowManager.start();
          resolve();
        });
      });
    }
  });
}());
