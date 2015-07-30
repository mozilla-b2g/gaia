/* global ConfigManager, CostControl, debug, Common, asyncStorage, Formatting,
          NotificationHelper, _, MozActivity, NetworkUsageAlarm, LazyLoader,
          SimManager, IACManager, DEBUGGING
*/
/*jshint -W020 */
/* The previous directive,ignore the "Read only" errors, that are produced when
   redirect global objects (Common and Costcontrol) to parent versions to avoid
   conflicts.
*/

(function() {

  'use strict';

  function inStandAloneMode() {
    return window.parent.location.pathname === '/message_handler.html';
  }

  // Redirect global objects to parent versions to avoid conflicts
  if (!inStandAloneMode()) {
    ConfigManager = window.parent.ConfigManager;
    CostControl = window.parent.CostControl;
    SimManager = window.parent.SimManager;
  }

  // XXX: This case implies that message handler triggered by system
  // (inStandAlone check) has replaced CC application (history's length check).
  //
  // This only occurs when the system (window manager) has detected there is
  // already an iframe for CC application, it is in background and it is
  // not the message handler. So, as the CC index.html uses the this file
  // inside an iframe (no standalone mode), all the messages should be attended
  // so we can conclude **there is nothing to do**.
  if (inStandAloneMode() && window.history.length > 1) {
    debug('Nothing to do in message handler, returning to app...');
    window.history.back();
  }

  function inApplicationMode() {
    return window.parent.location.pathname === '/index.html';
  }

  // Close if in standalone mode
  var closing;


  function closeIfProceeds() {
    debug('Checking for closing...');
    if (inStandAloneMode()) {
      closing = Common.closeApplication();
    }
  }

  // XXX: Remove from here when this is solved
  // https://bugzilla.mozilla.org/show_bug.cgi?id=800431
  function addAlarmTimeout(type, delay) {
    var date = new Date();
    date.setTime(date.getTime() + delay);
    var request = navigator.mozAlarms.add(date, 'ignoreTimezone', {type: type});
    return request;
  }
  window.addAlarmTimeout = addAlarmTimeout;

  // XXX: Remove from here when this is solved
  // https://bugzilla.mozilla.org/show_bug.cgi?id=800431
  function setNextReset(when, callback) {

    // XXX: This is not part of configuration by SIM so we bypass ConfigManager
    asyncStorage.getItem('nextResetAlarm', function(id) {
      // There is already an alarm, remove it
      debug('Current nextResetAlarm', id + '.', id ? 'Removing.' : '');
      if (id) {
        navigator.mozAlarms.remove(id);
      }

      // If no when, disable alarms passing null
      if (!when) {
        debug('Automatic reset disabled');
        updateResetAttributes(null, null, callback);
        return;
      }

      // If the alarm is in the past, fake it was launched
      if (when.getTime() < Date.now()) {
        debug('Faking a past reset alarm');
        _onAlarm({ data: { type: 'nextReset' } });
        if (callback) {
          setTimeout(callback);
        }
        return;
      }

      // If when is provided, request an alarm an set the new values
      var alarms = navigator.mozAlarms;
      var request = alarms.add(when, 'ignoreTimezone', {type: 'nextReset' });
      request.onsuccess = function _onSuccess() {
        debug('Setting nextResetAlarm', request.result, 'to', when);
        updateResetAttributes(request.result, when, callback);
      };
    });
  }
  window.setNextReset = setNextReset;

  function getTopUpTimeout(callback) {
    SimManager.requestDataSimIcc(function(dataSimIcc) {
      ConfigManager.requestSettings(dataSimIcc.iccId,
                                    function _onSettings(settings) {
        var request = navigator.mozAlarms.getAll();
        request.onsuccess = function(e) {
          var alarms = e.target.result;
          var length = alarms.length;
          if (!length) {
            callback(null);
            return;
          }

          var refId = settings.waitingForTopUp;
          var index = 0, alarm, found = false;
          while (index < length && !found) {
            alarm = alarms[index];
            found = (alarm.id === refId);
            index++;
          }
          if (found) {
            debug('TopUp timeout found:', alarm.date);
            callback(alarm.date);
          } else {
            callback(null);
          }
        };
      });
    });
  }
  window.getTopUpTimeout = getTopUpTimeout;

  function addNetworkUsageAlarm(dataInterface, dataLimit, onsuccess, onerror) {
    onsuccess = onsuccess || function() {};
    onerror = onerror || function() {};
    NetworkUsageAlarm.updateAlarm(dataInterface, dataLimit, onsuccess, onerror);
  }
  window.addNetworkUsageAlarm = addNetworkUsageAlarm;

  // Update the nextResetAlarm and nextReset values and request for
  // synchronization.
  function updateResetAttributes(alarmId, date, callback) {
    asyncStorage.setItem('nextResetAlarm', alarmId, function _updateOption() {
      ConfigManager.setOption({ nextReset: date }, function _sync() {
        localStorage.sync = 'nextReset#' + Math.random();
        if (callback) {
          callback();
        }
      });
    });
  }

  function sendIncorrectTopUpNotification(callback) {
    var title = 'topup-incorrectcode-title2';
    var message = 'topup-incorrectcode-message3';

    sendNotification('topUpError', title, message);

    if (callback) {
      callback();
    }
  }

  function sendBalanceThresholdNotification(remaining, settings, callback) {

    debug('Low limit already notified:', settings.lowLimitNotified);
    debug('Zero balance already notified:', settings.lowLimitNotified);

    // Zero reached notification
    var type;
    if (remaining.balance === 0 && !settings.zeroBalanceNotified) {
      type = 'zeroBalance';

    // There is a limit an we are below that limit and we did not notified yet
    } else if (settings.lowLimit &&
               remaining.balance < settings.lowLimitThreshold &&
               !settings.lowLimitNotified) {
      type = 'lowBalance';

    // No need for notification
    } else if (callback) {
      setTimeout(callback);
      return;
    }
    debug('Notification type:', type);

    // Get l10n for remaining balance
    var remainingBalance = _('currency', {
      currency: remaining.currency,
      value: remaining.balance
    });

    // Compose notification and send it
    var title = 'low-balance-notification-title';
    var message = {
      id: 'low-balance-notification-text',
      args: { remaining: remainingBalance }
    };
    if (type === 'zeroBalance') {
      title = 'usage';
      message = 'zero-balance-message';
    }

    sendNotification(type, title, message);

    // Finally mark the notification as sent
    var update = {};
    var notified = (type === 'lowBalance') ? 'lowLimitNotified' :
                                             'zeroBalanceNotified';
    update[notified] = true;
    ConfigManager.setOption(update, callback);
  }
  window.sendBalanceThresholdNotification = sendBalanceThresholdNotification;

  // When receiving an alarm, differenciate by type and act
  function _onAlarm(alarm) {
    clearTimeout(closing);

    SimManager.requestDataSimIcc(function(dataSimIcc) {
      function _launchNextReset() {
        ConfigManager.requestSettings(dataSimIcc.iccId,
                                      function _onSettings(settings) {
          Common.resetAll(function updateNextResetAndClose() {
            Common.updateNextReset(settings.trackingPeriod, settings.resetTime,
                                   closeIfProceeds);
          });
        });
      }

      switch (alarm.data.type) {
        case 'balanceTimeout':
          ConfigManager.requestSettings(dataSimIcc.iccId,
                                        function _onSettings(settings) {
            settings.errors.BALANCE_TIMEOUT = true;
            ConfigManager.setOption(
              { 'errors': settings.errors, 'waitingForBalance': null },
              function _onBalanceTimeout() {
                debug('Timeout for balance');
                debug('Trying to synchronize!');
                localStorage.sync = 'errors#' + Math.random();
                closeIfProceeds();
              }
            );
          });
          break;

        case 'topupTimeout':
          ConfigManager.requestSettings(dataSimIcc.iccId,
                                        function _onSettings(settings) {
            settings.errors.TOPUP_TIMEOUT = true;
            ConfigManager.setOption(
              { 'errors': settings.errors, 'waitingForTopUp': null },
              function _onBalanceTimeout() {
                debug('Timeout for topup');
                debug('Trying to synchronize!');
                localStorage.sync = 'errors#' + Math.random();
                closeIfProceeds();
              }
            );
          });
          break;

        case 'nextReset':
          if (!Common.allNetworkInterfaceLoaded) {
            Common.loadNetworkInterfaces(_launchNextReset);
          } else {
            _launchNextReset();
          }
          break;
      }
    });
  }

  function getNofificationAction(type, app) {
    var activityName, action;
    var noop = function() {};
    switch (type) {
      case 'lowBalance':
      case 'zeroBalance':
        activityName = 'costcontrol/balance';
        action = function() {
          if (window.parent.BalanceTab) {
            window.parent.CostControlApp.showBalanceTab();
          }
        };
        break;
      case 'topUpError' :
        activityName = 'costcontrol/balance';
        action = function() {
          if (window.parent.BalanceTab) {
            window.parent.BalanceTab.topUpWithCode(true);
          }
        };
        break;
      default:
        activityName = 'costcontrol/data_usage';
        action = function() {
          if (window.parent.CostControlApp) {
            window.parent.CostControlApp.showDataUsageTab();
          }
        };
        break;
    }

    if (!inStandAloneMode()) {
      return function() {
        if (inApplicationMode()) {
          app.launch();
          action && action();
        } else {
          type = new MozActivity({name: activityName});
        }
      };
    }
    return noop;
}

  function sendNotification(notificationType, title, message) {
    navigator.mozApps.getSelf().onsuccess = function _onAppReady(evt) {
      var app = evt.target.result;
      var iconURL = NotificationHelper.getIconURI(app);
      var navigate = getNofificationAction(notificationType, app);

      NotificationHelper.send(title, {
        'bodyL10n': message,
        'icon': iconURL,
        'data': notificationType
      }).then(function(notification) {
        notification.addEventListener('click', function() {
          notification.close();
          navigate();
        });
      });
    };
  }

  function _onNetworkAlarm(alarm) {
    clearTimeout(closing);
    navigator.mozApps.getSelf().onsuccess = function _onAppReady(evt) {
      SimManager.requestDataSimIcc(function(dataSimIcc) {
        ConfigManager.requestSettings(dataSimIcc.iccId,
                                      function _onSettings(settings) {
          var limit = Common.getDataLimit(settings);
          var limitText = Formatting.formatData(Formatting.smartRound(limit));
          var title = {
            id: 'data-limit-notification-title2',
            args: { limit: limitText }
          };
          var message = 'data-limit-notification-text2';
          sendNotification('dataUsage', title, message);
          ConfigManager.setOption({ 'dataUsageNotified': true },
                                  closeIfProceeds);
          return;
        });
      });
    };
  }

  function disableSilentModeFor(type, configuration) {
    LazyLoader.load('js/iac_manager.js', function() {
      IACManager.init(configuration);
      IACManager.broadcastEndOfSMSQuery(type).then(function(msg) {
        debug('After broadcasting for ' + type + ' (disabling)');
      });
    });
  }

  // Register in standalone or for application
  var costcontrol;
  function _getCCInstance() {
    CostControl.getInstance(function _onCostControl(ccontrol) {
      costcontrol = ccontrol;

      if (inStandAloneMode() || inApplicationMode()) {
        debug('Installing handlers');

        // When receiving an SMS, recognize and parse
        navigator.mozSetMessageHandler('sms-received', function _onSMS(sms) {
          clearTimeout(closing);
          ConfigManager.requestAll(function _onInfo(configuration, settings) {

            var isBalanceResponse =
              configuration.balance &&
              Array.isArray(configuration.balance.senders) &&
              configuration.balance.senders.indexOf(sms.sender) > -1;

            var isTopupResponse =
              configuration.topup &&
              Array.isArray(configuration.topup.senders) &&
              configuration.topup.senders.indexOf(sms.sender) > -1;

            // Non expected SMS
            if (!isBalanceResponse && !isTopupResponse) {
              closeIfProceeds();
              return;
            }

            // Parse the message
            debug('Parsing received SMS');
            var isBalance, isConfirmation, isError;
            isBalance = isConfirmation = isError = false;

            debug('Trying to recognize balance SMS');
            var description = new RegExp(configuration.balance.regexp);
            var balanceData = sms.body.match(description);

            if (!balanceData) {
              debug('Trying to recognize zero balance SMS');
              // Some carriers use another response messages format
              // for zero balance
              var zeroDescription = configuration.balance.zero_regexp ?
                           new RegExp(configuration.balance.zero_regexp) : null;
              if (zeroDescription && zeroDescription.test(sms.body)) {
                balanceData = ['0.00', '0', '0'];
              }
            }
            isBalance = !!balanceData;

            if (!isBalance || balanceData.length < 2) {
              console.warn('Impossible to parse balance message.');

              debug('Trying to recognize TopUp confirmation SMS');
              description = new RegExp(configuration.topup.confirmation_regexp);
              isConfirmation = !!sms.body.match(description);
              if (!isConfirmation) {
                console.warn('Impossible to parse TopUp confirmation message.');

                debug('Trying to recognize TopUp error SMS');
                description =
                  new RegExp(configuration.topup.incorrect_code_regexp);
                isError = !!sms.body.match(description);
                if (!isError) {
                  console.warn('Impossible to parse TopUp confirmation msg.');
                }
              }

            }

            if (!isBalance && !isConfirmation && !isError) {
              closeIfProceeds();
              return;
            }

            if (!DEBUGGING &&
                (isBalance && (settings.waitingForBalance !== null)) ||
                (isConfirmation && (settings.waitingForTopUp !== null))) {
              var mobileMessageManager = window.navigator.mozMobileMessage;
              mobileMessageManager.delete(sms.id);
            }

            if (isBalance) {
              // Compose new balance
              var integer = balanceData[1].replace(/[^0-9]/g, '');
              var decimal = balanceData[2] || '0';
              var newBalance = {
                balance: parseFloat(integer + '.' + decimal),
                currency: configuration.credit.currency,
                timestamp: new Date()
              };

              if (settings.waitingForBalance !== null) {
                // Remove the timeout
                navigator.mozAlarms.remove(settings.waitingForBalance);
                debug('Balance timeout:', settings.waitingForBalance,
                      'removed');

                disableSilentModeFor('balance', configuration);
              }
              // Store new balance and sync
              ConfigManager.setOption(
                { 'lastBalance': newBalance, 'waitingForBalance': null },
                function _onSet() {
                  debug('Balance up to date and stored');
                  debug('Trying to synchronize!');
                  localStorage.sync = 'lastBalance#' + Math.random();
                  sendBalanceThresholdNotification(newBalance, settings,
                                                   closeIfProceeds);
                }
              );
            } else if (isConfirmation) {
              if (settings.waitingForTopUp !== null) {
                // Store SUCCESS for TopIp and sync
                navigator.mozAlarms.remove(settings.waitingForTopUp);
                debug('TopUp timeout:', settings.waitingForTopUp, 'removed');
                disableSilentModeFor('topup', configuration);
              }
              ConfigManager.setOption(
                {
                  'waitingForTopUp': null,
                  'lowLimitNotified': false,
                  'zeroBalanceNotified': false
                },
                function _onSet() {
                  debug('TopUp confirmed!');
                  debug('Trying to synchronize!');
                  localStorage.sync = 'waitingForTopUp#' + Math.random();
                  closeIfProceeds();
                }
              );
            } else if (isError) {
              // Store ERROR for TopUp and sync
              settings.errors.INCORRECT_TOPUP_CODE = true;
              navigator.mozAlarms.remove(settings.waitingForTopUp);
              debug('TopUp timeout: ', settings.waitingForTopUp, 'removed');
              ConfigManager.setOption(
                {
                  'errors': settings.errors,
                  'waitingForTopUp': null,
                  'lowLimitNotified': false,
                  'zeroBalanceNotified': false
                },
                function _onSet() {
                  debug('Balance up to date and stored');
                  debug('Trying to synchronize!');
                  localStorage.sync = 'errors#' + Math.random();
                  sendIncorrectTopUpNotification(closeIfProceeds);
                }
              );
            }
          });
        });

        navigator.mozSetMessageHandler('networkstats-alarm', _onNetworkAlarm);
        navigator.mozSetMessageHandler('alarm', _onAlarm);

        // Count a new SMS
        navigator.mozSetMessageHandler('sms-sent', function _onSent(sms) {
          clearTimeout(closing);
          debug('SMS sent!');

          var configuration = ConfigManager.configuration;
          var mode = ConfigManager.getApplicationMode();
          if (mode === 'PREPAID' &&
              !costcontrol.isBalanceRequestSMS(sms, configuration)) {
            costcontrol.request({ type: 'balance' });
          }
          if (mode === 'PREPAID' &&
              costcontrol.isBalanceRequestSMS(sms, configuration)) {
            closeIfProceeds();
          } else {
            var mobileMessageManager = window.navigator.mozMobileMessage;
            var infoRequest =
              mobileMessageManager.getSegmentInfoForText(sms.body);
            infoRequest.onsuccess = function onInfo(evt) {
              var realCount, smsInfo = evt.target.result;
              if (!smsInfo || !smsInfo.segments) {
                console.error(
                  'Invalid getSegmentInfoForText() result. Counting 1 segment');
                realCount = 1;
              } else {
                realCount = smsInfo.segments;
              }
              updateSMSCount(realCount);
            };
            infoRequest.onerror = function onError() {
              console.error('Can not retrieve segment info for body ' +
                             sms.body);
              updateSMSCount(1);
            };
          }

          function updateSMSCount(count) {
            SimManager.requestDataSimIcc(function(dataSimIcc) {
              ConfigManager.requestSettings(dataSimIcc.iccId,
                                            function _onSettings(settings) {
                settings.lastTelephonyActivity.timestamp = new Date();
                settings.lastTelephonyActivity.smscount += count;
                ConfigManager.setOption({
                  lastTelephonyActivity: settings.lastTelephonyActivity
                }, function _sync() {
                  localStorage.sync = 'lastTelephonyActivity#' + Math.random();
                  closeIfProceeds();
                });
              });
            });
          }
        });

        // When a call ends
        navigator.mozSetMessageHandler('telephony-call-ended',
          function _onCall(tcall) {
            clearTimeout(closing);
            if (tcall.direction !== 'outgoing') {
              closeIfProceeds();
              return;
            }
            debug('Outgoing call finished!');
            SimManager.requestDataSimIcc(function(dataSimIcc) {
              ConfigManager.requestSettings(dataSimIcc.iccId,
                                            function _onSettings(settings) {
                var mode = ConfigManager.getApplicationMode();
                if (mode === 'PREPAID') {
                  costcontrol.request({ type: 'balance' });
                }

                settings.lastTelephonyActivity.timestamp = new Date();
                settings.lastTelephonyActivity.calltime += tcall.duration;
                ConfigManager.setOption({
                  lastTelephonyActivity: settings.lastTelephonyActivity
                }, function _sync() {
                  localStorage.sync = 'lastTelephonyActivity#' + Math.random();
                  closeIfProceeds();
                });
              });
            });
          }
        );
      }

      // Notify message handler is ready
      var readyEvent = new CustomEvent('messagehandlerready');
      window.parent.dispatchEvent(readyEvent);
    });
  }
  _getCCInstance();
}());
