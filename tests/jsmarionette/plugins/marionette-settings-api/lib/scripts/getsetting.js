(function(name) {
  'use strict';

  var req = window.navigator.mozSettings.createLock().get(name);
  req.onsuccess = function() {
    console.log('setting retrieved');
    var result = name === '*' ? req.result : req.result[name];
    marionetteScriptFinished({ value: result });
  };
  req.onerror = function() {
    console.log('error getting setting', req.error.name);
    marionetteScriptFinished({ error: req.error.name });
  };

}.apply(this, arguments));
