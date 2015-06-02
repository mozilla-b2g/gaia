/* global BaseModule */
'use strict';

(function() {
  /**
   * This module is responsible to read all boot up related
   * configurations and asks other launcher to launch
   * at the correct timing by the configurations.
   */
  var Launcher = function() {};
  Launcher.SUB_MODULES = ['Scheduler'];
  Launcher.SETTINGS = [
    'ftu.manifestURL',
    'homescreen.manifestURL',
    'deviceinfo.previous_os',
    'deviceinfo.os',
    'lockscreen.enabled',
    'wallpaper.image',
    'wallpaper.image.valid',
    'lockscreen.passcode-lock.enabled'
  ];
  Launcher.STATES = [
    'justUpgraded'
  ];
  BaseModule.create(Launcher, {
    name: 'Launcher',
    DEBUG: false,
    _start: function() {
      this._version = {};
      this.debug('reading configurations...');
      return Promise.all([
        this.readFtu(),
        this.readSetting('homescreen.manifestURL'),
        this.readSetting('ftu.manifestURL'),
        this.readSetting('deviceinfo.os'),
        this.readSetting('deviceinfo.previous_os'),
        this.readSetting('lockscreen.enabled'),
        this.readSetting('wallpaper.image'),
        this.readSetting('wallpaper.image.valid'),
        this.readSetting('lockscreen.passcode-lock.enabled')
      ]).then(function(results) {
        var [ftuEnabled, homescreenManifestURL, ftuManifestURL,
             osVersion, previousOsVersion, lockscreenEnabled,
             wallpaper, wallpaperValid,
             passcodeEnabled] = results;
        this.lockscreenEnabled = lockscreenEnabled;
        this.wallpaper = wallpaper;
        this.wallpaperValid = wallpaperValid;
        this.passcodeEnabled = passcodeEnabled;
        this.debug('Ftu enabled = ' + ftuEnabled +
          '; ftuManifestURL = ' + ftuManifestURL +
          '; osVersion = ' + osVersion +
          '; previousOsVersion = ' + previousOsVersion +
          '; homescreenManifestURL = ' + homescreenManifestURL +
          '; lockscreenEnabled = ' + lockscreenEnabled);
        if (this.checkUpgrading(osVersion, previousOsVersion)) {
          this.debug('upgrading boot');
          this.launchFtuThenHomescreen(ftuManifestURL,
            homescreenManifestURL);
        } else {
          if (ftuEnabled !== false && ftuManifestURL &&
              typeof(ftuManifestURL) === 'string') {
              // We need the typeof check because integration test will
              // write {} to this settings to pretend to be null value.
            this.debug('clean boot');
            this.launchFtuThenHomescreen(ftuManifestURL,
              homescreenManifestURL);
          } else {
            this.debug('normal boot');
            if (lockscreenEnabled) {
              this.launchLockscreenThenHomescreen(homescreenManifestURL);
            } else {
              this.launchHomescreenAndStandbyLockscreen(homescreenManifestURL);
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
    launchHomescreenAndStandbyLockscreen: function(homescreenManifestURL) {
      // We don't need to chain these promises in the big startup chain
      // inside app.js; but that means we need to catch the errors on our own.
      return Promise.all([
        // We still need to tell FtuLauncher to skip to process some tasks.
        this.service.request('FtuLauncher:skip'),
        this.service.request('WallpaperManager:initializeWallpaper',
          this.wallpaper, this.wallpaperValid),
        this.service.request('LockScreenLauncher:standby'),
        this.service.request('HomescreenLauncher:launch',
          homescreenManifestURL, true).then(() => {
            return Promise.all([
              this.service.request('CoverScreen:animatePoweronLogo'),
              this.scheduler.release()
            ]);
          })
      ]).catch((err) => {
        console.error(err);
      });
    },
    launchLockscreenThenHomescreen: function(homescreenManifestURL) {
      // We don't need to chain these promises in the big startup chain
      // inside app.js; but that means we need to catch the errors on our own.
      return Promise.all([
        // We still need to tell FtuLauncher to skip to process some tasks.
        this.service.request('FtuLauncher:skip'),
        this.service.request('WallpaperManager:initializeWallpaper',
          this.wallpaper, this.wallpaperValid).then(() => {
            return this.service.request('LockScreenLauncher:launch');
          }).then(() => {
            return Promise.all([
              this.service.request('setPassCodeEnabled', this.passcodeEnabled),
              this.service.request('onPasscodeEnabledChanged',
                this.passcodeEnabled)
            ]);
          }).then(() => {
            return Promise.all([
              this.service.request('CoverScreen:animatePoweronLogo'),
              this.service.request('HomescreenLauncher:launch',
                homescreenManifestURL),
              this.scheduler.release()
            ]);
          })
      ]).catch((err) => {
        console.error(err);
      });
    },
    launchFtuThenHomescreen: function(ftuManifestURL, homescreenManifestURL) {
      // We don't need to chain these promises in the big startup chain
      // inside app.js; but that means we need to catch the errors on our own.
      return Promise.all([
        this.service.request('FtuLauncher:launch',
          ftuManifestURL).then(() => {
            return Promise.all([
              this.service.request('HomescreenLauncher:launch',
                homescreenManifestURL),
              this.service.request('CoverScreen:animatePoweronLogo'),
              this.scheduler.release()
            ]);
          }),
        this.service.request('WallpaperManager:initializeWallpaper',
          this.wallpaper, this.wallpaperValid),
        this.service.request('stepReady', 'done').then(() => {
          return this.service.request('LockScreenLauncher:standby');
        })
      ]).catch((err) => {
        console.error(err);
      });
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
