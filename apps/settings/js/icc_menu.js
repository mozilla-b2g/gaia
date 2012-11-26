/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function() {
  /**
   * Constants
   */
  var DEBUG = false;

  /**
   * Debug method
   */
  function debug(msg, optObject) {
    if (DEBUG) {
      var output = '[DEBUG] STKMAINMENU: ' + msg;
      if (optObject) {
        output += JSON.stringify(optObject);
      }
      console.log(output);
    }
  }

  setTimeout(function updateStkMenu() {
    debug('Showing STK main menu');
    var settings = window.navigator.mozSettings;
    var lock = settings.createLock();
    var reqStkMainAppMenu = lock.get('icc.stkMainAppMenu');
    reqStkMainAppMenu.onsuccess = function icc_getStkMainAppMenu() {
      var menu = JSON.parse(reqStkMainAppMenu.result['icc.stkMainAppMenu']);
      if (!menu) {
        debug('No STK available - exit');
        return;
      }

      // Show the entry in settings
      document.getElementById('icc-mainheader').hidden = false;
      document.getElementById('icc-mainentry').hidden = false;

      debug('STK Main App Menu title: ' + menu.title);
      document.getElementById('menuItem-icc').textContent = menu.title;
    };
  });
})();
