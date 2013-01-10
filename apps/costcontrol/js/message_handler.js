
(function() {

  'use strict';

  function inStandAloneMode() {
    return window.parent.location.pathname === '/message_handler.html';
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
    debug('Nothing to do, closing...')
    window.history.back();
  }

  function inApplicationMode() {
    return window.parent.location.pathname === '/index.html';
  }

  // Close if in standalone mode
  function closeIfProceeds() {
    debug('Trying to close...');
    if (inStandAloneMode()) {
      setTimeout(function _close() {
        window.close();
        debug('Closing message handler');
      }, 500);
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
  function setNextReset(when) {
    asyncStorage.getItem('nextResetAlarm', function(id) {
      debug('Current nextResetAlarm', id + '.', id ? 'Removing.' : '');
      if (id)
        navigator.mozAlarms.remove(id);

      if (!when) {
        ConfigManager.setOption({ nextReset: null });
        return;
      }

      var request = navigator.mozAlarms.add(when, 'ignoreTimezone',
                                            {type: 'nextReset' });
      request.onsuccess = function _onSuccess() {
        ConfigManager.setOption({ nextReset: when }, function _sync() {
            localStorage['sync'] = 'nextReset#' + Math.random();
        });
        debug('Setting nextResetAlarm', request.result, 'to', when);
        asyncStorage.setItem('nextResetAlarm', request.result);
      };
    });
  };
  window.setNextReset = setNextReset;

  // Register in standalone or for application
  if (inStandAloneMode() || inApplicationMode()) {
    debug('Installing handlers');

    // When receiving an SMS, recognize and parse
    window.navigator.mozSetMessageHandler('sms-received', function _onSMS(sms) {
      ConfigManager.requestAll(function _onInfo(configuration, settings) {
        // Non expected SMS
        if (configuration.balance.senders.indexOf(sms.sender) === -1 &&
            configuration.topup.senders.indexOf(sms.sender) === -1) {
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
        isBalance = !!balanceData;
        if (!isBalance || balanceData.length < 2) {
          console.warn('Impossible to parse balance message.');

          debug('Trying to recognize TopUp confirmation SMS');
          description = new RegExp(configuration.topup.confirmation_regexp);
          isConfirmation = !!sms.body.match(description);
          if (!isConfirmation) {
            console.warn('Impossible to parse TopUp confirmation message.');

            debug('Trying to recognize TopUp error SMS');
            description = new RegExp(configuration.topup.incorrect_code_regexp);
            isError = !!sms.body.match(description);
            if (!isError)
              console.warn('Impossible to parse TopUp confirmation message.');
          }

        }

        if (!isBalance && !isConfirmation && !isError)
          return;

        // TODO: Remove the SMS

        if (isBalance) {
          // Compose new balance
          var integer = balanceData[1];
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
              closeIfProceeds();
            }
          );
        } else if (isConfirmation) {
          // Store SUCCESS for TopIp and sync
          navigator.mozAlarms.remove(settings.waitingForTopUp);
          debug('TopUp timeout:', settings.waitingForTopUp, 'removed');
          ConfigManager.setOption(
            { 'waitingForTopUp': null },
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
            { 'errors': settings.errors, 'waitingForTopUp': null },
            function _onSet() {
              debug('Balance up to date and stored');
              debug('Trying to synchronize!');
              localStorage['sync'] = 'errors#' + Math.random();
              closeIfProceeds();
            }
          );
        }
      });
    });

    // Whan receiving an alarm, differenciate by type and act
    window.navigator.mozSetMessageHandler('alarm', function _onAlarm(alarm) {
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
            resetAll();
            updateNextReset(settings.trackingPeriod, settings.resetTime);
            closeIfProceeds();
          });
          break;
      }
    });

    // Count a new SMS
    window.navigator.mozSetMessageHandler('sms-sent', function _onSMSSent(sms) {
      ConfigManager.requestSettings(function _onSettings(settings) {
        debug('SMS sent!');
        var manager = window.navigator.mozSms;
        var smsInfo = manager.getSegmentInfoForText(sms.body);
        var realCount = smsInfo.segments;
        settings.lastTelephonyActivity.timestamp = new Date();
        settings.lastTelephonyActivity.smscount += realCount;
        ConfigManager.setOption({
          lastTelephonyActivity: settings.lastTelephonyActivity
        }, function _sync() {
          localStorage['sync'] = 'lastTelephonyActivity#' + Math.random();
          closeIfProceeds();
        });
      });
    });

    // When a call ends
    window.navigator.mozSetMessageHandler('telephony-call-ended',
      function _onCall(tcall) {
        if (tcall.direction !== 'outgoing')
          return;

        debug('Outgoing call finished!');
        ConfigManager.requestSettings(function _onSettings(settings) {
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
}());
