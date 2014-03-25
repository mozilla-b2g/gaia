/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/* global MobileOperator, uuid, dump */

/**
 * A simple ping that is kicked off on first time use
 */
var FtuPing = (function() {
  var DEBUG = false;

  var debug = DEBUG ? function(msg) {
    dump('[FtuPing] ' + msg + '\n');
  } : function() {};

  var FTU_PING_ACTIVATION         = 'ftu.pingActivation';
  var FTU_PING_ENABLED            = 'ftu.pingEnabled';
  var FTU_PING_ID                 = 'ftu.pingID';
  var FTU_PING_MAX_NETWORK_FAILS  = 'ftu.pingMaxNetworkFails';
  var FTU_PING_NETWORK_FAIL_COUNT = 'ftu.pingNetworkFailCount';
  var FTU_PING_URL                = 'ftu.pingURL';
  var FTU_PING_TIMEOUT            = 'ftu.pingTimeout';
  var FTU_PING_TRY_INTERVAL       = 'ftu.pingTryInterval';

  // whether or not required properties have been loaded
  var pingReady = false;
  var pingReadyCallback = null;

  // interval timer for first time ping
  var pingTimer = null;

  // time between ping tries
  var tryInterval = 60 * 60 * 1000;

  // URL for first time ping
  var pingURL = null;

  // Whether or not FTU ping is enabled
  var pingEnabled = true;

  // The number of times to wait for SIM / voice network data before sending
  // the ping anyway
  var maxNetworkFails = 24;

  // Number of network failures accrued
  var networkFailCount = 0;

  // Data used in ping
  var pingData = {};

  // Timeout for ping requests
  var pingTimeout = 60 * 1000;

  // Settings to observe value changes for while the ping has not been sent
  var observeSettings = ['deviceinfo.os',
                         'deviceinfo.software',
                         'deviceinfo.platform_build_id',
                         'deviceinfo.platform_version',
                         'deviceinfo.product_model',
                         'deviceinfo.firmware_revision',
                         'deviceinfo.hardware',
                         'deviceinfo.update_channel'];

  function reset() {
    pingReady = false;
    pingReadyCallback = null;
    pingTimer = null;
    tryInterval = 60 * 60 * 1000;
    pingTimeout = 60 * 1000;

    pingURL = null;
    pingEnabled = true;

    maxNetworkFails = 24;
    networkFailCount = 0;

    pingData = {};
  }

  function initSettings(callback) {
    reset();
    pingData.screenHeight = window.screen.height;
    pingData.screenWidth = window.screen.width;
    pingData.devicePixelRatio = window.devicePixelRatio;
    pingData.locale = window.navigator.language;

    getAsyncStorageItems([FTU_PING_ID, FTU_PING_ACTIVATION, FTU_PING_ENABLED,
                          FTU_PING_NETWORK_FAIL_COUNT], function(items) {

        pingData.pingID = items[FTU_PING_ID];
        pingData.activationTime = items[FTU_PING_ACTIVATION];
        pingEnabled = items[FTU_PING_ENABLED];

        if (!pingData.pingID) {
          pingData.pingID = uuid();
          window.asyncStorage.setItem(FTU_PING_ID, pingData.pingID);
        }

        if (!pingData.activationTime) {
          pingData.activationTime = Date.now();
          window.asyncStorage.setItem(FTU_PING_ACTIVATION,
                                      pingData.activationTime);
        }

        if (pingEnabled === null) {
          pingEnabled = true;
        }

        if (typeof(items[FTU_PING_NETWORK_FAIL_COUNT]) === 'number') {
          networkFailCount = items[FTU_PING_NETWORK_FAIL_COUNT];
        }

        var allSettings = [FTU_PING_URL, FTU_PING_TRY_INTERVAL,
                           FTU_PING_TIMEOUT, FTU_PING_MAX_NETWORK_FAILS].
                          concat(observeSettings);

        getSettings(allSettings, function(settings) {
          pingURL = settings[FTU_PING_URL];
          tryInterval = settings[FTU_PING_TRY_INTERVAL] || tryInterval;
          pingTimeout = settings[FTU_PING_TIMEOUT] || pingTimeout;
          maxNetworkFails = settings[FTU_PING_MAX_NETWORK_FAILS] ||
                            maxNetworkFails;

          var mozSettings = window.navigator.mozSettings;
          observeSettings.forEach(function(observeSetting) {
            pingData[observeSetting] = settings[observeSetting];
            mozSettings.addObserver(observeSetting, onSettingChanged);
          });

          if (callback) {
            callback();
          }
        });
    });
  }

  function getAsyncStorageItems(itemKeys, callback) {
    var itemsLeft = itemKeys.length;
    var items = {};
    itemKeys.forEach(function(key) {
      window.asyncStorage.getItem(key, function(value) {
        itemsLeft--;
        items[key] = value;
        if (itemsLeft === 0 && callback) {
          callback(items);
        }
      });
    });
  }

  function getSettings(settingKeys, callback) {
    var settingsLeft = settingKeys.length;
    var settings = {};
    var lock = window.navigator.mozSettings.createLock();
    settingKeys.forEach(function(key) {
      var request = lock.get(key);
      request.onsuccess = function(evt) {
        var value = request.result[key];
        settingsLeft--;
        settings[key] = value;
        if (settingsLeft === 0 && callback) {
          callback(settings);
        }
      };
    });
  }

  function ensurePing() {
    initSettings(function() {
      FtuPing.startPing();
    });
  }

  function onSettingChanged(evt) {
    pingData[evt.settingName] = evt.settingValue;
  }

  function startPing() {
    if (pingEnabled === false) {
      debug('FTU ping disabled');
      return;
    }

    if (!pingURL) {
      debug('No FTU ping URL');
      return;
    }
    if (pingTimer !== null) {
        return;
    }

    debug('Starting FTU ping');
    pingTimer = setInterval(tryPing, tryInterval);
  }

  function tryPing() {
    // Wait until we have a valid network connection
    var conns = window.navigator.mozMobileConnections;
    if (!conns || conns.length === 0) {
      networkFailCount++;
      window.asyncStorage.setItem(FTU_PING_NETWORK_FAIL_COUNT,
                                  networkFailCount);

      if (networkFailCount < maxNetworkFails) {
        debug('No mobile connections, holding off (' + networkFailCount +
              ' of ' + maxNetworkFails + ')');
        return false;
      }
    } else {
      var conn = conns[0];
      var iccObj = navigator.mozIccManager.getIccById(conn.iccId);
      var iccInfo = iccObj ? iccObj.iccInfo : null;
      var voiceNetwork = conn.voice ? conn.voice.network : null;

      if (!iccInfo && !voiceNetwork) {
        networkFailCount++;
        window.asyncStorage.setItem(FTU_PING_NETWORK_FAIL_COUNT,
                                    networkFailCount);

        if (networkFailCount < maxNetworkFails) {
          debug('No SIM card or voice network, holding off (' +
                networkFailCount + ' of ' + maxNetworkFails + ')');
          return false;
        }
      } else {
        pingData.network = MobileOperator.userFacingInfo(conn);
        if (voiceNetwork) {
          pingData.network.mnc = voiceNetwork.mnc;
          pingData.network.mcc = voiceNetwork.mcc;
        }

        if (iccInfo) {
          pingData.icc = {
            mnc: iccInfo.mnc,
            mcc: iccInfo.mcc,
            spn: iccInfo.spn
          };
        }
      }
    }

    if (networkFailCount >= maxNetworkFails) {
      debug('Max number of voice network failures reached, pinging anyway!');
      pingData.network = null;
      pingData.icc = null;
    }

    if (!pingData['deviceinfo.os']) {
      debug('No OS information, holding off');
      return false;
    }

    FtuPing.ping();
    return true;
  }

  function generatePingURL() {
    var version = pingData['deviceinfo.platform_version'] || 'unknown';
    var updateChannel = pingData['deviceinfo.update_channel'] || 'unknown';
    var buildId = pingData['deviceinfo.platform_build_id'] || 'unknown';

    var uriParts = [
      pingURL,
      'ftu',                             // 'reason'
      'FirefoxOS',                       // 'appName'
      encodeURIComponent(version),       // 'appVersion'
      encodeURIComponent(updateChannel), // 'appUpdateChannel'
      encodeURIComponent(buildId),       // 'appBuildID'
    ];

    return uriParts.join('/');
  }

  function ping() {
    var url = generatePingURL();
    pingData.pingTime = Date.now();

    debug(url);
    debug(JSON.stringify(pingData));

    var xhr = new XMLHttpRequest({ mozSystem: true, mozAnon: true });
    xhr.timeout = pingTimeout;

    xhr.onload = function() {
      FtuPing.pingSuccess(xhr.responseText);
    };

    xhr.ontimeout = function() {
      FtuPing.pingError('Timed out');
    };

    xhr.onerror = function() {
      FtuPing.pingError(xhr.statusText);
    };

    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-type', 'application/json');
    xhr.responseType = 'text';
    xhr.send(JSON.stringify(pingData));
  }

  function pingSuccess(result) {
    if (result !== 'OK') {
      debug('Ping response unexpected: ' + result);
      return;
    }

    pingEnabled = false;
    window.asyncStorage.setItem(FTU_PING_ENABLED, false);

    var settings = window.navigator.mozSettings;
    observeSettings.forEach(function(setting) {
      settings.removeObserver(setting, onSettingChanged);
    });

    clearInterval(pingTimer);
  }

  function pingError(message) {
    debug('Ping error: ' + message);
  }

  function isEnabled() {
    return pingEnabled;
  }

  function getPingURL() {
    return pingURL;
  }

  function getPingData() {
    return pingData;
  }

  function getNetworkFailCount() {
    return networkFailCount;
  }

  function getTryInterval() {
    return tryInterval;
  }

  function getPingTimeout() {
    return pingTimeout;
  }

  function getMaxNetworkFails() {
    return maxNetworkFails;
  }

  return {
    ensurePing: ensurePing,
    generatePingURL: generatePingURL,
    getAsyncStorageItems: getAsyncStorageItems,
    getMaxNetworkFails: getMaxNetworkFails,
    getNetworkFailCount: getNetworkFailCount,
    getPingData: getPingData,
    getPingTimeout: getPingTimeout,
    getPingURL: getPingURL,
    getSettings: getSettings,
    getTryInterval: getTryInterval,
    initSettings: initSettings,
    isEnabled: isEnabled,
    ping: ping,
    pingError: pingError,
    pingSuccess: pingSuccess,
    reset: reset,
    startPing: startPing,
    tryPing: tryPing,
  };
})();
