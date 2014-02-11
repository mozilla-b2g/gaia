'use strict';

this.defaultRingtones = function() {
  function DefaultRingtone(filename, baseURL) {
    this.l10nId = filename.replace('.', '_');
    this.id = 'default:' + filename;
    this.url = baseURL + filename;
  }

  DefaultRingtone.prototype = {
    get name() {
      return navigator.mozL10n.get(this.l10nId);
    },

    getBlob: function(callback) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', this.url);
      // XXX: This assumes that all system tones are ogg files. Maybe map based
      // on the extension instead?
      xhr.overrideMimeType('audio/ogg');
      xhr.responseType = 'blob';
      xhr.send();
      xhr.onload = function() {
        callback(xhr.response);
      };
    }
  };

  // Read the list.json file to get the names of all sounds we know about
  // and pass an array of filenames to the callback function. These filenames
  // are relative to baseURL.
  function getSoundFilenames(listURL, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', listURL);
    xhr.responseType = 'json';
    xhr.send(null);

    xhr.onload = function() {
      // The list.json file organizes the sound urls as an object instead of
      // an array for some reason
      var filenames = Object.keys(xhr.response);
      callback(filenames);
    };

    xhr.onerror = function() {
      console.error('Could not read sounds list', listURL, xhr.status);
    };
  }

  function list(toneType, callback) {
    var baseURL, listURL;

    switch (toneType) {
    case 'ringtone':
      baseURL = '/shared/resources/media/ringtones/';
      listURL = '/shared/resources/media/ringtones/list.json';
      break;

    case 'alerttone':
      baseURL = '/shared/resources/media/notifications/';
      listURL = '/shared/resources/media/notifications/list.json';
      break;

    default:
      throw new Error('pick type not supported');
    }

    getSoundFilenames(listURL, function(filenames) {
      filenames.forEach(function(filename) {
        callback(new DefaultRingtone(filename, baseURL));
      });
    });
  }

  return {
    list: list
  };
}();
