/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var debug = (function() {

  function debug() {
    var _debug = false;

    self = this;
    var settings = window.navigator.mozSettings;
    var reqGaiaDebug = settings.createLock().get('debug.gaia.enabled');
    reqGaiaDebug.onsuccess = function gaiaDebug() {
      self._debug = reqGaiaDebug.result['debug.gaia.enabled'];
    };
    settings.addObserver(
      'debug.gaia.enabled', function(event) {

      if (event.settingValue) {
        self.write('Enabling DEBUG');
      } else {
        self.write('Disabling DEBUG');
      }
      self._debug = event.settingValue;
    });
  }

  debug.prototype = {
    write: function(str) {
      str = '[Gaia DEBUG @ ' + document.location + ']: ' + str;
      if (dump) {
        return dump(str + '\n');
      }
      console.log(str);
    },

    trace: function(msg, optionalObject) {
      if (this._debug) {
        var output = msg;
        if (optionalObject) {
          output += ' '+JSON.stringify(optionalObject);
        }
        this.write(output);
      }
    }
  };

  return new debug();
}());
