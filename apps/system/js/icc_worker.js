/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* globals advanced_timer, DUMP, icc, icc_events, IccHelper,
           NotificationHelper, Service, STKHelper */

'use strict';

var icc_worker = {
  idleTextNotifications: {},
  // STK Applications menu list. On bootup this object is empty,
  // will be filled by 0x25 (STK_CMD_SET_UP_MENU) command.
  iccApplicationsMenu: {},

  dummy: function icc_worker_dummy(message) {
    DUMP('STK Command not implemented yet');
    icc.responseSTKCommand(message, {
      resultCode: icc._iccManager.STK_RESULT_OK
    });
  },

  // STK_CMD_REFRESH
  '0x1': function STK_CMD_REFRESH(message) {
    DUMP('STK_CMD_REFRESH', message.command.options);
    if (this.idleTextNotifications[message.iccId]) {
      this.idleTextNotifications[message.iccId].close();
    }
  },

  // STK_CMD_POLL_INTERVAL
  '0x3': function STK_CMD_POLL_INTERVAL(message) {
    DUMP('STK_CMD_POLL_INTERVAL', message.command.options);
    icc_worker.dummy(message);
  },

  // STK_CMD_POLL_OFF
  '0x4': function STK_CMD_POLL_OFF(message) {
    DUMP('STK_CMD_POLL_OFF', message.command.options);
    icc_worker.dummy(message);
  },

  // STK_CMD_SET_UP_EVENT_LIST
  '0x5': function STK_CMD_SET_UP_EVENT_LIST(message) {
    DUMP('STK_CMD_SET_UP_EVENT_LIST:', message.command.options);
    icc_events.register(message, message.command.options.eventList);
  },

  // STK_CMD_SET_UP_CALL
  '0x10': function STK_CMD_SET_UP_CALL(message) {
    function stkSetupCall(confirmed, postMessage) {
      icc.responseSTKCommand(message, {
        hasConfirmed: confirmed,
        resultCode: icc._iccManager.STK_RESULT_OK
      });
      if (confirmed && postMessage) {
        // Transfering the second alpha id to dialer (Bug #873906)
        window.navigator.mozSettings.createLock().set({
          'icc.callmessage': callMessage
        });
      }
    }

    DUMP('STK_CMD_SET_UP_CALL:', message.command.options);
    var options = message.command.options;

    var confirmMessage = STKHelper.getMessageText(options.confirmMessage,
        'icc-confirmCall-defaultmessage', {'number': options.address});
    var callMessage = STKHelper.getMessageText(options.callMessage);

    icc.discardCurrentMessageIfNeeded(message);

    if (confirmMessage) {
      if (STKHelper.isIconSelfExplanatory(options.confirmMessage)) {
        confirmMessage = '';
      }
      var icons = options.confirmMessage ? options.confirmMessage.icons : null;
      icc.asyncConfirm(message, confirmMessage, icons, function(confirmed) {
        stkSetupCall(confirmed, callMessage);
      });
    } else {
      stkSetupCall(true, callMessage);
    }
  },

  // STK_CMD_SEND_SS
  '0x11': function STK_CMD_SEND_SS(message) {
    DUMP('STK_CMD_SEND_SS:', message.command.options);
    var options = message.command.options;

    icc.discardCurrentMessageIfNeeded(message);

    var text = STKHelper.getMessageText(options, 'icc-alertMessage-send-ss');

    icc.alert(message, text, options.icons);
  },

  // STK_CMD_SEND_USSD
  '0x12': function STK_CMD_SEND_USSD(message) {
    DUMP('STK_CMD_SEND_USSD:', message.command.options);
    var options = message.command.options;
    icc.discardCurrentMessageIfNeeded(message);
    var text = STKHelper.getMessageText(options, 'icc-alertMessage-send-ussd');
    icc.confirm(message, text, options.icons);
  },

  // STK_CMD_SEND_SMS
  '0x13': function STK_CMD_SEND_SMS(message) {
    DUMP('STK_CMD_SEND_SMS:', message.command.options);
    var options = message.command.options;

    icc.discardCurrentMessageIfNeeded(message);

    var text = options.text;
    if (text) {
      text = STKHelper.getMessageText(options);
      icc.confirm(message, text, options.icons);
    } else if (text !== undefined) {
      text = STKHelper.getMessageText(options, 'icc-alertMessage-send-sms');
      icc.alert(message, text, options.icons);
    }
  },

  // STK_CMD_SEND_DTMF
  '0x14': function STK_CMD_SEND_DTMF(message) {
    DUMP('STK_CMD_SEND_DTMF:', message.command.options);
    var options = message.command.options;

    icc.discardCurrentMessageIfNeeded(message);

    var text = STKHelper.getMessageText(options,
      'icc-confirmMessage-defaultmessage');

    icc.alert(message, text, options.icons);
  },

  // STK_CMD_LAUNCH_BROWSER
  '0x15': function STK_CMD_LAUNCH_BROWSER(message) {
    DUMP('STK_CMD_LAUNCH_BROWSER:', message.command.options);
    var options = message.command.options;

    if (options.confirmMessage) {
      icc.discardCurrentMessageIfNeeded(message);
    }

    icc.responseSTKCommand(message, {
      resultCode: icc._iccManager.STK_RESULT_OK
    });
    var text = '';
    if (!STKHelper.isIconSelfExplanatory(options.confirmMessage)) {
      text = STKHelper.getMessageText(options.confirmMessage);
    }
    var icons = options.confirmMessage ? options.confirmMessage.icons : null;
    icc.showURL(message, options.url, icons, text);
  },

  // STK_CMD_PLAY_TONE
  '0x20': function STK_CMD_PLAY_TONE(message) {
    function getPhoneSound(toneCode) {
      toneCode =
        typeof(toneCode) == 'string' ? toneCode.charCodeAt(0) : toneCode;
      switch (toneCode) {
        case icc._iccManager.STK_TONE_TYPE_DIAL_TONE:
          return 'resources/dtmf_tones/350Hz+440Hz_200ms.ogg';
        case icc._iccManager.STK_TONE_TYPE_CALLED_SUBSCRIBER_BUSY:
          return 'resources/dtmf_tones/480Hz+620Hz_200ms.ogg';
        case icc._iccManager.STK_TONE_TYPE_CONGESTION:
          return 'resources/dtmf_tones/425Hz_200ms.ogg';
        case icc._iccManager.STK_TONE_TYPE_RADIO_PATH_ACK:
        case icc._iccManager.STK_TONE_TYPE_RADIO_PATH_NOT_AVAILABLE:
          return 'resources/dtmf_tones/425Hz_200ms.ogg';
        case icc._iccManager.STK_TONE_TYPE_ERROR:
          return 'resources/dtmf_tones/950Hz+1400Hz+1800Hz_200ms.ogg';
        case icc._iccManager.STK_TONE_TYPE_CALL_WAITING_TONE:
        case icc._iccManager.STK_TONE_TYPE_RINGING_TONE:
          return 'resources/dtmf_tones/425Hz_200ms.ogg';
        case icc._iccManager.STK_TONE_TYPE_GENERAL_BEEP:
          return 'resources/dtmf_tones/400Hz_200ms.ogg';
        case icc._iccManager.STK_TONE_TYPE_POSITIVE_ACK_TONE:
          return 'resources/dtmf_tones/425Hz_200ms.ogg';
        case icc._iccManager.STK_TONE_TYPE_NEGATIVE_ACK_TONE:
          return 'resources/dtmf_tones/300Hz+400Hz+500Hz_400ms.ogg';
        default:
          return 'resources/dtmf_tones/350Hz+440Hz_200ms.ogg';
      }
    }

    DUMP('STK_CMD_PLAY_TONE:', message.command.options);
    var options = message.command.options;

    if (options.text) {
      icc.discardCurrentMessageIfNeeded(message);
    }

    var tonePlayer = new Audio();
    tonePlayer.src = getPhoneSound(options.tone);
    tonePlayer.loop = true;

    var timeout = 0;
    var duration = options.duration;
    if (duration && duration.timeUnit !== undefined &&
        duration.timeInterval !== undefined) {
      timeout = icc.calculateDurationInMS(duration.timeUnit,
        duration.timeInterval);
    } else if (options.timeUnit !== undefined &&
        options.timeInterval !== undefined) {
      timeout = icc.calculateDurationInMS(options.timUnit,
        options.timeInterval);
    } else {
      timeout = icc._toneDefaultTimeout;
    }
    timeout && DUMP('Tone stop in (ms): ', timeout);

    if (options.text) {
      var text = STKHelper.getMessageText(options);
      icc.confirm(message, text, options.icons, timeout, function(userCleared) {
        tonePlayer.pause();
        if (userCleared == null) {  // Back && Terminate
          return;
        }
        icc.responseSTKCommand(message, {
          resultCode: icc._iccManager.STK_RESULT_OK
        });
      });
    } else {
      // If no dialog is showed, we answer the STK command
      icc.responseSTKCommand(message, {
        resultCode: icc._iccManager.STK_RESULT_OK
      });
      // Stop playing after timeout
      setTimeout(function _iccTonePlayerStop() {
        tonePlayer.pause();
      }, timeout);
    }

    if (options.isVibrate) {
      window.navigator.vibrate([200]);
    }

    tonePlayer.play();
  },

  // STK_CMD_DISPLAY_TEXT
  '0x21': function STK_CMD_DISPLAY_TEXT(message) {
    DUMP('STK_CMD_DISPLAY_TEXT:', message.command.options);
    var options = message.command.options;

    icc.discardCurrentMessageIfNeeded(message);

    // Check if device is idle or settings
    var activeApp = Service.currentApp;
    var settingsOrigin = window.location.origin.replace('system', 'settings');
    if (!options.isHighPriority && activeApp && !activeApp.isHomescreen &&
        activeApp.origin !== settingsOrigin) {
      DUMP('Do not display the text because normal priority.');
      icc.responseSTKCommand(message, {
        resultCode:
          icc._iccManager.STK_RESULT_TERMINAL_CRNTLY_UNABLE_TO_PROCESS,
        additionalInformation: 0x01
      });
      return;
    }

    var text = STKHelper.getMessageText(options);
    var timeout = icc._displayTextTimeout;
    var duration = options.duration;
    if (duration && duration.timeUnit !== undefined &&
        duration.timeInterval !== undefined) {
      timeout = icc.calculateDurationInMS(duration.timeUnit,
        duration.timeInterval);
    }

    if (options.responseNeeded) {
      icc.responseSTKCommand(message, {
        resultCode: icc._iccManager.STK_RESULT_OK
      });
      icc.confirm(message, text, options.icons, timeout, null);
    } else {
      icc.confirm(message, text, options.icons, timeout,
        function(userCleared) {
          if (userCleared == null) {
            return;   // ICC Back or ICC Terminate
          }
          DUMP('STK_CMD_DISPLAY_TEXT callback for ', message.command);
          if (options.userClear && !userCleared) {
            DUMP('No response from user (Timeout)');
            icc.responseSTKCommand(message, {
              resultCode:
                icc._iccManager.STK_RESULT_NO_RESPONSE_FROM_USER
            });
          } else {
            DUMP('Alert closed');
            icc.responseSTKCommand(message, {
              resultCode: icc._iccManager.STK_RESULT_OK
            });
          }
        });
    }
  },

  // STK_CMD_GET_INKEY
  '0x22': function STK_CMD_GET_INKEY(message) {
    DUMP('STK_CMD_GET_INKEY:', message.command.options);
    this['0x23'](message);
  },

  // STK_CMD_GET_INPUT
  '0x23': function STK_CMD_GET_INPUT(message) {
    DUMP('STK_CMD_GET_INPUT:', message.command.options);
    var options = message.command.options;

    icc.discardCurrentMessageIfNeeded(message);

    DUMP('STK Input title: ' + options.text);

    var duration = options.duration;
    var timeout = (duration &&
      icc.calculateDurationInMS(duration.timeUnit, duration.timeInterval)) ||
      icc._inputTimeout;
    var text = STKHelper.getMessageText(options);
    icc.input(message, text, options.icons, timeout, options,
      function(response, value) {
        if (response == null) {
          return;   // ICC Back or ICC Help
        }
        if (!response) {
          DUMP('STK_CMD_GET_INPUT: No response from user (Timeout)');
          icc.responseSTKCommand(message, {
            resultCode:
              icc._iccManager.STK_RESULT_NO_RESPONSE_FROM_USER
          });
        } else {
          DUMP('STK_CMD_GET_INPUT: Response = ', value);
          if (typeof value === 'boolean') {
            icc.responseSTKCommand(message, {
              resultCode: icc._iccManager.STK_RESULT_OK,
              isYesNo: value
            });
          } else {
            icc.responseSTKCommand(message, {
              resultCode: icc._iccManager.STK_RESULT_OK,
              input: value
            });
          }
        }
      });
  },

  // STK_CMD_SELECT_ITEM
  '0x24': function STK_CMD_SELECT_ITEM(message) {
    var application = document.location.protocol + '//' +
      document.location.host.replace('system', 'settings');
    DUMP('STK_CMD_SET_UP_MENU. Transferring to ' + application + ': ',
      message.command);
    var reqIccData = window.navigator.mozSettings.createLock().set({
      'icc.data': JSON.stringify(message)
    });
    reqIccData.onsuccess = function icc_getIccData() {
      if (window.appWindowManager.getApp(application)) {
        return DUMP('Settings is running. Ignoring');
      }
      navigator.mozApps.mgmt.getAll().onsuccess = function gotApps(evt) {
        var apps = evt.target.result;
        apps.forEach(function appIterator(app) {
          if (app.origin != application) {
            return;
          }
          DUMP('Launching ', app.origin);
          app.launch();
        }, this);
      };
    };
  },

  // STK_CMD_SET_UP_MENU
  '0x25': function STK_CMD_SET_UP_MENU(message) {
    DUMP('STK_CMD_SET_UP_MENU:', message.command.options);
    var settings = window.navigator.mozSettings;

    // With test/fake commands: No SIM detected; we set it as SIM 0
    this.iccApplicationsMenu[icc.getSIMNumber(message.iccId) || 0] = {
      iccId: message.iccId,
      entries: message.command.options
    };

    // Update this.iccApplicationsMenu cache
    var reqApplications = settings.createLock().set({
      'icc.applications': JSON.stringify(this.iccApplicationsMenu)
    });
    var self = this;
    reqApplications.onsuccess = function icc_getApplications() {
      DUMP('STK: Cached - ', self.iccApplicationsMenu);
      icc.responseSTKCommand(message, {
        resultCode: icc._iccManager.STK_RESULT_OK
      });
    };
  },

  // STK_CMD_PROVIDE_LOCAL_INFO
  '0x26': function STK_CMD_PROVIDE_LOCAL_INFO(message) {
    var conn = icc.getConnection(message.iccId);

    DUMP('STK_CMD_PROVIDE_LOCAL_INFO:', message.command.options);
    switch (message.command.options.localInfoType) {
      case icc._iccManager.STK_LOCAL_INFO_LOCATION_INFO:
        DUMP('cell of connection - ' + conn.voice.cell);
        if (conn.voice.cell) {
          icc.responseSTKCommand(message, {
            localInfo: {
              locationInfo: {
                mcc: IccHelper.iccInfo.mcc,
                mnc: IccHelper.iccInfo.mnc,
                gsmLocationAreaCode: conn.voice.cell.gsmLocationAreaCode,
                gsmCellId: conn.voice.cell.gsmCellId
              }
            },
            resultCode: icc._iccManager.STK_RESULT_OK
          });
        } else {
          icc.responseSTKCommand(message, {
            resultCode: icc._iccManager.STK_RESULT_PRFRMD_LIMITED_SERVICE
          });
        }
        break;

      case icc._iccManager.STK_LOCAL_INFO_IMEI:
        // XXX: This should be made DSDS-aware, see also bug 980391
        navigator.mozTelephony.dial('*#06#').then(function(call) {
          return call.result.then(function getIMEI(result) {
            if (result.success && (result.serviceCode === 'scImei') &&
                result.statusMessage) {
              return result.statusMessage;
            } else {
              return 0;
            }
          });
        }).then(function(imei) {
          icc.responseSTKCommand(message, {
            localInfo: {
              imei: imei
            },
            resultCode:
              imei ? icc._iccManager.STK_RESULT_OK
                   : icc._iccManager.STK_RESULT_REQUIRED_VALUES_MISSING
          });
        });
        break;

      case icc._iccManager.STK_LOCAL_INFO_DATE_TIME_ZONE:
        icc.responseSTKCommand(message, {
          localInfo: {
            date: new Date()
          },
          resultCode: icc._iccManager.STK_RESULT_OK
        });
        break;

      case icc._iccManager.STK_LOCAL_INFO_LANGUAGE:
        var reqLanguage =
          window.navigator.mozSettings.createLock().get('language.current');
        reqLanguage.onsuccess = function icc_getLanguage() {
          icc.responseSTKCommand(message, {
            localInfo: {
              language: reqLanguage.result['language.current'].substring(0, 2)
            },
            resultCode: icc._iccManager.STK_RESULT_OK
          });
        };
        reqLanguage.onerror = function icc_getLanguageFailed() {
          icc.responseSTKCommand(message, {
            localInfo: {
              language: 'en'
            },
            resultCode:
              icc._iccManager.STK_RESULT_REQUIRED_VALUES_MISSING
          });
        };
        break;
    }
  },

  // STK_CMD_TIMER_MANAGEMENT
  '0x27': function STK_CMD_TIMER_MANAGEMENT(message) {
    DUMP('STK_CMD_TIMER_MANAGEMENT:', message.command.options);
    var a_timer = advanced_timer;
    var options = message.command.options;
    var pendingTime = 0;
    switch (options.timerAction) {
      case icc._iccManager.STK_TIMER_START:
        a_timer.start(options.timerId, options.timerValue * 1000,
          function(realUsedTimeMs) {
            DUMP('Timer expiration - ' + options.timerId +
              ' - real used time ' + realUsedTimeMs);
            (icc.getIcc(message.iccId)).sendStkTimerExpiration({
              'timerId': options.timerId,
              'timerValue': realUsedTimeMs / 1000
            });
          });
        icc.responseSTKCommand(message, {
          timer: {
            'timerId': options.timerId,
            'timerValue': options.timerValue,
            'timerAction': icc._iccManager.STK_TIMER_START
          },
          resultCode: icc._iccManager.STK_RESULT_OK
        });
        break;

      case icc._iccManager.STK_TIMER_DEACTIVATE:
        if (a_timer.queryPendingTime(options.timerId) === 0) {
          icc.responseSTKCommand(message, {
            timer: {
              'timerId': options.timerId
            },
            resultCode:
              icc._iccManager.STK_RESULT_ACTION_CONTRADICTION_TIMER_STATE
          });
        } else {
          pendingTime = a_timer.stop(options.timerId) / 1000;
          icc.responseSTKCommand(message, {
            timer: {
              'timerId': options.timerId,
              'timerValue': pendingTime,
              'timerAction': icc._iccManager.STK_TIMER_DEACTIVATE
            },
            resultCode: icc._iccManager.STK_RESULT_OK
          });
        }
        break;

      case icc._iccManager.STK_TIMER_GET_CURRENT_VALUE:
        pendingTime = a_timer.queryPendingTime(options.timerId) / 1000;
        if (pendingTime === 0) {
          icc.responseSTKCommand(message, {
            timer: {
              'timerId': options.timerId
            },
            resultCode:
              icc._iccManager.STK_RESULT_ACTION_CONTRADICTION_TIMER_STATE
          });
        } else {
          icc.responseSTKCommand(message, {
            timer: {
              'timerId': options.timerId,
              'timerValue': pendingTime,
              'timerAction': icc._iccManager.STK_TIMER_GET_CURRENT_VALUE
            },
            resultCode: icc._iccManager.STK_RESULT_OK
          });
        }
        break;
    }
  },

  // STK_CMD_SET_UP_IDLE_MODE_TEXT
  '0x28': function STK_CMD_SET_UP_IDLE_MODE_TEXT(message) {
    DUMP('STK_CMD_SET_UP_IDLE_MODE_TEXT:', message.command.options);
    var options = message.command.options;

    return NotificationHelper.send(
      {
        id: 'icc-notification-title',
        args: { id: icc.getSIMNumber(message.iccId) }
      },
      {
        body: options.text,
        icon: 'style/icons/system.png',
        tag: 'stkNotification_' + message.iccId,
        mozbehavior: {
          showOnlyOnce: true
        }
      }
    ).then((notification) => {
      this.idleTextNotifications[message.iccId] = notification;
      notification.onclick = function onClickSTKNotification() {
        icc.discardCurrentMessageIfNeeded(message);
        var text = STKHelper.getMessageText(options);
        icc.alert(message, text, options.icons);
      };
      notification.onshow = function onShowSTKNotification() {
        icc.responseSTKCommand(message, {
          resultCode: icc._iccManager.STK_RESULT_OK
        });
      };
    });
  }

};
