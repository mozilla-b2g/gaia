(function() {

  /* global marionetteScriptFinished */

  'use strict';

  /**
   * Take an app from a DOMRequest and serialize it to send back
   * to the client.
   * @return {Object} App representation.
   */
  function serialize(app) {
    return {
      installOrigin: app.installOrigin,
      installTime: app.installTime,
      // sync transfer of the entire manifest is slow so for now opt in to the
      // fields we actually need internally.
      manifest: {
        entry_points: app.manifest.entry_points
      },
      manifestURL: app.manifestURL,
      origin: app.origin,
      receipts: app.receipts
    };
  }


  var ObjectCache = window.wrappedJSObject.ObjectCache;

  var req = navigator.mozApps.getSelf();
  req.onsuccess = function(evt) {
    var app = evt.target.result;
    var id = ObjectCache._inst.set(app);
    var obj = serialize(app);
    obj._id = id;
    marionetteScriptFinished({ result: obj });
  };

  req.onerror = function(evt) {
    marionetteScriptFinished({ error: req.error.name });
  };
})();
