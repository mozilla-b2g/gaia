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
    window.asyncStorage.getItem('stkMainAppMenu', function(menu) {
      var iccMenuItem = document.getElementById('menuItem-icc');
      if (!menu) {
        debug('No STK available - hidding');
        iccMenuItem.classList.add('hidden');
        return;
      }

      debug('STK Main App Menu title: ' + menu.title);
      iccMenuItem.textContent = menu.title;
    });
  });
})();
