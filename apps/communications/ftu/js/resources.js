'use strict';

var Resources = {
  load: function r_load(url, type, onsuccess, onerror) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = type;

    var mimetype = this.getMimetype(url);
    if (mimetype) {
      xhr.overrideMimeType(mimetype);
    }
    xhr.onload = function() {
      if (xhr.status === 200) {
        onsuccess && onsuccess(xhr.response);
      } else {
        console.error('Resources.js: Failed to fetch file.', xhr.statusText);
        onerror && onerror(xhr.statusText);
      }
    };
    // Workaround due to https://bugzilla.mozilla.org/show_bug.cgi?id=827243
    try {
      xhr.send();
    } catch (e) {
      // TODO Remove when 827243 will be fixed.
      console.error('Resources.js: Failed to fetch file.', xhr.statusText);
      onerror && onerror('404: due to bug 827243');
    }
  },
  getMimetype: function r_getMimetype(fileName) {
    var fileExtension = fileName.split('.').pop();
    var mimetype = false;
    if (fileExtension) {
      switch (fileExtension) {
        case 'ogg':
          mimetype = 'audio/ogg';
          break;
        case 'json':
          mimetype = 'application/json';
          break;
        case 'mp3':
          mimetype = 'audio/mpeg';
          break;
        case 'mp4':
          mimetype = 'audio/mp4';
          break;
      }
    }
    return mimetype;
  }
};
