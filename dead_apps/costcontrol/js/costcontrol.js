/* global debug, ConfigManager, Toolkit, addAlarmTimeout, Common, LazyLoader,
          SimManager, IACManager, DEBUGGING
*/
/* exported CostControl */
'use strict';

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

  var costcontrol;
  function getInstance(onready) {
    debug('Initializing Cost Control');

    function goOn() {
      debug('Cost Control already ready!');
      onready(costcontrol);
    }

    // Force a reload of Costcontrol when the dataSlotChange event is lost
    if (costcontrol) {
      if (SimManager.isMultiSim()) {
        SimManager.requestDataSimIcc(function(dataSimIcc) {
          if (costcontrol.iccId === dataSimIcc.iccId) {
            goOn();
          }
        });
      } else {
        goOn();
      }
      return;
    }

    function setupCostControl(configuration, settings, iccId) {
      costcontrol = {
        iccId: iccId,
        request: request,
        lastDataResults: {},
        lastDataResultsPerApp: {},
        isBalanceRequestSMS: isBalanceRequestSMS
      };

      debug('Cost Control ready!');
      onready(costcontrol);
    }

    loadAPIs();
    ConfigManager.requestAll(setupCostControl);
  }

  var mobileMessageManager, statistics, isSendingBalanceRequest = false;
  function loadAPIs() {
    if ('mozMobileMessage' in window.navigator) {
      mobileMessageManager = window.navigator.mozMobileMessage;
    }

    if ('mozNetworkStats' in window.navigator) {
      statistics = window.navigator.mozNetworkStats;
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
      function _requestDataStatistics() {
        SimManager.requestDataSimIcc(function(dataSim) {
          requestDataStatistics(configuration, settings, callback, dataSim,
                                result, requestObj);
        });
      }

      function _requestBalance(connection) {
        // Check service
        var issues = getServiceIssues(configuration, settings,
                                      connection);
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

        var costIssues = getCostIssues(configuration, connection);
        if (!force && costIssues) {
          result.status = 'error';
          result.details = costIssues;
          result.data = settings.lastBalance;
          if (callback) {
            callback(result);
          }
          return;
        }

        // TODO To avoid concurrence problems, the best solution would be to
        // implement a request queue instead of the isSendingBalanceRequest lock
        // Check in-progress
        var isWaiting = settings.waitingForBalance !== null;
        var timeout = Toolkit.checkEnoughDelay(BALANCE_TIMEOUT,
                                               settings.lastBalanceRequest);
        if ((isWaiting && !timeout) || isSendingBalanceRequest) {
          result.status = 'in_progress';
          result.data = settings.lastBalance;
          if (callback) {
            callback(result);
          }
          return;
        }
        isSendingBalanceRequest = true;

        // Dispatch
        LazyLoader.load('js/iac_manager.js', function() {
          requestBalance(configuration, settings, callback, result);
        });
      }

      function _requestTopUp(connection) {
        // Check service
        var issuesTopUp = getServiceIssues(configuration, settings,
                                           connection);
        if (issuesTopUp && issuesTopUp !== 'minimum_delay') {
          result.status = 'error';
          result.details = issuesTopUp;
          result.data = settings.lastDataUsage;
          if (callback) {
            callback(result);
          }
          return;
        }

        var costIssuesTopUp = getCostIssues(configuration, connection);
        if (!force && costIssuesTopUp) {
          result.status = 'error';
          result.details = costIssuesTopUp;
          result.data = settings.lastBalance;
          if (callback) {
            callback(result);
          }
          return;
        }

        // Check in-progress
        var isWaitingTopUp = settings.waitingForTopUp !== null;
        var timeoutTopUp = Toolkit.checkEnoughDelay(BALANCE_TIMEOUT,
                                               settings.lastTopUpRequest);
        if (isWaitingTopUp && !timeoutTopUp && !force) {
          result.status = 'in_progress';
          result.data = settings.lastDataUsage;
          if (callback) {
            callback(result);
          }
          return;
        }

        // Dispatch
        var code = requestObj.data;
        LazyLoader.load('js/iac_manager.js', function() {
          requestTopUp(configuration, settings, code, callback, result);
        });
      }
      switch (requestObj.type) {
        case 'balance':
          SimManager.requestDataConnection(_requestBalance);
          break;

        case 'topup':
          SimManager.requestDataConnection(_requestTopUp);
          break;

        case 'datausage':
          // Dispatch
          if (!Common.allNetworkInterfaceLoaded) {
            Common.loadNetworkInterfaces(_requestDataStatistics,
                                         _requestDataStatistics);
          } else {
            _requestDataStatistics();
          }
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
  function getServiceIssues(configuration, settings, connection) {

    if (!connection || !connection.data ||
        !connection.voice || !connection.voice.connected) {
      return 'no_service';
    }

    var mode = ConfigManager.getApplicationMode();
    if (mode !== 'PREPAID') {
      return 'no_service';
    }

    if (connection.voice.relSignalStrength === null) {
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
  function getCostIssues(configuration, connection) {
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

    function sendSMS() {
      debug('After IAC broadcast ask for starting - balance');
      // Send request SMS
      var newSMS = mobileMessageManager.send(
        configuration.balance.destination,
        configuration.balance.text
      );

      newSMS.onsuccess = function _onSuccess() {
        debug('Request SMS sent! Waiting for response.');

        if (!DEBUGGING) {
          mobileMessageManager.delete(newSMS.result.id);
        }

        // Add the timeout
        var newAlarm = addAlarmTimeout('balanceTimeout', BALANCE_TIMEOUT);

        newAlarm.onsuccess = function _alarmSet(evt) {
          var id = evt.target.result;
          debug('Timeout for balance (', id, ') update set to:',
                BALANCE_TIMEOUT);

          ConfigManager.setOption(
            {
              'waitingForBalance': id,
              'lastBalanceRequest': new Date()
            },
            function _onSet() {
              isSendingBalanceRequest = false;
              result.status = 'success';
              if (callback) {
                callback(result);
              }
            }
          );
        };

        newAlarm.onerror = function _alarmFailedToSet(evt) {
          ConfigManager.setOption(
            {
              'lastBalanceRequest': new Date()
            },
            function _onSet() {
              isSendingBalanceRequest = false;
              debug('Failed to set timeout for balance request!');
              result.status = 'error';
              result.details = 'timeout_fail';
              if (callback) {
                callback(result);
              }
            }
          );
        };
      };

      newSMS.onerror = function _onError() {
        isSendingBalanceRequest = false;
        debug('Request SMS failed! But returning stored balance.');
        IACManager.broadcastEndOfSMSQuery('balance').then(function(msg) {
          debug('After IAC broadcast ask for ending - balance');
        });
        result.status = 'error';
        result.details = 'request_fail';
        if (callback) {
          callback(result);
        }
      };
      debug('Balance out of date. Requesting fresh data...');
    }
    IACManager.init(configuration);
    IACManager.broadcastStartOfSMSQuery('balance').then(sendSMS, sendSMS);
  }

  // Send a top up SMS and set timeouts for interrupting waiting for response
  var TOPUP_TIMEOUT = 5 * 60 * 1000; // Should be 5 min
  function requestTopUp(configuration, settings, code, callback, result) {
    debug('Requesting TopUp with code', code, '...');

    function sendSMS() {
      debug('After IAC broadcast ask for starting - topup');

      // TODO: Ensure is free
      var newSMS = mobileMessageManager.send(
        configuration.topup.destination,
        configuration.topup.text.replace(/\&code/g, code)
      );

      newSMS.onsuccess = function _onSuccess() {
        debug('TopUp SMS sent! Waiting for response.');

        if (!DEBUGGING) {
          mobileMessageManager.delete(newSMS.result.id);
        }

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
        IACManager.broadcastEndOfSMSQuery('topup').then(function(msg) {
          debug('After IAC broadcast ask for ending - topup');
        });
        result.status = 'error';
        result.details = 'request_fail';
        if (callback) {
          callback(result);
        }
      };
    }

    IACManager.init(configuration);
    IACManager.broadcastStartOfSMSQuery('topup').then(sendSMS, sendSMS);
  }

  // XXX: pending on bug XXX to get statistics by SIM
  // Ask statistics API for mobile and wifi data usage
  var DAY = 24 * 3600 * 1000; // 1 day
  function requestDataStatistics(configuration, settings, callback, dataSimIcc,
                                 result, requestParameters) {
    debug('Statistics out of date. Requesting fresh data...');
    var apps = requestParameters && requestParameters.apps;
    var start = requestParameters && requestParameters.startDate;
    var end = requestParameters && requestParameters.endDate;

    if (!start) {
      var maxAge = 1000 * statistics.maxStorageAge;
      var minimumStart = new Date(Date.now() - maxAge);
      debug('The max age for samples is ' + minimumStart);

      // If settings.lastCompleteDataReset is not set let's use the past week.
      // This is only for not breaking dogfooders build and this can be remove
      // at some point in the future (and since this sentence has been said
      // multiple times this code will probably stay here for a while).
      start = new Date(settings.lastCompleteDataReset ||
                       Date.now() - 7 * DAY);
      if (start < minimumStart) {
        console.warn('Start date is surpassing the maximum age for the ' +
                     'samples. Setting to ' + minimumStart);
        start = minimumStart;
      }
    }

    start = Toolkit.toMidnight(start);

    if (!end) {
      var today = Toolkit.toMidnight(new Date());
      var tomorrow = new Date();
      tomorrow.setTime(today.getTime() + DAY);

      end = Toolkit.toMidnight(settings.nextReset ?
                               new Date(settings.nextReset.getTime() - DAY) :
                               tomorrow);
    }
    if (start > end) {
      console.error('Start date is higher than end date. This must not ' +
                    'happen. Changed end date to day after startDate');
      end = new Date(start.getTime() + DAY);
    }

    var wifiInterface = Common.getWifiInterface();
    var currentSimcardNetwork = Common.getDataSIMInterface(dataSimIcc.iccId);

    var wifiRequests, simRequests;
    var pendingRequests = 0;

    function checkForCompletion() {
      pendingRequests--;
      if (pendingRequests === 0) {
        updateDataUsage();
      }
    }

    function updateDataUsage() {
      var lastDataUsage = {
        timestamp: new Date(),
        start: start,
        end: end,
        today: today,
        wifi: {
          apps: {},
          total: 0,
          samples: []
        },
        mobile: {
          apps: {},
          total: 0,
          samples: []
        }
      };

      function saveLastDataUsage(perApp) {
        // XXX: raw samples are apparently too much to persist,
        //      so we only store aggregate totals

        var savedUsage = {};
        Object.keys(lastDataUsage).forEach(function(key) {
          var value = lastDataUsage[key];
          if (key === 'wifi' || key === 'mobile') {

            // If saving per app totals we should retain the totals for the
            // global query, persisted in settings by the time of this call.
            if (perApp) {
              value = settings.lastDataUsage[key];
            }

            savedUsage[key] = { apps: {}, total: value.total };
            Object.keys(value.apps).forEach(function(manifest) {
              savedUsage[key].apps[manifest] = {
                total: value.apps[manifest].total
              };
            });
          } else {
            savedUsage[key] = value;
          }
        });

        ConfigManager.setOption({ 'lastDataUsage': savedUsage },
          function _onSetItem() {
            debug('Statistics up to date and stored.');
          }
        );
      }

      // Aggregate fine-grained app specific samples into a top level per-day
      // and per-network sample list
      function aggregateSamples(network) {
        if (!network.apps) {
          return;
        }

        var manifestURLs = Object.keys(network.apps);
        if (manifestURLs.length === 0) {
          return;
        }

        var samplesByDate = {};
        var today = Toolkit.toMidnight(new Date());
        // offset in milliseconds
        var offset = today.getTimezoneOffset() * 60 * 1000;

        manifestURLs.forEach(function(manifestURL) {
          var samples = network.apps[manifestURL].samples;
          samples.forEach(function(sample) {
            if (sample.date && sample.date.__date__) {
              sample.date = new Date(sample.date.__date__);
            }

            var sampleLocalTime = sample.date.getTime() + offset;
            var sampleUTCDate = Toolkit.toMidnight(new Date(sampleLocalTime));

            var aggregateSample = samplesByDate[sampleUTCDate.getTime()];
            if (!aggregateSample) {
              aggregateSample = samplesByDate[sampleUTCDate.getTime()] = {
                value: 0,
                date: sample.date
              };
            }

            aggregateSample.value += sample.value;
          });
        });

        var dates = Object.keys(samplesByDate);
        network.samples = dates.map(function(date) {
          return samplesByDate[date];
        });

        network.samples.sort(function(a, b) {
          return a.date.getTime() - b.date.getTime();
        });
      }

      // Handle results from requests to the network stats database
      // for data usage on a specific network
      function handleResult(request, network) {
        var result = request.result;
        var data = adaptData(result);
        var manifestURL = request.result.appManifestURL;
        // ignore the 'null' manifestURL
        if (manifestURL && manifestURL !== 'null') {
          var isBrowser = request.result.browsingTrafficOnly &&
                          manifestURL === Common.SYSTEM_MANIFEST;
          if (isBrowser) {
            manifestURL = Common.BROWSER_APP.manifestURL;
          }
          network.apps[manifestURL] = {
            samples: data[0],
            total: data[1]
          };
        } else {
          network.samples = network.samples.concat(data[0]);
        }
        network.total += data[1];
      }

      if (simRequests) {
        simRequests.forEach(function(request) {
          handleResult(request, lastDataUsage.mobile);
        });
        aggregateSamples(lastDataUsage.mobile);
      }

      if (wifiRequests) {
        wifiRequests.forEach(function(request) {
          handleResult(request, lastDataUsage.wifi);
        });
        aggregateSamples(lastDataUsage.wifi);
      }

      var perApp = apps && apps.length > 0;
      saveLastDataUsage(perApp);

      result.status = 'success';
      result.data = lastDataUsage;

      // Once bug 1083680 is solved, both caches should contain the same values
      // so we could use only `costcontrol.lastDataResults`.
      if (perApp) {
        costcontrol.lastDataResultsPerApp = lastDataUsage;
      } else {
        costcontrol.lastDataResults = lastDataUsage;
      }
      debug('Returning up to date statistics.');
      if (callback) {
        callback(result);
      }
    }

    function requestPerAppUsage(networkId) {
      function requestSamples(options) {
        pendingRequests++;
        var req = statistics.getSamples(networkId, start, end, options);
        req.onsuccess = checkForCompletion;
        return req;
      }

      var requests;
      if (apps && apps.length > 0) {
        requests = [];
        apps.forEach(function(manifestURL) {
          // Ignoring the system app because of the system traffic is going to
          // be calculated (Front-end workaround for Bug 1083680)
          if (manifestURL !== Common.SYSTEM_MANIFEST) {
            var options = { appManifestURL: manifestURL };
            // Browser app is included on System app
            if (manifestURL === Common.BROWSER_APP.manifestURL) {
              options.appManifestURL = Common.SYSTEM_MANIFEST;
              options.browsingTrafficOnly = true;
            }
            requests.push(requestSamples(options));
          }
        });
      } else {
        requests = [requestSamples()];
      }
      return requests;
    }

    //Recover current Simcard info
    if (currentSimcardNetwork) {
      simRequests = requestPerAppUsage(currentSimcardNetwork);
    }

    if (wifiInterface) {
      wifiRequests = requestPerAppUsage(wifiInterface);
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
    for (var i = 0; i < data.length; i++) {
      var item = data[i];
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

  return {
    getInstance: getInstance,
    reset: function _onReset() {
      costcontrol = null;
    }
  };

}());
