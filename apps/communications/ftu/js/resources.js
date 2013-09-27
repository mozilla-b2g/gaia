'use strict';

var Resources = {
  load: function load(url, type, onsuccess, onerror) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = type;
    if (type == 'json') {
      xhr.overrideMimeType('application/json');
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
  }
};
