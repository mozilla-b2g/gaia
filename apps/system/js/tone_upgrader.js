'use strict';
/*
 * This module is for tone upgrading after the OTA, we will load it only when
 * the system found it's a version upgraded.
 *
 * Please use the LazyLoader to load this, then simply call the perform() to
 * execute the necessary migrations for the tones. There are two tone types
 * we can upgrade, one is ringtone and the other one is alerttone, just pass
 * them to the perform() and the upgrader will upgrade the tone type you want.
 */

(function(exports) {
  function ToneUpgrader() {
  }

  // Helper to get the default tone's info.
  ToneUpgrader.prototype.getInfo = function tu_getInfo(type) {
    var info;

    switch (type) {
      case 'ringtone':
        info = {
          settingsBase: 'dialer.ringtone',
          baseURL: '/shared/resources/media/ringtones/',
          name: 'ringer_firefox',
          filename: 'ringer_firefox.opus',
          mimetype: 'audio/ogg'
        };
        return info;
      case 'alerttone':
        info = {
          settingsBase: 'notification.ringtone',
          baseURL: '/shared/resources/media/notifications/',
          name: 'notifier_firefox',
          filename: 'notifier_firefox.opus',
          mimetype: 'audio/ogg'
        };
        return info;
      default:
        throw new Error('tone type not supported');
    }
  };

  // Set the tone to default if needed.
  ToneUpgrader.prototype.setDefault = function tu_setDefault(type) {
    var self = this;

    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      var info = self.getInfo(type);
      var url = info.baseURL + info.filename;
      xhr.open('GET', url);
      xhr.overrideMimeType(info.mimetype);
      xhr.responseType = 'blob';
      xhr.send();
      xhr.onload = function() {
        var settings = {};
        var blob = xhr.response;
        var toneKey = info.settingsBase;
        var toneName = info.settingsBase + '.name';
        var toneIdKey = info.settingsBase + '.id';
        var toneDefaultIdKey = info.settingsBase + '.default.id';

        settings[toneKey] = blob;
        settings[toneName] = {l10nID : info.name + '2'};
        settings[toneIdKey] = 'builtin:' + type + '/' + info.name;
        settings[toneDefaultIdKey] = 'builtin:' + info.name;

        var request = navigator.mozSettings.createLock().set(settings);
        request.onsuccess = function() {
          resolve();
        };
        request.onerror = function() {
          reject();
        };
      };
      xhr.onerror = function() {
        reject();
      };
    });
  };

  // Check the current tone is the built-in one or some customized one. 
  ToneUpgrader.prototype.perform = function tu_perform(type) {
    var self = this;

    return new Promise(function(resolve, reject) {
      var toneIdKey = self.getInfo(type).settingsBase + '.id';

      var request = navigator.mozSettings.createLock().get(toneIdKey);
      request.onsuccess = function() {
        var toneId = request.result[toneIdKey];
        if (toneId.indexOf('builtin:') !== -1) {
          // It's one of the built-in tones so override it with the new
          // default tone in 2.0.
          self.setDefault(type);
        }
        resolve();
      };
      request.onerror = function() {
        reject();
      };
    });
  };

  exports.ToneUpgrader = ToneUpgrader;

  /*
   * We are lazy loading the ToneUpgrader so after this module/js loaded, the
   * toneUpgrader instance will be created and to be used directly.
   */
  exports.toneUpgrader = new ToneUpgrader();
})(window);
