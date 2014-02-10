'use strict';

this.defaultRingtones = function() {
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
        var l10nId = filename.replace('.', '_');
        callback({l10nId: l10nId, url: baseURL + filename});
      });
    });
  }

  return {
    list: list
  };
}();
