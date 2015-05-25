(function() {
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

  var req = navigator.mozApps.mgmt.getAll();
  req.onsuccess = function(evt) {
    var result = evt.target.result;
    var apps = result.map(function(app) {
      var id = ObjectCache._inst.set(app);
      var obj = serialize(app);
      obj._id = id;
      return obj;
    });

    marionetteScriptFinished({ result: apps });
  };

  req.onerror = function(evt) {
    marionetteScriptFinished({ error: req.error.name });
  };
})();
