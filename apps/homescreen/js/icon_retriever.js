
'use strict';

var IconRetriever = (function() {

  // List of requests
  var requests;

  // List of requests waiting for network
  var pendingsRequests;

  function retrieve(request) {
    var xhr = new XMLHttpRequest({
      mozAnon: true,
      mozSystem: true
    });

    var icon = request.icon.descriptor.icon;

    xhr.open('GET', icon, true);
    xhr.responseType = 'blob';

    try {
      xhr.send(null);
    } catch (evt) {
      console.error('Got an exception when trying to load icon "' + icon +
            ' +" falling back to cached icon. Exception is: ' + evt.message);
      setTimeout(function() {
        postError(request);
      });
      return;
    }

    xhr.onload = function onload(evt) {
      var status = xhr.status;
      if (status !== 0 && status !== 200) {
        console.error('Got HTTP status ' + status + ' trying to load icon ' +
                      icon);
        postError(request, false);
        return;
      }

      postSuccess(request, xhr.response);
    }; // onload

    xhr.ontimeout = xhr.onerror = function onerror(evt) {
      console.error(evt.type, ' while HTTP GET: ', icon);
      postError(request, true);
    }; // ontimeout & onerror
  }

  function postSuccess(request, response) {
    var uid = request.uid;
    if (typeof requests[uid].success === 'function') {
      requests[uid].success.call(request.icon, response);
    }

    remove(request);
  }

  function postError(request, retry) {
    var uid = request.uid;
    if (typeof requests[uid].error === 'function') {
      requests[uid].error.call(request.icon);
    }

    if (retry) {
      pendingsRequests[uid] = requests[uid];
    } else {
      // We aren't going to get this icon anymore before rebooting
      remove(request);
    }
  }

  function remove(request) {
    var uid = request.uid;
    delete requests[uid];
    delete pendingsRequests[uid];
  }

  function online() {
    // Try again pending operations
    for (var uid in pendingsRequests) {
      retrieve(pendingsRequests[uid]);
    }
  }

  var HTTP_PROTOCOL = 'http';

  function canBeDispatched(request) {
    // We can continue if the device is onLine or the icon is local (app, data
    // protocols)
    return (window.navigator.onLine ||
            request.icon.descriptor.icon.slice(0, HTTP_PROTOCOL.length) !==
            HTTP_PROTOCOL);
  }

  return {
    init: function IconRetriever_init() {
      requests = Object.create(null);
      pendingsRequests = Object.create(null);
      window.addEventListener('online', online);
    },

    get: function IconRetriever_get(request) {
      var uid = request.uid = request.icon.getUID();

      var pendingRequest = requests[uid];
      if (pendingRequest &&
          pendingRequest.icon.descriptor.icon == request.icon.descriptor.icon) {
        // Still working or pending, returning...
        return;
      }

      requests[uid] = request;
      if (canBeDispatched(request)) {
        retrieve(request);
      } else {
        pendingsRequests[uid] = request;
      }
    }
  };

}());
