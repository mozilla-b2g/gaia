/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function() {
  function executeICCCmd(iccCommand) {
    if (!iccCommand)
      return;

    // Clear cache
    var reqIccData = window.navigator.mozSettings.createLock().set({
      'icc.data': null
    });
    reqIccData.onsuccess = function icc_getIccData() {
      debug('ICC Cache cleared');
    };

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
    }, 2000);
  }

  setTimeout(function updateStkMenu() {
    debug('Showing STK main menu');
    // XXX https://bugzilla.mozilla.org/show_bug.cgi?id=844727
    // We should use Settings.settingsCache first
    var settings = Settings.mozSettings;
    var lock = settings.createLock();

    var reqApplications = lock.get('icc.applications');
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

      // update and show the entry in settings
      debug('STK Main App Menu title: ' + menu.title);
      document.getElementById('menuItem-icc').textContent = menu.title;
      document.getElementById('icc-mainheader').hidden = false;
      document.getElementById('icc-mainentry').hidden = false;
    };

    var reqIccData = lock.get('icc.data');
    reqIccData.onsuccess = function icc_getIccData() {
      var cmd = reqIccData.result['icc.data'];
      if (cmd) {
        debug('ICC async command (launcher)');
        executeICCCmd(JSON.parse(cmd));
      }
    };

    settings.addObserver('icc.data', function(event) {
      var value = event.settingValue;
      if (value) {
        debug('ICC async command while settings running: ', value);
        executeICCCmd(JSON.parse(value));
      }
    });
  });
})();

