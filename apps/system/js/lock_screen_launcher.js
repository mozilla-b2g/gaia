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
  BaseModule.create(LockScreenLauncher, {
    DEBUG: true,
    name: 'LockScreenLauncher',
    launch: function() {
      return BaseModule.lazyLoad(['LockScreenWindowManager']).then(() => {
        this.debug('open right away');
        this.lockScreenWindowManager = new LockScreenWindowManager();
        this.lockScreenWindowManager.start();
        this.lockScreenWindowManager.openApp();
        return Promise.resolve();
      });
    },
    standby: function() {
      return BaseModule.lazyLoad(['LockScreenWindowManager']).then(() => {
        this.debug('standby mode');
        this.lockScreenWindowManager = new LockScreenWindowManager();
        this.lockScreenWindowManager.start();
        return Promise.resolve();
      });
    }
  });
}());
