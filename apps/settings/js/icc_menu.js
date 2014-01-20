/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function() {
  var iccMainHeader = document.getElementById('icc-mainheader');
  var iccEntries = document.getElementById('icc-entries');

  function executeICCCmd(iccCommand) {
    if (!iccCommand)
      return;

    // Clear cache
    var reqIccData = window.navigator.mozSettings.createLock().set({
      'icc.data': null
    });
    reqIccData.onsuccess = function icc_getIccData() {
      DUMP('ICC Cache cleared');
    };

    // Open ICC section
    DUMP('ICC command to execute: ', iccCommand);
    Settings.currentPanel = '#icc';

    setTimeout(function() {
      var event = new CustomEvent('stkasynccommand', {
        detail: { 'command': iccCommand }
      });
      window.dispatchEvent(event);
    }, 2000);
  }

  setTimeout(function updateStkMenu() {
    DUMP('Showing STK main menu');
    // XXX https://bugzilla.mozilla.org/show_bug.cgi?id=844727
    // We should use Settings.settingsCache first
    var settings = Settings.mozSettings;
    var lock = settings.createLock();

    function showStkEntry(menu) {
      DUMP('STK cached menu: ', menu);
      if (!menu || typeof(menu) !== 'object' || Object.keys(menu).length == 0) {
        DUMP('No STK available - exit');
        iccMainHeader.hidden = true;
        iccEntries.hidden = true;
        return;
      }

      // Clean current entries
      iccEntries.innerHTML = '';
      iccMainHeader.hidden = true;
      iccEntries.hidden = true;

      // update and show the entry in settings
      Object.keys(menu).forEach(function(SIMNumber) {
        DUMP('STK Menu for SIM ' + SIMNumber +
          ' (' + menu[SIMNumber].iccId + ') - ', menu[SIMNumber].entries);

        var li = document.createElement('li');
        var small = document.createElement('small');
        small.textContent = 'SIM ' + SIMNumber;
        small.classList.add('menu-item-desc');
        li.appendChild(small);
        var a = document.createElement('a');
        a.textContent = menu[SIMNumber].entries.title;
        a.id = 'menuItem-icc-' + menu[SIMNumber].iccId;
        a.classList.add('menu-item');
        a.classList.add('menuItem-icc');
        a.href = '#icc';
        li.appendChild(a);

        iccEntries.appendChild(li);

        iccMainHeader.hidden = false;
        iccEntries.hidden = false;
      });
    }

    // Check if SIM card sends an Applications menu
    var reqApplications = lock.get('icc.applications');
    reqApplications.onsuccess = function icc_getApplications() {
      var json = reqApplications.result['icc.applications'];
      var menu = json && JSON.parse(json);
      showStkEntry(menu);
    };

    settings.addObserver('icc.applications',
      function icc_getApplications(event) {
        var json = event.settingValue;
        var menu = json && JSON.parse(json);
        showStkEntry(menu);
      });

    // Check if there are pending STK commands
    var reqIccData = lock.get('icc.data');
    reqIccData.onsuccess = function icc_getIccData() {
      var cmd = reqIccData.result['icc.data'];
      if (cmd) {
        DUMP('ICC async command (launcher)');
        executeICCCmd(JSON.parse(cmd));
      }
    };

    settings.addObserver('icc.data', function(event) {
      var value = event.settingValue;
      if (value) {
        DUMP('ICC async command while settings running: ', value);
        executeICCCmd(JSON.parse(value));
      }
    });
  });
})();

