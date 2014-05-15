'use strict';
/* global asyncStorage */

(function(exports) {

  const MAX_NUMBER_OF_ATTEMPTS = 3;

  const XHR_TIMEOUT = 10000;
  
  var pendingIcons = Object.create(null);

  var onGoingIcons = Object.create(null);

  function onerror(caller, status, data) {
    // TODO: We can control more cases, error codes, etc... Current
    // implementation only retries three times when the reason is an error or a
    // timeout
    var icon = data.icon;
    var id = icon.identifier;
    delete onGoingIcons[id];

    if (caller === 'onerror' && data.attempts < MAX_NUMBER_OF_ATTEMPTS) {
      // Retrying when the device gets connection
      ++data.attempts;
      pendingIcons[id] = data;
    }

    asyncStorage.getItem(id, function(blob) {
      renderBlob(icon, blob);
    });
  }

  function renderBlob(icon, blob) {
    if (blob) {
      var img = document.createElement('img');
      img.src = URL.createObjectURL(blob);
      img.onload = function() {
        icon.displayFromImage(img);
        URL.revokeObjectURL(img.src);
      };
    }
  }

  function doGet(data) {
    var icon = data.icon;

    if (!icon) {
      return;
    }

    var id = icon.identifier;
    if (onGoingIcons[id]) {
      // Already being processed, do nothing for now...
      return;
    }

    onGoingIcons[id] = data;
    delete pendingIcons[id];

    var xhr = new XMLHttpRequest({
      mozAnon: true,
      mozSystem: true
    });

    var url = icon.icon;
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';
    xhr.timeout = XHR_TIMEOUT;
    xhr.send();

    xhr.onload = function() {
      var status = xhr.status;
      if (status !== 0 && status !== 200) {
        console.error('Got HTTP status ' + status + ' trying to load ' + url);
        onerror('onload', status, data);
        return;
      }

      delete onGoingIcons[id];
      renderBlob(icon, xhr.response);
      asyncStorage.setItem(id, xhr.response);
    };

    xhr.onerror = xhr.ontimeout = function() {
      console.error('Error while HTTP GET: ', url);
      onerror('onerror', xhr.status, data);
    };
  }

  window.addEventListener('online', function online() {
    // Try again pending operations. Note that since we've just come online we
    // should *not* have anything on the ongoing list
    Object.keys(pendingIcons).forEach(function(id) {
      doGet(pendingIcons[id]);
    });
  });

  exports.IconRetriever = {
    get: function(icon) {
      doGet({
        icon: icon,
        attempts: 0
      });
    }
  };

}(window));
