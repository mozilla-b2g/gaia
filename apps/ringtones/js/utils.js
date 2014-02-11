'use strict';

function getSettingsBase(toneType) {
  switch (toneType) {
  case 'ringtone':
    return 'dialer.ringtone';
  case 'alerttone':
    return 'notification.ringtone';
  default:
    throw new Error('tone type not supported');
  }
}

function setTone(toneType, tone, callback) {
  tone.getBlob(function(blob) {
    var settingsBase = getSettingsBase(toneType);
    var settings = {};
    settings[settingsBase] = blob;
    settings[settingsBase + '.name'] = tone.name;
    settings[settingsBase + '.id'] = tone.id;

    navigator.mozSettings.createLock().set(settings).onsuccess = function() {
      callback();
    };
  });
}

function getCurrentToneId(toneType, callback) {
  var settingKey = getSettingsBase(toneType) + '.id';
  navigator.mozSettings.createLock().get(settingKey).onsuccess = function(e) {
    callback(e.target.result[settingKey]);
  };
}

function NullRingtone() {}

NullRingtone.prototype = {
  get l10nId() {
    return 'none';
  },

  get id() {
    return 'none';
  },

  get name() {
    return navigator.mozL10n.get(this.l10nId);
  },

  get url() {
    return '';
  },

  getBlob: function(callback) {
    callback(null);
  }
};
