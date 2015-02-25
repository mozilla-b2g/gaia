/* global _, debug, ConfigManager, Toolkit, SimManager */
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

  DATA_USAGE_WARNING: 0.8,

  allApps: null,

  allAppsLoaded: false,

  allNetworkInterfaces: null,

  allNetworkInterfaceLoaded: false,
  //XXX: Group of apps, whose traffic will be added to the system app.
  // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1079609
  specialApps: [
    'app://search.gaiamobile.org/manifest.webapp'
  ],

  SYSTEM_MANIFEST: 'app://system.gaiamobile.org/manifest.webapp',

  BROWSER_APP: {
    manifestURL: 'app://browser.gaiamobile.org/manifest.webapp',
    origin: '',
    manifest: {
      icons: {
        '84': '/shared/resources/branding/browser_84.png',
        '126': '/shared/resources/branding/browser_126.png',
        '142': '/shared/resources/branding/browser_142.png',
        '189': '/shared/resources/branding/browser_189.png',
        '284': '/shared/resources/branding/browser_284.png'
      },
      name: 'browser'
    }
  },

  startFTE: function(mode) {
    var iframe = document.getElementById('fte_view');

    window.addEventListener('message', function handler(e) {
      if (e.origin !== Common.COST_CONTROL_APP) {
        return;
      }

      if (e.data.type === 'fte_ready') {
        window.removeEventListener('message', handler);

        iframe.classList.remove('non-ready');

        // PERFORMANCE EVENTS
        // Designates that the app's *core* chrome or navigation interface
        // exists in the DOM and is marked as ready to be displayed.
        window.performance.mark('navigationLoaded');
        window.dispatchEvent(new CustomEvent('moz-chrome-dom-loaded'));

        // Designates that the app's *core* chrome or navigation interface
        // has its events bound and is ready for user interaction.
        window.performance.mark('navigationInteractive');
        window.dispatchEvent(new CustomEvent('moz-chrome-interactive'));

        // Designates that the app is visually loaded (e.g.: all of the
        // "above-the-fold" content exists in the DOM and is marked as
        // ready to be displayed).
        window.performance.mark('visuallyLoaded');
        window.dispatchEvent(new CustomEvent('moz-app-visually-complete'));

        // Designates that the app has its events bound for the minimum
        // set of functionality to allow the user to interact with the
        // "above-the-fold" content.
        window.performance.mark('contentInteractive');
        window.dispatchEvent(new CustomEvent('moz-content-interactive'));

        // Start up ended when FTE ready
        window.performance.mark('fullyLoaded');
        window.dispatchEvent(new CustomEvent('moz-app-loaded'));
      }
    });

    iframe.src = '/fte.html' + '#' + mode;
  },

  closeFTE: function() {
    var iframe = window.parent.document.getElementById('fte_view');
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
    return navigator.mozL10n.setAttributes;
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

  getDataSIMInterface: function _getDataSIMInterface(iccId) {
    if (!iccId) {
      console.warn('Undefined icc identifier, unable get data interface');
      return;
    }
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

  loadApps: function() {
    return new Promise(function(resolve, reject) {
      if (Common.allAppsLoaded) {
        resolve(Common.allApps);
        return;
      }

      var request = window.navigator.mozApps.mgmt.getAll();
      request.onsuccess = function(event) {
        var appList = event.target.result;
        // XXX : The data traffic of the filtered apps will be automatically
        // counted as residual data. This traffic is added to the system app
        // on the drawApps method located on "js/views/datausage.js"
        // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1084010#c0
        Common.allApps = appList.filter(function(app) {
          return Common.specialApps.indexOf(app.manifestURL) === -1;
        });
        Common.allApps.push(Common.BROWSER_APP);
        Common.allAppsLoaded = true;
        resolve(Common.allApps);
      };

      request.onerror = function() {
        reject(new Error('Apps could not be loaded'));
      };
    });
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

  getApp: function(manifestURL) {
    return this.allApps.find(function(app) {
      return app.manifestURL === manifestURL;
    });
  },

  getAppManifest: function(app) {
    return app.manifest || app.updateManifest;
  },

  getLocalizedAppName: function(app) {
    // If is System App returns label others
    if (app.manifestURL === Common.SYSTEM_MANIFEST) {
      return _('data-usage-other-apps');
    }
    // Browser app does not exist, we have to provide the localized app name
    if (app.manifestURL === Common.BROWSER_APP.manifestURL) {
      return _('data-usage-browser-app');
    }
    var manifest = this.getAppManifest(app);
    var userLang = document.documentElement.lang;
    var locales = manifest.locales;
    var localized = locales && locales[userLang] && locales[userLang].name;

    return localized || manifest.name;
  },

  getAppIcon: function(app) {
    var manifest = this.getAppManifest(app);
    var icons = manifest.icons;
    var defaultImage = '../style/images/app/icons/default.png';

    if (!icons || !Object.keys(icons).length) {
      return defaultImage;
    }

    // The preferred size is 30 by the default. If we use HDPI device, we may
    // use the image larger than 30 * 1.5 = 45 pixels.
    var preferredIconSize = 30 * (window.devicePixelRatio || 1);
    var preferredSize = Number.MAX_VALUE;
    var max = 0;

    for (var size in icons) {
      size = parseInt(size, 10);
      if (size > max) {
        max = size;
      }

      if (size >= preferredIconSize && size < preferredSize) {
        preferredSize = size;
      }
    }
    // If there is an icon matching the preferred size, we return the result,
    // if there isn't, we will return the maximum available size.
    if (preferredSize === Number.MAX_VALUE) {
      preferredSize = max;
    }

    var url = icons[preferredSize];
    if (url) {
      return !(/^(http|https|data):/.test(url)) ? app.origin + url : url;
    } else {
      return defaultImage;
    }
  },

  getDataLimit: function _getDataLimit(settings) {
    var multiplier = (settings.dataLimitUnit === 'MB') ?
                     1000000 : 1000000000;
    return settings.dataLimitValue * multiplier;
  },

  resetData: function _resetData(mode, onsuccess, onerror) {
    // Get all availabe Interfaces
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
    if (mode === 'all' || mode === 'mobile') {
      SimManager.requestDataSimIcc(function(dataSim) {
        var currentSimcardInterface = Common.getDataSIMInterface(dataSim.iccId);
        if (currentSimcardInterface) {
          mobileClearRequest = navigator.mozNetworkStats
            .clearStats(currentSimcardInterface);
          mobileClearRequest.onerror = getOnErrorFor('simcard');
          mobileClearRequest.onsuccess = function _restoreDataLimitAlarm() {
            ConfigManager.requestSettings(dataSim.iccId,
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
      });
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
      if (monthday !== nextReset.getDate()) {
        var LAST_DAY_OF_PREVIOUS_MONTH = 0;
        // If monthday is not equal to nextReset day, it means that the selected
        // reset day does not exist (e.g. 30 Feb). In this case, the reset day
        // must be the last day of the previous month
        nextReset.setDate(LAST_DAY_OF_PREVIOUS_MONTH);
      }

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
