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
    'justUpgraded'
  ];
  BaseModule.create(Launcher, {
    name: 'Launcher',
    DEBUG: false,
    ready: function() {
      this._version = {};
      return Promise.all([
        this.readFtu(),
        this.readSetting('homescreen.manifestURL'),
        this.readSetting('ftu.manifestURL'),
        this.readSetting('deviceinfo.os'),
        this.readSetting('deviceinfo.previous_os'),
        this.readSetting('lockscreen.enabled')
      ]).then(function(results) {
        var [ftuEnabled, homescreenManifestURL, ftuManifestURL,
             osVersion, previousOsVersion, lockscreenEnabled] = results;
        this.lockscreenEnabled = lockscreenEnabled;
        if (this.checkUpgrading(osVersion, previousOsVersion)) {
          this.service.request('FtuLauncher:launch');
        } else {
          if (ftuEnabled !== false && ftuManifestURL) {
            this.service.request('FtuLauncher:launch',
              ftuManifestURL).then(() => {
                this.service.request('HomescreenLauncher:launch',
                  homescreenManifestURL);
              });

            this.service.request('stepReady', 'done').then(() => {
              this.service.request('LockScreenLauncher:standby');
            });
          } else {
            // We still need to tell FtuLauncher to skip to process some tasks.
            this.service.request('FtuLauncher:skip');
            if (lockscreenEnabled) {
              // XXX: We should have a lockscreenLauncher here.
              this.service.request('LockScreenLauncher:launch').then(() => {
                this.service.request('HomescreenLauncher:launch',
                  homescreenManifestURL);
              });
            } else {
              this.service.request('HomescreenLauncher:launch',
                homescreenManifestURL);
              this.service.request('LockScreenLauncher:standby');
            }
          }
        }
      }.bind(this));
    },
    justUpgraded: function() {
      return this._isUpgrade;
    },
    checkUpgrading: function(prev, curr) {
      var isUpgrade = false;
      // dont treat lack of previous version info as an upgrade
      if (prev && curr) {
        isUpgrade = curr.major > prev.major || curr.minor > prev.minor;
      }
      this._isUpgrade = isUpgrade;
      return isUpgrade;
    },
    readFtu: function() {
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
