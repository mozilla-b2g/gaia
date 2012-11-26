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
      var iccMenuItem = document.getElementById('menuItem-icc');
      if (!menu) {
        debug('No STK available - exit');
        return;
      }

      debug('STK Main App Menu title: ' + menu.title);
      iccMenuItem.textContent = menu.title;

      // Show the entry in settings
      document.getElementById("icc-mainheader").classList.remove('hidden');
      document.getElementById("icc-mainentry").classList.remove('hidden');
    };
  });
})();
