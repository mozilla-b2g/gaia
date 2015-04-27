define(function(require) {
  'use strict';

  var STKHelper = require('shared/stk_helper');

  function STKItem(elements) {
    this._elements = elements;
    this.init();
  }

  STKItem.prototype.init = function() {
    var iccLoaded = false;
    var self = this;
    function loadIccPage(callback) {
      callback = (typeof callback === 'function') ? callback : function() {};
      if (iccLoaded) {
        return callback();
      }
      Settings.currentPanel = '#icc';
      window.addEventListener('iccPageLoaded',
        function oniccPageLoaded(event) {
          iccLoaded = true;
          callback();
        });
    }

    function executeIccCmd(iccMessage) {
      if (!iccMessage) {
        return;
      }

      // Clear cache
      var reqIccData = window.navigator.mozSettings.createLock().set({
        'icc.data': null
      });
      reqIccData.onsuccess = function icc_getIccData() {
        window.DUMP('ICC Cache cleared');
      };

      // Open ICC section
      window.DUMP('ICC message to execute: ', iccMessage);
      loadIccPage(function() {
        var event = new CustomEvent('stkasynccommand', {
          detail: { 'message': iccMessage }
        });
        window.dispatchEvent(event);
      });
    }

    setTimeout(function updateStkMenu() {
      window.DUMP('Showing STK main menu');
      // XXX https://bugzilla.mozilla.org/show_bug.cgi?id=844727
      // We should use Settings.settingsCache first
      var settings = Settings.mozSettings;
      var lock = settings.createLock();

      function showStkEntries(menu) {
        window.DUMP('STK cached menu: ', menu);
        if (!menu || typeof menu !== 'object' ||
          Object.keys(menu).length === 0) {
            window.DUMP('No STK available - exit');
            self._elements.iccMainHeader.hidden = true;
            self._elements.iccEntries.hidden = true;
            return;
        }

        // Clean current entries
        self._elements.iccEntries.innerHTML = '';
        self._elements.iccMainHeader.hidden = true;
        self._elements.iccEntries.hidden = true;

        // update and show the entry in settings
        Object.keys(menu).forEach(function(SIMNumber) {
          window.DUMP('STK Menu for SIM ' + SIMNumber +
            ' (' + menu[SIMNumber].iccId + ') - ', menu[SIMNumber].entries);

          var li = document.createElement('li');
          var a = document.createElement('a');
          var menuItem = menu[SIMNumber].entries;
          var icon = STKHelper.getFirstIconRawData(menuItem);

          a.id = 'menuItem-icc-' + menu[SIMNumber].iccId;
          a.className = 'menu-item menuItem-icc';
          a.href = '#icc';
          if (icon) {
            var iconContainer = document.createElement('span');
            iconContainer.appendChild(STKHelper.getIconCanvas(icon));
            li.appendChild(iconContainer);
            self._elements.iccEntries.dataset.customIcon = true;
          } else {
            a.dataset.icon = 'sim-toolkit';
          }
          a.onclick = function menu_icc_onclick() {
            window.DUMP('Touched ' + menu[SIMNumber].iccId);
            loadIccPage(function() {
              var event = new CustomEvent('stkmenuselection', {
                detail: { 'menu': menu[SIMNumber] }
              });
              window.dispatchEvent(event);
            });
          };

          var span = document.createElement('span');
          span.textContent = menu[SIMNumber].entries.title;
          a.appendChild(span);

          if (Object.keys(menu).length > 1) {
            var small = document.createElement('small');
            small.setAttribute('data-l10n-id', 'sim' + SIMNumber);
            small.classList.add('menu-item-desc');
            a.appendChild(small);
          }

          li.appendChild(a);
          self._elements.iccEntries.appendChild(li);

          self._elements.iccMainHeader.hidden = false;
          self._elements.iccEntries.hidden = false;
        });
      }

      // Check if SIM card sends an Applications menu
      var reqApplications = lock.get('icc.applications');
      reqApplications.onsuccess = function icc_getApplications() {
        var json = reqApplications.result['icc.applications'];
        var menu = json && JSON.parse(json);
        showStkEntries(menu);
      };

      settings.addObserver('icc.applications',
        function icc_getApplications(event) {
          var json = event.settingValue;
          var menu = json && JSON.parse(json);
          showStkEntries(menu);
        });

      // Check if there are pending STK commands
      var reqIccData = lock.get('icc.data');
      reqIccData.onsuccess = function icc_getIccData() {
        var cmd = reqIccData.result['icc.data'];
        if (cmd) {
          window.DUMP('ICC async command (launcher)');
          executeIccCmd(JSON.parse(cmd));
        }
      };

      settings.addObserver('icc.data', function(event) {
        var value = event.settingValue;
        if (value) {
          window.DUMP('ICC async command while settings running: ', value);
          executeIccCmd(JSON.parse(value));
        }
      });
    }.bind(this));
  };

  return function ctor_stk_item(elements) {
    return new STKItem(elements); 
  };
});
