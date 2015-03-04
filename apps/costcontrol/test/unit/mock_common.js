/* global MockAllNetworkInterfaces, Common  */
/* exported MockCommon */
'use strict';

requireApp('costcontrol/test/unit/mock_all_network_interfaces.js');

var MockCommon = function(config) {

  config = config || {};

  var allInterfacesFake = MockAllNetworkInterfaces;

  return {
    COST_CONTROL_APP: 'app://costcontrol.gaiamobile.org',

    BROWSER_APP: {
      manifestURL: 'app://browser.gaiamobile.org/manifest.webapp',
      origin: '',
      manifest: {
        icons: {
          '84': '/shared/resources/branding/browser_84.png'
        },
        name: 'browser'
      }
    },

    SYSTEM_MANIFEST: 'app://system.gaiamobile.org/manifest.webapp',

    allNetworkInterfaces: {},
    localize: function (element, label, args) {
      element.textContent = label;
    },
    waitForDOMAndMessageHandler: function(window, callback) {
      callback();
    },
    startFTE: function(mode) {
      var iframe = document.getElementById('fte_view');
      iframe.classList.remove('non-ready');
      if (config && config.activateFTEListener) {
        window.addEventListener('dataSlotChange', function _onDataSimChange() {
          window.removeEventListener('dataSlotChange', _onDataSimChange);
          // Close FTE if change the SimCard for data connections
          Common.closeFTE();
        });
      }
      var event = new CustomEvent('ftestarted', { detail: mode });
      window.dispatchEvent(event);
    },
    closeFTE: function() {
      var iframe = document.getElementById('fte_view');
      iframe.classList.add('non-ready');
      var event = new CustomEvent('fteClosed');
      window.dispatchEvent(event);
    },
    startApp: function() {
      var event = new CustomEvent('appstarted');
      window.dispatchEvent(event);
    },
    closeApplication: function() {
      var event = new CustomEvent('appclosed');
      window.dispatchEvent(event);
    },
    modalAlert: function(msg) {
      var event = new CustomEvent('fakealert', { detail: msg });
      window.dispatchEvent(event);
      console.log('Alert: ' + msg);
    },
    getDataSIMInterface: function getDataSIMInterface(iccId) {
      var dataSimCard = allInterfacesFake[1];
      return dataSimCard;
    },
    getWifiInterface: function() {
      var wifiInterface = allInterfacesFake[0];
      return wifiInterface;
    },
    loadNetworkInterfaces: function(onsuccess, onerror) {
      setTimeout(function() {
        Common.allNetworkInterfaces = allInterfacesFake;
        (typeof onsuccess === 'function') && onsuccess();
      }, 0);
    },
    loadDataSIMIccId: function(onsuccess, onerror) {
      setTimeout(function() {
        Common.dataSimIccId = allInterfacesFake[1].id;
        if (typeof onsuccess === 'function') {
          onsuccess(Common.dataSimIccId);
        }
      }, 0);
    },
    localizeWeekdaySelector: function _localizeWeekdaySelector(selector) {
      var weekStartsOnMonday =
        !!parseInt(navigator.mozL10n.get('weekStartsOnMonday'), 10);

      var monday = selector.querySelector('.monday');
      var sunday = selector.querySelector('.sunday');
      var list = monday.parentNode;
      if (weekStartsOnMonday) {
        list.insertBefore(monday, list.childNodes[0]); // monday is the first
        list.appendChild(sunday); // sunday is the last
      } else {
        list.insertBefore(sunday, list.childNodes[0]); // sunday is the first
        list.insertBefore(monday, sunday.nextSibling); // monday is the second
      }
    },
    getDataLimit: function _getDataLimit(settings) {
      var multiplier = (settings.dataLimitUnit === 'MB') ?
                       1000000 : 1000000000;
      return settings.dataLimitValue * multiplier;
    },
    updateNextReset: function() {},
    resetData : function() {}
  };
};
