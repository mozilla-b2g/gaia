/* global _, debug, ConfigManager, Toolkit  */
/* exported addAlarmTimeout, setNextReset, addNetworkUsageAlarm,
            getTopUpTimeout, Common, sendBalanceThresholdNotification
*/
'use strict';

function addAlarmTimeout(type, delay) {
  var handlerContainer = document.getElementById('message-handler');
  return handlerContainer.contentWindow.addAlarmTimeout(type, delay);
}

function setNextReset(when, callback) {
  var handlerContainer = document.getElementById('message-handler');
  return handlerContainer ?
         handlerContainer.contentWindow.setNextReset(when, callback) :
         window.setNextReset(when, callback);
}

function getTopUpTimeout(callback) {
  var handlerContainer = document.getElementById('message-handler');
  return handlerContainer ?
         handlerContainer.contentWindow.getTopUpTimeout(callback) :
         window.getTopUpTimeout(callback);
}

function addNetworkUsageAlarm(dataInterface, dataLimit, callback) {
  var handlerContainer = document.getElementById('message-handler');
  if (handlerContainer) {
    handlerContainer.contentWindow
      .addNetworkUsageAlarm(dataInterface, dataLimit, callback);
  } else {
    window.addNetworkUsageAlarm(dataInterface, dataLimit, callback);
  }
}

function sendBalanceThresholdNotification(remaining, settings, callback) {
  var handlerContainer = document.getElementById('message-handler');
  if (handlerContainer) {
    handlerContainer.contentWindow
      .sendBalanceThresholdNotification(remaining, settings, callback);
  }
}

function resetTelephony(callback) {
  ConfigManager.setOption({
    lastTelephonyReset: new Date(),
    lastTelephonyActivity: {
      calltime: 0,
      smscount: 0,
      timestamp: new Date()
    }
  }, callback);
}

var Common = {

  COST_CONTROL_APP: 'app://costcontrol.gaiamobile.org',

  allNetworkInterfaces: {},

  dataSimIccId: null,

  allNetworkInterfaceLoaded: false,

  dataSimIccIdLoaded: false,

  dataSimIcc: null,

  startFTE: function(mode) {
    var iframe = document.getElementById('fte_view');

    window.addEventListener('message', function handler(e) {
      if (e.origin !== Common.COST_CONTROL_APP) {
        return;
      }

      if (e.data.type === 'fte_ready') {
        window.removeEventListener('message', handler);

        iframe.classList.remove('non-ready');
      }
    });

    iframe.src = '/fte.html' + '#' + mode;
  },

  closeFTE: function() {
    var iframe = document.getElementById('fte_view');
    iframe.classList.add('non-ready');
    iframe.src = '';
  },

  startApp: function() {
    parent.postMessage({
      type: 'fte_finished',
      data: ''
    }, Common.COST_CONTROL_APP);
  },

  closeApplication: function() {
    return setTimeout(function _close() {
      debug('Closing.');
      window.close();
    });
  },

  modalAlert: function(message) {
    alert(message);
  },

  get localize() {
    return navigator.mozL10n.localize;
  },

  getIccInfo: function _getIccInfo(iccId) {
    if (!iccId) {
      return undefined;
    }
    var iccManager = window.navigator.mozIccManager;
    var iccInfo = iccManager.getIccById(iccId);
    if (!iccInfo) {
      console.error('Unrecognized iccID: ' + iccId);
      return undefined;
    }
    return iccInfo;
  },

  // Returns whether exists an nsIDOMNetworkStatsInterfaces object
  // that meet the argument function criteria
  getInterface: function getInterface(findFunction) {
    if (!Common.allNetworkInterfaceLoaded) {
      debug('Network interfaces are not ready yet');
      var header = _('data-usage');
      var msg = _('loading-interface-data');
      this.modalAlert(header + '\n' + msg);
      return;
    }

    if (Common.allNetworkInterfaces) {
      return Common.allNetworkInterfaces.find(findFunction);
    }
  },

  getDataSIMInterface: function _getDataSIMInterface() {
    if (!this.dataSimIccIdLoaded) {
      console.warn('Data simcard is not ready yet');
      return;
    }

    var iccId = this.dataSimIccId;
    if (iccId) {
      var findCurrentInterface = function(networkInterface) {
        if (networkInterface.id === iccId) {
          return networkInterface;
        }
      };
      return this.getInterface(findCurrentInterface);
    }
    return undefined;
  },

  getWifiInterface: function _getWifiInterface() {
    var findWifiInterface = function(networkInterface) {
      if (networkInterface.type === navigator.mozNetworkStats.WIFI) {
        return networkInterface;
      }
    };
    return this.getInterface(findWifiInterface);
  },

  loadNetworkInterfaces: function(onsuccess, onerror) {
    var networks = navigator.mozNetworkStats.getAvailableNetworks();

    networks.onsuccess = function() {
      Common.allNetworkInterfaces = networks.result;
      Common.allNetworkInterfaceLoaded = true;
      if (onsuccess) {
        onsuccess();
      }
    };

    networks.onerror = function() {
      console.error('Error when trying to load network interfaces');
      if (onerror) {
        onerror();
      }
    };
  },

  loadDataSIMIccId: function _loadDataSIMIccId(onsuccess, onerror) {
    var settings = navigator.mozSettings,
        mobileConnections = navigator.mozMobileConnections,
        dataSlotId = 0;
    var req = settings &&
              settings.createLock().get('ril.data.defaultServiceId');

    req.onsuccess = function _onsuccesSlotId() {
      dataSlotId = req.result['ril.data.defaultServiceId'] || 0;
      var mobileConnection = mobileConnections[dataSlotId];
      var iccId = mobileConnection.iccId || null;
      if (!iccId) {
        console.error('The slot ' + dataSlotId +
                   ', configured as the data slot, is empty');
        (typeof onerror === 'function') && onerror();
        return;
      }
      Common.dataSimIccId = iccId;
      Common.dataSimIccIdLoaded = true;
      Common.dataSimIcc = Common.getIccInfo(iccId);
      if (!Common.dataSimIcc) {
        (typeof onerror === 'function') && onerror();
      }
      if (onsuccess) {
        onsuccess(iccId);
      }
    };

    req.onerror = function _onerrorSlotId() {
      console.warn('ril.data.defaultServiceId does not exists');
      var iccId = null;

      // Load the fist slot with iccId
      for (var i = 0; i < mobileConnections.length && !iccId; i++) {
        if (mobileConnections[i]) {
          iccId = mobileConnections[i].iccId;
        }
      }
      if (!iccId) {
        console.error('No SIM in the device');
        (typeof onerror === 'function') && onerror();
        return;
      }

      Common.dataSimIccId = iccId;
      Common.dataSimIccIdLoaded = true;
      Common.dataSimIcc = Common.getIccInfo(iccId);
      if (onsuccess) {
        onsuccess(iccId);
      }
    };
  },

  getDataLimit: function _getDataLimit(settings) {
    var multiplier = (settings.dataLimitUnit === 'MB') ?
                     1000000 : 1000000000;
    return settings.dataLimitValue * multiplier;
  },

  resetData: function _resetData(mode, onsuccess, onerror) {
    // Get all availabe Interfaces
    var currentSimcardInterface = Common.getDataSIMInterface();
    var wifiInterface = Common.getWifiInterface();

    // Ask reset for all available Interfaces
    var wifiClearRequest, mobileClearRequest;

    // onerror callback builder
    var getOnErrorFor = function(networkInterface) {
      return function() {
        if (wifiClearRequest) {
          wifiClearRequest.onerror = undefined;
        }
        if (mobileClearRequest) {
          mobileClearRequest.onerror = undefined;
        }
        (typeof onerror === 'function') && onerror(networkInterface);
      };
    };
    if ((mode === 'all' || mode === 'wifi') && wifiInterface) {
      wifiClearRequest = navigator.mozNetworkStats.clearStats(wifiInterface);
      wifiClearRequest.onerror = getOnErrorFor('wi-Fi');
    }
    if ((mode === 'all' || mode === 'mobile') && currentSimcardInterface) {
      mobileClearRequest = navigator.mozNetworkStats
        .clearStats(currentSimcardInterface);
      mobileClearRequest.onerror = getOnErrorFor('simcard');
      mobileClearRequest.onsuccess = function _restoreDataLimitAlarm() {
        ConfigManager.requestSettings(Common.dataSimIccId,
                                      function _onSettings(settings) {
          if (settings.dataLimit) {
            // Restore network alarm
            addNetworkUsageAlarm(currentSimcardInterface,
                                 Common.getDataLimit(settings),
              function _addNetworkUsageAlarmOK() {
                ConfigManager.setOption({ 'dataUsageNotified': false });
              });
          }
        });
      };
    }

      // Set last Reset
    if (mode === 'all') {
      ConfigManager.setOption({ lastCompleteDataReset: new Date() });
    } else {
      // Else clausure prevents running the update event twice
      ConfigManager.setOption({ lastDataReset: new Date() });
    }

    // call onsuccess
    if (typeof onsuccess === 'function') {
      onsuccess();
    }
  },

  resetAll: function _resetAll(callback) {
    function logResetDataError(networkInterface) {
      console.log('Error when trying to reset ' + networkInterface +
                  ' interface');
    }

    Common.resetData('all', thenResetTelephony, logResetDataError);

    function thenResetTelephony() {
      resetTelephony(callback);
    }
  },

  // Next automatic reset date based on user preferences
  updateNextReset: function _updateNextReset(trackingPeriod, value, callback) {
    if (trackingPeriod === 'never') {
      setNextReset(null, callback); // remove any alarm
      return;
    }

    var nextReset, today = new Date();

    // Recalculate with month period
    if (trackingPeriod === 'monthly') {
      var month, year;
      var monthday = parseInt(value, 10);
      month = today.getMonth();
      year = today.getFullYear();
      if (today.getDate() >= monthday) {
        month = (month + 1) % 12;
        if (month === 0) {
          year++;
        }
      }
      nextReset = new Date(year, month, monthday);

    // Recalculate with week period
    } else if (trackingPeriod === 'weekly') {
      var oneDay = 24 * 60 * 60 * 1000;
      var weekday = parseInt(value, 10);
      var daysToTarget = weekday - today.getDay();
      if (daysToTarget <= 0) {
        daysToTarget = 7 + daysToTarget;
      }
      nextReset = new Date();
      nextReset.setTime(nextReset.getTime() + oneDay * daysToTarget);
      Toolkit.toMidnight(nextReset);
    }

    // remove oldAlarm and set the new one
    setNextReset(nextReset, callback);
  },

  localizeWeekdaySelector: function _localizeWeekdaySelector(selector) {
    var weekStartsOnMonday =
      !!parseInt(navigator.mozL10n.get('weekStartsOnMonday'), 10);
    debug('Week starts on monday?', weekStartsOnMonday);
    var monday = selector.querySelector('.monday');
    var sunday = selector.querySelector('.sunday');
    var list = monday.parentNode;
    if (weekStartsOnMonday) {
      debug('Monday, Tuesday...');
      list.insertBefore(monday, list.childNodes[0]); // monday is the first
      list.appendChild(sunday); // sunday is the last
    } else {
      debug('Sunday, Monday...');
      list.insertBefore(sunday, list.childNodes[0]); // sunday is the first
      list.insertBefore(monday, sunday.nextSibling); // monday is the second
    }
  }
};
