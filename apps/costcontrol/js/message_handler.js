
(function() {

  'use strict';

  function inStandAloneMode() {
    return window.parent.location.pathname === '/message_handler.html';
  }

  // Redirect global objects to parent versions to avoid conflicts
  if (!inStandAloneMode()) {
    ConfigManager = window.parent.ConfigManager;
    CostControl = window.parent.CostControl;
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

  function inWidgetMode() {
    return window.parent.location.pathname === '/widget.html';
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
  };
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
    ConfigManager.requestSettings(function _onSettings(settings) {
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
  }
  window.getTopUpTimeout = getTopUpTimeout;

  // Update the nextResetAlarm and nextReset values and request for
  // synchronization.
  function updateResetAttributes(alarmId, date, callback) {
    asyncStorage.setItem('nextResetAlarm', alarmId, function _updateOption() {
      ConfigManager.setOption({ nextReset: date }, function _sync() {
        localStorage['sync'] = 'nextReset#' + Math.random();
        if (callback) {
          callback();
        }
      });
    });
  }

  function sendIncorrectTopUpNotification(callback) {
    // XXX: Hack hiding the message class in the icon URL
    // Should use the tag element of the notification once the final spec
    // lands:
    // See: https://bugzilla.mozilla.org/show_bug.cgi?id=782211
    navigator.mozApps.getSelf().onsuccess = function _onAppReady(evt) {
      var app = evt.target.result;
      var iconURL = NotificationHelper.getIconURI(app);

      var goToTopUpCode;
      if (!inStandAloneMode()) {
        goToTopUpCode = function _goToTopUpCode() {
          app.launch();
          window.parent.BalanceTab.topUpWithCode(true);
        };
      }

      iconURL += '?topUpError';
      NotificationHelper.send(_('topup-incorrectcode-title2'),
                              _('topup-incorrectcode-message3'), iconURL,
                              goToTopUpCode);

      if (callback) {
        callback();
      }
    };
  }

  function sendBalanceThresholdNotification(remaining, settings, callback) {
    // XXX: Hack hiding the message class in the icon URL
    // Should use the tag element of the notification once the final spec
    // lands:
    // See: https://bugzilla.mozilla.org/show_bug.cgi?id=782211
    navigator.mozApps.getSelf().onsuccess = function _onAppReady(evt) {
      var app = evt.target.result;
      var iconURL = NotificationHelper.getIconURI(app);

      var goToBalance;
      if (!inStandAloneMode()) {
        goToBalance = function _goToBalance() {
          app.launch();
          window.parent.CostControlApp.showBalanceTab();
        };
      }

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
      } else {
        if (typeof callback === 'function') {
          setTimeout(callback);
        }
        return;
      }
      debug('Notification type:', type);
      iconURL += '?' + type;

      // Get l10n for remaining balance
      var remainingBalance = _('currency', {
        currency: remaining.currency,
        value: remaining.balance
      });

      // Compose notification and send it
      var title = _('low-balance-notification-title');
      var message = _('low-balance-notification-text',
                      { remaining: remainingBalance });
      if (type === 'zeroBalance') {
        title = _('usage');
        message = _('zero-balance-message');
      }
      NotificationHelper.send(title, message, iconURL, goToBalance);

      // Finally mark the notification as sent
      var update = {};
      var notified = (type === 'lowBalance') ? 'lowLimitNotified' :
                                               'zeroBalanceNotified';
      update[notified] = true;
      ConfigManager.setOption(update, callback);
    };
  }

  // When receiving an alarm, differenciate by type and act
  function _onAlarm(alarm) {
    clearTimeout(closing);
    switch (alarm.data.type) {
      case 'balanceTimeout':
        ConfigManager.requestSettings(function _onSettings(settings) {
          settings.errors['BALANCE_TIMEOUT'] = true;
          ConfigManager.setOption(
            { 'errors': settings.errors, 'waitingForBalance': null },
            function _onBalanceTimeout() {
              debug('Timeout for balance');
              debug('Trying to synchronize!');
              localStorage['sync'] = 'errors#' + Math.random();
              closeIfProceeds();
            }
          );
        });
        break;

      case 'topupTimeout':
        ConfigManager.requestSettings(function _onSettings(settings) {
          settings.errors['TOPUP_TIMEOUT'] = true;
          ConfigManager.setOption(
            { 'errors': settings.errors, 'waitingForTopUp': null },
            function _onBalanceTimeout() {
              debug('Timeout for topup');
              debug('Trying to synchronize!');
              localStorage['sync'] = 'errors#' + Math.random();
              closeIfProceeds();
            }
          );
        });
        break;

      case 'nextReset':
        ConfigManager.requestSettings(function _onSettings(settings) {
          resetAll(function updateNextResetAndClose() {
            updateNextReset(
              settings.trackingPeriod, settings.resetTime,
              closeIfProceeds
            );
          });
        });
        break;
    }
  }

  function checkDataUsageNotification(settings, usage, callback) {
    // XXX: Hack hiding the message class in the icon URL
    // Should use the tag element of the notification once the final spec
    // lands:
    // See: https://bugzilla.mozilla.org/show_bug.cgi?id=782211
    navigator.mozApps.getSelf().onsuccess = function _onAppReady(evt) {
      var app = evt.target.result;
      var iconURL = NotificationHelper.getIconURI(app);
      iconURL += '?dataUsage';

      var goToDataUsage;
      if (!inStandAloneMode()) {
        goToDataUsage = function _goToDataUsage() {
          app.launch();
          window.parent.CostControlApp.showDataUsageTab();
        };
      }

      var limit = getDataLimit(settings);
      if (settings.dataLimit) {
        if (usage >= limit && !settings.dataUsageNotified) {
          var limitText = formatData(smartRound(limit));
          var title = _('data-limit-notification-title2', { limit: limitText });
          var message = _('data-limit-notification-text2');
          NotificationHelper.send(title, message, iconURL, goToDataUsage);
          ConfigManager.setOption({ 'dataUsageNotified': true }, callback);
          return true;

        } else if (usage < limit && settings.dataUsageNotified) {
          ConfigManager.setOption({ 'dataUsageNotified': false }, callback);
          return false;
        }
      }

      if (callback) {
        callback();
      }
      return false;
    };
  }
  window.checkDataUsageNotification = checkDataUsageNotification;

  // Register in standalone or for application
  var costcontrol;
  function _getCCInstance() {
    CostControl.getInstance(function _onCostControl(ccontrol) {
      costcontrol = ccontrol;

      if (inStandAloneMode() || inWidgetMode()) {
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

            // TODO: Remove the SMS

            if (isBalance) {
              // Compose new balance
              var integer = balanceData[1].replace(/[^0-9]/g, '');
              var decimal = balanceData[2] || '0';
              var newBalance = {
                balance: parseFloat(integer + '.' + decimal),
                currency: configuration.credit.currency,
                timestamp: new Date()
              };

              // Remove the timeout
              navigator.mozAlarms.remove(settings.waitingForBalance);
              debug('Balance timeout:', settings.waitingForBalance, 'removed');

              // Store new balance and sync
              ConfigManager.setOption(
                { 'lastBalance': newBalance, 'waitingForBalance': null },
                function _onSet() {
                  debug('Balance up to date and stored');
                  debug('Trying to synchronize!');
                  localStorage['sync'] = 'lastBalance#' + Math.random();
                  sendBalanceThresholdNotification(newBalance, settings,
                                                   closeIfProceeds);
                }
              );
            } else if (isConfirmation) {
              // Store SUCCESS for TopIp and sync
              navigator.mozAlarms.remove(settings.waitingForTopUp);
              debug('TopUp timeout:', settings.waitingForTopUp, 'removed');
              ConfigManager.setOption(
                {
                  'waitingForTopUp': null,
                  'lowLimitNotified': false,
                  'zeroBalanceNotified': false
                },
                function _onSet() {
                  debug('TopUp confirmed!');
                  debug('Trying to synchronize!');
                  localStorage['sync'] = 'waitingForTopUp#' + Math.random();
                  closeIfProceeds();
                }
              );
            } else if (isError) {
              // Store ERROR for TopUp and sync
              settings.errors['INCORRECT_TOPUP_CODE'] = true;
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
                  localStorage['sync'] = 'errors#' + Math.random();
                  sendIncorrectTopUpNotification(closeIfProceeds);
                }
              );
            }
          });
        });


        navigator.mozSetMessageHandler('alarm', _onAlarm);

        // Count a new SMS
        navigator.mozSetMessageHandler('sms-sent', function _onSent(sms) {
          clearTimeout(closing);
          debug('SMS sent!');

          ConfigManager.requestAll(function _onInfo(configuration, settings) {
            var mode = ConfigManager.getApplicationMode();
            if (mode === 'PREPAID' &&
                !costcontrol.isBalanceRequestSMS(sms, configuration)) {
              costcontrol.request({ type: 'balance' });
            }

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
              updateSMSCount(settings, realCount);
            };
            infoRequest.onerror = function onError() {
              console.error('Can not retrieve segment info for body ' +
                             sms.body);
              updateSMSCount(settings, 1);
            };
          });

          function updateSMSCount(settings, count) {
            settings.lastTelephonyActivity.timestamp = new Date();
            settings.lastTelephonyActivity.smscount += count;
            ConfigManager.setOption({
              lastTelephonyActivity: settings.lastTelephonyActivity
            }, function _sync() {
              localStorage['sync'] = 'lastTelephonyActivity#' + Math.random();
              closeIfProceeds();
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

            ConfigManager.requestSettings(function _onSettings(settings) {
              var mode = ConfigManager.getApplicationMode();
              if (mode === 'PREPAID') {
                costcontrol.request({ type: 'balance' });
              }

              settings.lastTelephonyActivity.timestamp = new Date();
              settings.lastTelephonyActivity.calltime += tcall.duration;
              ConfigManager.setOption({
                lastTelephonyActivity: settings.lastTelephonyActivity
              }, function _sync() {
                localStorage['sync'] = 'lastTelephonyActivity#' + Math.random();
                closeIfProceeds();
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
  if (Common.dataSimIccIdLoaded) {
    _getCCInstance();
  } else {
    Common.loadDataSIMIccId(_getCCInstance);
  }
}());
