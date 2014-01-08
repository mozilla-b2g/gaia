
/*
 * CostControl is the singleton in charge of provide data to the views by using
 * asynchronous requests. Views get the object by calling
 * CostControl.getInstance() method.
 *
 * The CostControl instance has allow to perform requests:
 * balance, topup, telephony, datausage
 *
 * And get the application mode:
 * DATA_USAGE_ONLY, PREPAID; POSTPAID
 *
 */

var CostControl = (function() {
  'use strict';

  var costcontrol;
  function getInstance(onready) {
    debug('Initializing Cost Control');

    if (costcontrol) {
      debug('Cost Control already ready!');
      onready(costcontrol);
      return;
    }

    function setupCostControl() {
      costcontrol = {
        request: request,
        isBalanceRequestSMS: isBalanceRequestSMS,
        getDataUsageWarning: function _getDataUsageWarning() {
          return 0.8;
        }
      };

      debug('Cost Control ready!');
      onready(costcontrol);
    }

    loadAPIs();
    ConfigManager.requestAll(setupCostControl);
  }

  var mobileMessageManager, connection, telephony, statistics;
  function loadAPIs() {
    if ('mozMobileMessage' in window.navigator) {
      mobileMessageManager = window.navigator.mozMobileMessage;
    }

    if ('mozMobileConnection' in window.navigator) {
      connection = window.navigator.mozMobileConnection;
    }
    // XXX: check bug-926169
    // this is used to keep all tests passing while introducing multi-sim APIs
    else if ('mozMobileConnections' in window.navigator) {
      connection = window.navigator.mozMobileConnections[0];
    }

    if ('mozNetworkStats' in window.navigator) {
      statistics = NetworkstatsProxy;
    }

    debug('APIs loaded!');
  }

  // OTHER LOGIC

  // Check if a SMS matches the form of a balance request
  function isBalanceRequestSMS(message, configuration) {
    return message.receiver === configuration.balance.destination;
  }

  // Perform a request. They must be specified via a request object with:
  // type: datausage, balance, topup or telephony
  // data: in case of topup, the code for topup
  //
  // In a nutshell, request() method check if there are some service issues or
  // another operation in progress and, if not, dispatch the request to another
  // specific handler.
  function request(requestObj, callback) {
    ConfigManager.requestAll(function _onInfo(configuration, settings) {
      debug('Request for:', requestObj.type);

      var force = requestObj.force;
      var result = {};

      // Only type is set here
      result.type = requestObj.type;

      switch (requestObj.type) {
        case 'balance':
          // Check service
          var issues = getServiceIssues(configuration, settings);
          var canBeIgnoredByForcing = (issues === 'minimum_delay' && force);
          if (issues && !canBeIgnoredByForcing) {
            result.status = 'error';
            result.details = issues;
            result.data = settings.lastBalance;
            if (callback) {
              callback(result);
            }
            return;
          }

          var costIssues = getCostIssues(configuration);
          if (!force && costIssues) {
            result.status = 'error';
            result.details = costIssues;
            result.data = settings.lastBalance;
            if (callback) {
              callback(result);
            }
            return;
          }

          // Check in-progress
          var isWaiting = settings.waitingForBalance !== null;
          var timeout = Toolkit.checkEnoughDelay(BALANCE_TIMEOUT,
                                                 settings.lastBalanceRequest);
          if (isWaiting && !timeout) {
            result.status = 'in_progress';
            result.data = settings.lastBalance;
            if (callback) {
              callback(result);
            }
            return;
          }

          // Dispatch
          requestBalance(configuration, settings, callback, result);
          break;

        case 'topup':
          // Check service
          var issues = getServiceIssues(configuration, settings);
          if (issues && issues !== 'minimum_delay') {
            result.status = 'error';
            result.details = issues;
            result.data = settings.lastDataUsage;
            if (callback) {
              callback(result);
            }
            return;
          }

          var costIssues = getCostIssues(configuration);
          if (!force && costIssues) {
            result.status = 'error';
            result.details = costIssues;
            result.data = settings.lastBalance;
            if (callback) {
              callback(result);
            }
            return;
          }

          // Check in-progress
          var isWaiting = settings.waitingForTopUp !== null;
          var timeout = Toolkit.checkEnoughDelay(BALANCE_TIMEOUT,
                                                 settings.lastTopUpRequest);
          if (isWaiting && !timeout && !force) {
            result.status = 'in_progress';
            result.data = settings.lastDataUsage;
            if (callback) {
              callback(result);
            }
            return;
          }

          // Dispatch
          var code = requestObj.data;
          requestTopUp(configuration, settings, code, callback, result);
          break;

        case 'datausage':
          // Dispatch
          requestDataStatistics(configuration, settings, callback, result);
          break;

        case 'telephony':
          // Can not fail: only dispatch
          result.data = settings.lastTelephonyActivity;
          result.status = 'success';
          if (callback) {
            callback(result);
          }
          break;
      }
      return;
    });
  }

  // Check service status and return the most representative issue if there is
  function getServiceIssues(configuration, settings) {
    if (airplaneMode) {
      return 'airplane_mode';
    }

    if (!connection || !connection.voice || !connection.data) {
      return 'no_service';
    }

    var mode = ConfigManager.getApplicationMode();
    if (mode !== 'PREPAID') {
      return 'no_service';
    }

    var voice = connection.voice;
    if (!voice.connected) {
      return 'no_service';
    }

    if (voice.relSignalStrength === null) {
      return 'no_coverage';
    }

    if (configuration.balance.minimum_delay) {
      var isMinimumDelayHonored = Toolkit.checkEnoughDelay(
        configuration.balance.minimum_delay,
        settings.lastBalanceRequest
      );
      if (!isMinimumDelayHonored) {
        return 'minimum_delay';
      }
    }

    return '';
  }

  // Check cost issues and return
  function getCostIssues(configuration) {
    var inRoaming = connection.voice.roaming;
    if (inRoaming && configuration.is_roaming_free !== true) {
      return 'non_free_in_roaming';
    }

    if (!inRoaming && configuration.is_free !== true) {
      return 'non_free';
    }

    return '';
  }

  // Send a request SMS and set timeouts for interrupting waiting for response
  var BALANCE_TIMEOUT = 5 * 60 * 1000; // Should be 5 min
  function requestBalance(configuration, settings, callback, result) {
    debug('Requesting balance...');
    result.data = settings.lastBalance;

    // Send request SMS
    var newSMS = mobileMessageManager.send(
      configuration.balance.destination,
      configuration.balance.text
    );

    newSMS.onsuccess = function _onSuccess() {
      debug('Request SMS sent! Waiting for response.');

      // Add the timeout
      var newAlarm = addAlarmTimeout('balanceTimeout', BALANCE_TIMEOUT);

      newAlarm.onsuccess = function _alarmSet(evt) {
        var id = evt.target.result;
        debug('Timeout for balance (', id, ') update set to:', BALANCE_TIMEOUT);

        ConfigManager.setOption(
          {
            'waitingForBalance': id,
            'lastBalanceRequest': new Date()
          },
          function _onSet() {
            result.status = 'success';
            if (callback) {
              callback(result);
            }
          }
        );
      };

      newAlarm.onerror = function _alarmFailedToSet(evt) {
        debug('Failed to set timeout for balance request!');
        result.status = 'error';
        result.details = 'timout_fail';
        if (callback) {
          callback(result);
        }
      };
    };

    newSMS.onerror = function _onError() {
      debug('Request SMS failed! But returning stored balance.');
      result.status = 'error';
      result.details = 'request_fail';
      if (callback) {
        callback(result);
      }
    };

    debug('Balance out of date. Requesting fresh data...');
  }

  // Send a top up SMS and set timeouts for interrupting waiting for response
  var TOPUP_TIMEOUT = 5 * 60 * 1000; // Should be 5 min
  function requestTopUp(configuration, settings, code, callback, result) {
    debug('Requesting TopUp with code', code, '...');

    // TODO: Ensure is free
    var newSMS = mobileMessageManager.send(
      configuration.topup.destination,
      configuration.topup.text.replace(/\&code/g, code)
    );

    newSMS.onsuccess = function _onSuccess() {
      debug('TopUp SMS sent! Waiting for response.');

      // Add the timeout (if fail, do not inform the callback)
      var newAlarm = addAlarmTimeout('topupTimeout', TOPUP_TIMEOUT);

      newAlarm.onsuccess = function _alarmSet(evt) {
        var id = evt.target.result;
        debug('Timeout for TopUp (', id, ') update set to:', TOPUP_TIMEOUT);

        // XXX: waitingForTopUp can be null if no waiting or distinct
        // than null to indicate the unique id of the timeout waiting
        // for the response message
        ConfigManager.setOption(
          {
            'waitingForTopUp': id,
            'lastTopUpRequest': new Date()
          },
          function _onSet() {
            result.status = 'success';
            if (callback) {
              callback(result);
            }
          }
        );
      };

      newAlarm.onerror = function _alarmFailedToSet(evt) {
        debug('Failed to set timeout for TopUp request!');
        result.status = 'error';
        result.details = 'timeout_fail';
        if (callback) {
          callback(result);
        }
      };
    };

    newSMS.onerror = function _onError() {
      debug('TopUp SMS failed!');
      result.status = 'error';
      result.details = 'request_fail';
      if (callback) {
        callback(result);
      }
    };
  }

  // XXX: pending on bug XXX to get statistics by SIM
  // Ask statistics API for mobile and wifi data usage
  var DAY = 24 * 3600 * 1000; // 1 day
  function requestDataStatistics(configuration, settings, callback, result) {
    debug('Statistics out of date. Requesting fresh data...');

    var maxAge = statistics.sampleRate * 1000 * statistics.maxStorageSamples;
    var minimumStart = new Date(Date.now() - maxAge);
    debug('The max age for samples is ' + minimumStart);

    // If settings.lastCompleteDataReset is not set let's use the past week.
    // This is only for not breaking dogfooders build and this can be remove at
    // some point in the future (and since this sentence has been said multiple
    // times this code will probably stay here for a while).
    var start = new Date(settings.lastCompleteDataReset ||
                         Date.now() - 7 * DAY);
    if (start < minimumStart) {
      console.warn('Start date is surpassing the maximum age for the ' +
                   'samples. Setting to ' + minimumStart);
      start = minimumStart;
    }
    start = toMidnight(start);

    var today = toMidnight(new Date());

    var tomorrow = new Date();
    tomorrow.setTime(today.getTime() + DAY);

    var end = toMidnight(settings.nextReset ?
                         new Date(settings.nextReset.getTime() - DAY) :
                         tomorrow);

    if (start > end) {
      console.error('Start date is higher than end date. This must not ' +
                    'happen. Maybe the clock has changed');
      end = new Date(start.getTime() + DAY);
    }

    var wifiInterface = Common.getWifiInterface();
    var currentSimcardNetwork = Common.getDataSIMInterface();

    var simRequest, wifiRequest;
    var pendingRequests = 0;

    function checkForCompletion() {
      pendingRequests--;
      if (pendingRequests === 0) {
        updateDataUsage();
      }
    };

    function updateDataUsage() {
      var fakeEmptyResult = {data: []};
      var wifiData = adaptData(wifiRequest ? wifiRequest.result :
                                             fakeEmptyResult);
      var mobileData = adaptData(simRequest ? simRequest.result :
                                              fakeEmptyResult);

      var lastDataUsage = {
        timestamp: new Date(),
        start: start,
        end: end,
        today: today,
        wifi: {
          total: wifiData[1]
        },
        mobile: {
          total: mobileData[1]
        }
      };

      ConfigManager.setOption({ 'lastDataUsage': lastDataUsage },
        function _onSetItem() {
          debug('Statistics up to date and stored.');
        }
      );

      // XXX: Enrich with the samples because I can not store them
      lastDataUsage.wifi.samples = wifiData[0];
      lastDataUsage.mobile.samples = mobileData[0];
      result.status = 'success';
      result.data = lastDataUsage;
      debug('Returning up to date statistics.');
      if (callback) {
        callback(result);
      }
    }

    //Recover current Simcard info
    if (currentSimcardNetwork) {
      pendingRequests++;
      simRequest = statistics.getSamples(currentSimcardNetwork, start, end);
      simRequest.onsuccess = checkForCompletion;
    }

    if (wifiInterface) {
      pendingRequests++;
      wifiRequest = statistics.getSamples(wifiInterface, start, end);
      wifiRequest.onsuccess = checkForCompletion;
    }

    if (pendingRequests === 0) {
      updateDataUsage();
    }

  }

  // Transform data usage to the model accepted by the render
  function adaptData(networkStatsResult) {
    var data = networkStatsResult.data;
    var output = [];
    var totalData, accum = 0;
    for (var i = 0, item; item = data[i]; i++) {
      if (item.txBytes === undefined) {
        output.push({ date: item.date });
        continue;
      }

      totalData = 0;
      if (item.rxBytes) {
        totalData += item.rxBytes;
      }
      if (item.txBytes) {
        totalData += item.txBytes;
      }

      accum += totalData;

      output.push({
        value: totalData,
        date: item.date
      });
    }
    return [output, accum];
  }

  var airplaneMode = false;
  function init() {
    SettingsListener.observe('ril.radio.disabled', false,
      function _onValue(value) {
        airplaneMode = value;
      }
    );
  }

  return {
    init: init,
    getInstance: getInstance
  };

}());
