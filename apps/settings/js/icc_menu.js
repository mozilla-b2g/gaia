/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function() {
  setTimeout(function updateStkMenu() {
    debug('Showing STK main menu');
    var reqApplications =
      window.navigator.mozSettings.createLock().get('icc.applications');
    reqApplications.onsuccess = function icc_getApplications() {
      var json = reqApplications.result['icc.applications'];
      var menu = json && JSON.parse(json);
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
