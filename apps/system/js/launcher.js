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
    'wallpaper.image.valid'
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
        this.readSetting('wallpaper.image.valid')
      ]).then(function(results) {
        var [ftuEnabled, homescreenManifestURL, ftuManifestURL,
             osVersion, previousOsVersion, lockscreenEnabled,
             wallpaper, wallpaperValid] = results;
        this.lockscreenEnabled = lockscreenEnabled;
        this.wallpaper = wallpaper;
        this.wallpaperValid = wallpaperValid;
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
          if (ftuEnabled !== false && ftuManifestURL) {
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
      // We still need to tell FtuLauncher to skip to process some tasks.
      this.service.request('FtuLauncher:skip');
      this.service.request('WallpaperManager:initializeWallpaper',
        this.wallpaper, this.wallpaperValid);
      this.service.request('HomescreenLauncher:launch',
        homescreenManifestURL).then(() => {
          this.service.request('LogoManager:animatePoweronLogo');
          this.scheduler.release();
        }).catch(function(err) {
          console.error(err);
        });
      this.service.request('LockScreenLauncher:standby');
    },
    launchLockscreenThenHomescreen: function(homescreenManifestURL) {
      // We still need to tell FtuLauncher to skip to process some tasks.
      this.service.request('FtuLauncher:skip');
      this.service.request('WallpaperManager:initializeWallpaper',
        this.wallpaper, this.wallpaperValid).then(() => {
        return this.service.request('LockScreenLauncher:launch');
      }).then(() => {
        this.service.request('LogoManager:animatePoweronLogo');
        this.service.request('HomescreenLauncher:launch',
          homescreenManifestURL);
        this.scheduler.release();
      }).catch(function(err) {
        console.error(err);
      });
    },
    launchFtuThenHomescreen: function(ftuManifestURL, homescreenManifestURL) {
      this.service.request('FtuLauncher:launch',
        ftuManifestURL).then(() => {
          this.service.request('HomescreenLauncher:launch',
            homescreenManifestURL);
          this.service.request('LogoManager:animatePoweronLogo');
          this.scheduler.release();
        }).catch(function(err) {
          console.error(err);
        });
      this.service.request('WallpaperManager:initializeWallpaper',
        this.wallpaper, this.wallpaperValid);
      this.service.request('stepReady', 'done').then(() => {
        this.service.request('LockScreenLauncher:standby');
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
