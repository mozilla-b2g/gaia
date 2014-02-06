'use strict';

function BuiltInSounds(toneType) {
  switch (toneType) {
  case 'ringtone':
    this._baseURL = '/shared/resources/media/ringtones/';
    this._listURL = '/shared/resources/media/ringtones/list.json';
    this._settingKey = 'dialer.ringtone.name';
    break;

  case 'alerttone':
    this._baseURL = '/shared/resources/media/notifications/';
    this._listURL = '/shared/resources/media/notifications/list.json';
    this._settingKey = 'notification.ringtone.name';
    break;

  default:
    throw new Error('pick type not supported');
  }
}

BuiltInSounds.prototype = {
  getList: function(callback) {
    var self = this;
    self._getSoundFilenames(function(filenames) {
      self._getCurrentSoundName(function(currentSoundName) {
        self._getSoundNames(filenames, function(sounds) {
          callback(sounds, currentSoundName);
        });
      });
    });
  },

  // Read the list.json file to get the names of all sounds we know about
  // and pass an array of filenames to the callback function. These filenames
  // are relative to baseURL.
  _getSoundFilenames: function(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', this._listURL);
    xhr.responseType = 'json';
    xhr.send(null);

    xhr.onload = function() {
      // The list.json file organizes the sound urls as an object instead of
      // an array for some reason
      var filenames = [];
      for (var name in xhr.response) {
        filenames.push(name);
      }
      callback(filenames);
    };

    xhr.onerror = function() {
      console.error('Could not read sounds list', this._listURL, xhr.status);
    }.bind(this);
  },

  _getCurrentSoundName: function(callback) {
    var settingKey = this._settingKey;
    navigator.mozSettings.createLock().get(settingKey).onsuccess = function(e) {
      callback(e.target.result[settingKey]);
    };
  },

  // Wait until localization is done, then obtain localized names for each
  // each of the sound filenames, and invoke the callback with an object
  // that maps human-readable sound names to sound URLs
  _getSoundNames: function(filenames, callback) {
    var toneType = this._toneType;
    var baseURL = this._baseURL;

    navigator.mozL10n.ready(function() {
      var sounds = {};
      filenames.forEach(function(filename) {
        var key = filename.replace('.', '_');
        var name = navigator.mozL10n.get(key);
        if (!name) {
          var prefix = toneType === 'alerttone' ? 'notifier_' : 'ringer_';
          name = filename
            .replace(prefix, '')      // strip prefix
            .replace(/\..+$/, '')     // strip suffix
            .replace('_', ' ');       // convert underscores to spaces
        }
        var url = baseURL + filename;
        sounds[name] = url;
      });

      callback(sounds);
    });
  }
};
