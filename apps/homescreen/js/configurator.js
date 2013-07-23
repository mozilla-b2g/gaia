
'use strict';

var Configurator = (function() {
  var conf = {};

  function load(file) {
    var xhr = new XMLHttpRequest();
    xhr.overrideMimeType('application/json');
    xhr.open('GET', file, true);
    xhr.send(null);

    xhr.onload = function _xhrOnLoad(evt) {
      try {
        conf = JSON.parse(xhr.responseText);
        startHomescreenByDefault();
      } catch (e) {
        conf = {};
        console.error('Failed parsing homescreen configuration file: ' + e);
        startHomescreenByDefault();
      }
    };

    xhr.onerror = function _xhrOnError(evt) {
      console.error('File not found: js/init.json');
      startHomescreenByDefault();
    };
  }

  function startHomescreenByDefault() {
    if (Homescreen) {
      Homescreen.init(0);
    }
  }

  // Auto-initializing
  load('js/init.json');

  return {
    getSection: function(section) {
      return conf[section];
    },

    load: load
  };
}());
