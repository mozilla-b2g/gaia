
'use strict';

var IconRetriever = (function() {

  // A request can be being serviced, or it can be on air (ongoing).
  // New requests can be added to the ongoing list only if there's no
  // existing request for that uid ongoing (being serviced) already.

  // List of ongoing requests.
  var ongoingRequests;

  // List of requests waiting to be dispatched (because we don't have network
  // or we have another request for the same uid ongoing).
  var pendingRequests;

  function retrieve(uid) {

    if (ongoingRequests[uid]) {
      // Already being processed, do nothing for now...
      return;
    }

    // Move from pending to ongoing...
    var request = ongoingRequests[uid] = pendingRequests[uid];
    delete pendingRequests[uid];

    if (!request) {
      // This should not happen but doesn't hurt...
      return;
    }

    var xhr = new XMLHttpRequest({
      mozAnon: true,
      mozSystem: true
    });

    var icon = request.icon;

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
    delete ongoingRequests[uid];
    if (typeof request.success === 'function') {
      try {
        request.success(response);
      } catch (x) {
        console.error('Unexpected exception ', JSON.stringify(x),
                      ' while processing: ', request.icon);
      }
    }
    // Process the next request for this uid, if any...
    if (canBeDispatched(pendingRequests[uid])) {
      retrieve(uid);
    }
  }

  function postError(request, retry) {
    var uid = request.uid;
    if (typeof request.error === 'function') {
      try {
        request.error();
      } catch (x) {
        console.error('Unexpected exception ', JSON.stringify(x),
                      ' while processing: ', request.icon);
      }
    }

    if (retry) {
      pendingRequests[uid] = pendingRequests[uid] || ongoingRequests[uid];
      delete ongoingRequests[uid];
    }
  }

  function online() {
    // Try again pending operations.
    // Note that since we've just come online we should *not* have anything on
    // the ongoing list.
    for (var uid in pendingRequests) {
      retrieve(uid);
    }
  }

  var HTTP_PROTOCOL = 'http';

  function canBeDispatched(request) {
    // We can continue if the device is onLine or the icon is local (app, data
    // protocols)
    return (request && (window.navigator.onLine ||
                        request.icon.slice(0, HTTP_PROTOCOL.length) !==
                        HTTP_PROTOCOL));
  }

  return {
    init: function IconRetriever_init() {
      ongoingRequests = Object.create(null);
      pendingRequests = Object.create(null);
      window.addEventListener('online', online);
    },

    get: function IconRetriever_get(request) {
      var uid = request.uid = request.icon.getUID();

      // The easiest way to do this is:
      // 1. Add the new request to the pendingRequests always
      pendingRequests[uid] = request;
      pendingRequests[uid].icon = request.icon.descriptor.icon;

      // and 2. leave the retrieve method the reponsibility to move the
      // request to the other list if it must
      if (canBeDispatched(pendingRequests[uid])) {
        retrieve(uid);
      }
    }
  };

}());
