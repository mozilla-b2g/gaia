'use strict';
/* global asyncStorage */
(function(exports) {

  const MAX_NUMBER_OF_ATTEMPTS = 3;

  const XHR_TIMEOUT = 10000;

  var pendingItems = Object.create(null);

  var onGoingItems = Object.create(null);

  function onerror(caller, status, data) {
    // TODO: We can control more cases, error codes, etc... Current
    // implementation only retries three times when the reason is an error or a
    // timeout
    var gridItem = data.gridItem;
    var id = gridItem.identifier;
    delete onGoingItems[id];

    if (caller === 'onerror' && data.attempts < MAX_NUMBER_OF_ATTEMPTS) {
      // Retrying when the device gets connection
      ++data.attempts;
      pendingItems[id] = data;
    }

    asyncStorage.getItem(id, function(blob) {
      renderBlob(gridItem, blob);
      data.callback && data.callback();
    });
  }

  function renderBlob(gridItem, blob) {
    if (blob) {
      var img = document.createElement('img');
      img.src = URL.createObjectURL(blob);
      img.onload = function() {
        gridItem.displayFromImage(img);
        URL.revokeObjectURL(img.src);
      };
    }
  }

  function doGet(data) {
    var gridItem = data.gridItem;

    if (!gridItem) {
      return;
    }

    var id = gridItem.identifier;
    if (onGoingItems[id]) {
      // Already being processed, do nothing for now...
      return;
    }

    onGoingItems[id] = data;
    delete pendingItems[id];

    var xhr = new XMLHttpRequest({
      mozAnon: true,
      mozSystem: true
    });

    var url = gridItem.icon;
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

      delete onGoingItems[id];
      renderBlob(gridItem, xhr.response);
      asyncStorage.setItem(id, xhr.response);
      data.callback && data.callback();
    };

    xhr.onerror = xhr.ontimeout = function() {
      console.error('Error while HTTP GET: ', url);
      onerror('onerror', xhr.status, data);
    };
  }

  window.addEventListener('online', function online() {
    // Try again pending operations. Note that since we've just come online we
    // should *not* have anything on the ongoing list
    Object.keys(pendingItems).forEach(function(id) {
      doGet(pendingItems[id]);
    });
  });

  exports.IconRetriever = {

    /**
    Begin fetching the icon for a GridItem subclass.

    @param {GridIcon} gridItem who we are fetching an icon for.
    @param {Function} callback [Error] fired when download completes.
    */
    get: function(gridItem, callback) {
      doGet({
        gridItem: gridItem,
        attempts: 0,
        callback: callback
      });
    }
  };

}(window));
