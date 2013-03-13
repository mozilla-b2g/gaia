
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
        getApplicationMode: getApplicationMode,
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

  var sms, connection, telephony, statistics;
  function loadAPIs() {
    if ('mozSms' in window.navigator) {
      sms = window.navigator.mozSms;
    }

    if ('mozMobileConnection' in window.navigator) {
      connection = window.navigator.mozMobileConnection;
    }

    if ('mozNetworkStats' in window.navigator) {
      statistics = window.navigator.mozNetworkStats;
    }

    debug('APIs loaded!');
  }

  // OTHER LOGIC

  // Get application mode based on the current SIM, OEM configuration and
  // plantype. Can be: DATA_USAGE_ONLY, PREPAID and POSTPAID.
  function getApplicationMode(settings) {
    var simMCC = connection.iccInfo.mcc;
    var simMNC = connection.iccInfo.mnc;
    var enabledNetworks = ConfigManager.configuration.enable_on;
    if (!(simMCC in enabledNetworks) ||
        (enabledNetworks[simMCC].indexOf(simMNC) === -1)) {
      return 'DATA_USAGE_ONLY';
    }

    return settings.plantype.toUpperCase();
  }

  // Check if a SMS matches the form of a balance request
  function isBalanceRequestSMS(sms, configuration) {
    return sms.body === configuration.balance.text &&
           sms.receiver === configuration.balance.destination;
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
          var issues = getServiceIssues(settings);
          if (issues) {
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
          var timeout = checkEnoughDelay(BALANCE_TIMEOUT,
                                         settings.lastBalanceRequest);
          if (isWaiting && !timeout && !force) {
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
          var issues = getServiceIssues(settings);
          if (issues) {
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
          var timeout = checkEnoughDelay(BALANCE_TIMEOUT,
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

  var airplaneMode = false;
  SettingsListener.observe('ril.radio.disabled', false,
    function _onValue(value) {
      airplaneMode = value;
    }
  );

  // Check service status and return the most representative issue if there is
  function getServiceIssues(settings) {
    if (airplaneMode) {
      return 'airplane_mode';
    }

    if (!connection || !connection.voice || !connection.data) {
      return 'no_service';
    }

    var mode = getApplicationMode(settings);
    if (mode !== 'PREPAID') {
      return 'no_service';
    }

    var data = connection.data;
    if (!data.network.shortName && !data.network.longName) {
      return 'no_service';
    }

    var voice = connection.voice;
    if (voice.signalStrength === null) {
      return 'no_coverage';
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
    var newSMS = sms.send(
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
    var newSMS = sms.send(
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

    // If settings.lastDataReset is not set let's use the past week. This is
    // only for not breaking dogfooders build and this can be remove at some
    // point in the future (and since this sentence has been said multiple times
    // this code will probably stay here for a while).
    var start = toMidnight(new Date(settings.lastDataReset ||
                                    Date.now() - 7 * DAY));

    var today = toMidnight(new Date());

    var tomorrow = new Date();
    tomorrow.setTime(today.getTime() + DAY);

    var end = toMidnight(settings.nextReset ?
                         new Date(settings.nextReset.getTime() - DAY) :
                         tomorrow);


    asyncStorage.getItem('dataUsageTags', function _onTags(tags) {
      asyncStorage.getItem('wifiFixing', function _onFixing(wifiFixing) {

        // Request Wi-Fi
        var wifiRequest = statistics.getNetworkStats({
          start: start,
          end: today,
          connectionType: 'wifi'
        });

        wifiRequest.onsuccess = function _onWifiData() {

          // Request Mobile
          var mobileRequest = statistics.getNetworkStats({
            start: start,
            end: today,
            connectionType: 'mobile'
          });

          // Finally, store the result and continue
          mobileRequest.onsuccess = function _onMobileData() {
            var fakeTag = {
              sim: connection.iccInfo.iccid,
              start: settings.lastDataReset,
              fixing: [[settings.lastDataReset, wifiFixing || 0]]
            };
            var wifiData = adaptData(wifiRequest.result, [fakeTag]);
            var mobileData = adaptData(mobileRequest.result, tags);
            var lastDataUsage = {
              timestamp: new Date() ,
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
          };
        };
      });
    });
  }

  // Transform data usage to the model accepted by the render
  function adaptData(networkStatsResult, tags) {
    var data = networkStatsResult.data;
    var output = [];
    var totalData, accum = 0;
    for (var i = 0, item; item = data[i]; i++) {
      totalData = 0;
      if (item.rxBytes) {
        totalData += item.rxBytes;
      }
      if (item.txBytes) {
        totalData += item.txBytes;
      }

      var usage = totalData;
      if (tags) {
        usage = MindGap.getUsage(tags, totalData, item.date);
      }

      if (usage === undefined) {
        continue;
      }

      accum += usage;

      output.push({
        value: usage,
        date: item.date
      });
    }
    return [output, accum];
  }

  return { getInstance: getInstance };

}());
