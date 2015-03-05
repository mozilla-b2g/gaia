/* global BaseModule */
'use strict';

(function() {
  var Launcher = function() {};
  Launcher.SETTINGS = [
    'ftu.manifestURL',
    'homescreen.manifestURL',
    'deviceinfo.previous_os',
    'deviceinfo.os',
    'lockscreen.enabled'
  ];
  Launcher.STATES = [
    'isUpgrade'
  ];
  BaseModule.create(Launcher, {
    name: 'Launcher',
    ready: function() {
      this._version = {};
      return Promise.all([
        this.readFtu(),
        this.readSetting('homescreen.manifestURL'),
        this.readSetting('ftu.manifestURL'),
        this.readSetting('deviceinfo.os'),
        this.readSetting('deviceinfo.previous_os')
      ]).then(function(results) {
        if (this.isUpgrading(results[4], results[3])) {
          this.service.request('FtuLauncher:launch');
        } else {
          if (results[0] !== false && results[2]) {
            this.service.request('FtuLauncher:launch', results[2]);
          } else {
            this.service.request('FtuLauncher:skip');
            this.service.request('HomescreenLauncher:launch', results[1]);
          }
        }
      }.bind(this));
    },
    isUpgrade: function() {
      return this._isUpgrade;
    },
    isUpgrading: function(prev, curr) {
      var isUpgrade = false;
      // dont treat lack of previous version info as an upgrade
      if (prev && curr) {
        isUpgrade = curr.major > prev.major || curr.minor > prev.minor;
      }
      this._isUpgrade = isUpgrade;
      return isUpgrade;
    },
    'readFtu': function() {
      return new Promise(function(resolve) {
        // This value is recorded as false by FtuLauncher once
        // FTU steps are completed.
        window.asyncStorage.getItem('ftu.enabled', function(shouldFTU) {
          resolve(shouldFTU);
        });
      });
    }
  });
}());
