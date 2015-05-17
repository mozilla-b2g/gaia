(function(name, value) {
  'use strict';

  var setting = {};
  setting[name] = value;
  var req = window.navigator.mozSettings.createLock().set(setting);
  req.onsuccess = function() {
    console.log('setting ' + name + 'changed');
    marionetteScriptFinished({ value: true });
  };
  req.onerror = function() {
    console.log('error changing setting', req.error.name);
    marionetteScriptFinished({ error: req.error.name });
  };

}.apply(this, arguments));
