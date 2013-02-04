/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function() {
  function executeICCCmd(iccCommand) {
    if (!iccCommand)
      return;

    // Open ICC section
    debug('ICC command to execute: ', iccCommand);
    var page = document.location.protocol + '//' +
      document.location.host + '/index.html#icc';
    debug('page: ', page);
    window.location.replace(page);

    setTimeout(function() {
      var event = new CustomEvent('stkasynccommand', {
        detail: { 'command': iccCommand }
      });
      window.dispatchEvent(event);
    });
  }

  setTimeout(function updateStkMenu() {
    debug('Showing STK main menu');
    var reqApplications =
      window.navigator.mozSettings.createLock().get('icc.applications');
    reqApplications.onsuccess = function icc_getApplications() {
      var json = reqApplications.result['icc.applications'];
      var menu = json && JSON.parse(json);
      if (!menu || !menu.items ||
        (menu.items.length == 1 && menu.items[0] === null)) {
        debug('No STK available - exit');
        document.getElementById('icc-mainheader').hidden = true;
        document.getElementById('icc-mainentry').hidden = true;
        return;
      }

      // Show the entry in settings
      document.getElementById('icc-mainheader').hidden = false;
      document.getElementById('icc-mainentry').hidden = false;

      debug('STK Main App Menu title: ' + menu.title);
      document.getElementById('menuItem-icc').textContent = menu.title;
    };

    var reqIccData = window.navigator.mozSettings.createLock().get('icc.data');
    reqIccData.onsuccess = function icc_getIccData() {
      var cmd = reqIccData.result['icc.data'];
      if (cmd) {
        debug('ICC async command (launcher)');
        executeICCCmd(JSON.parse(cmd));
      }
    }

    SettingsListener.observe('icc.data', null, function(value) {
      if(!value)
        return;

      debug('ICC async command while settings running: ', value);
      executeICCCmd(JSON.parse(value));
    });
  });
})();

