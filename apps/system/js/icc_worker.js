/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var icc_worker = {
  dummy: function icc_worker_dummy(iccManager) {
    DUMP('STK Command not implemented yet');
    iccManager.responseSTKCommand({
      resultCode: iccManager._icc.STK_RESULT_OK
    });
  },

  // STK_CMD_REFRESH
  '0x1': function STK_CMD_REFRESH(command, iccManager) {
    // https://bugzilla.mozilla.org/show_bug.cgi?id=800271#c10
    DUMP('STK_CMD_REFRESH', command.options);
    icc_worker.dummy(iccManager);
  },

  // STK_CMD_POLL_INTERVAL
  '0x3': function STK_CMD_POLL_INTERVAL(command, iccManager) {
    DUMP('STK_CMD_POLL_INTERVAL', command.options);
    icc_worker.dummy(iccManager);
  },

  // STK_CMD_POLL_OFF
  '0x4': function STK_CMD_POLL_OFF(command, iccManager) {
    DUMP('STK_CMD_POLL_OFF', command.options);
    icc_worker.dummy(iccManager);
  },

  // STK_CMD_SET_UP_EVENT_LIST
  '0x5': function STK_CMD_SET_UP_EVENT_LIST(command, iccManager) {
    DUMP('STK_CMD_SET_UP_EVENT_LIST:', command.options);
    icc_events.register(command.options.eventList);
    iccManager.responseSTKCommand({
      resultCode: iccManager._icc.STK_RESULT_OK
    });
  },

  // STK_CMD_SET_UP_CALL
  '0x10': function STK_CMD_SET_UP_CALL(command, iccManager) {
    function stkSetupCall(confirmed, postMessage) {
      iccManager.responseSTKCommand({
        hasConfirmed: confirmed,
        resultCode: iccManager._icc.STK_RESULT_OK
      });
      if (confirmed && postMessage) {
        iccManager.alert(postMessage);
      }
    }

    var _ = navigator.mozL10n.get;
    DUMP('STK_CMD_SET_UP_CALL:', command.options);
    var options = command.options;
    if (options.confirmMessage == '') {
      options.confirmMessage = _(
        'icc-confirmCall-defaultmessage', {
          'number': options.address
        });
    }
    if (options.confirmMessage) {
      iccManager.asyncConfirm(options.confirmMessage, function(confirmed) {
        stkSetupCall(confirmed, options.callMessage);
      });
    } else {
      stkSetupCall(true, options.callMessage);
    }
  },

  // STK_CMD_SEND_SS
  '0x11': function STK_CMD_SEND_SS(command, iccManager) {
    DUMP('STK_CMD_SEND_SS:', command.options);
    var options = command.options;
    iccManager.responseSTKCommand({
      resultCode: iccManager._icc.STK_RESULT_OK
    });
    if (!options.text) {
      var _ = navigator.mozL10n.get;
      options.text = _('icc-alertMessage-defaultmessage');
    }
    iccManager.alert(options.text);
  },

  // STK_CMD_SEND_USSD
  '0x12': function STK_CMD_SEND_USSD(command, iccManager) {
    DUMP('STK_CMD_SEND_USSD:', command.options);
    this['0x13'](command, iccManager);
  },

  // STK_CMD_SEND_SMS
  '0x13': function STK_CMD_SEND_SMS(command, iccManager) {
    DUMP('STK_CMD_SEND_SMS:', command.options);
    var options = command.options;
    iccManager.responseSTKCommand({
      resultCode: iccManager._icc.STK_RESULT_OK
    });
    if (options.text) {
      iccManager.confirm(options.text);
    } else if (options.text != undefined) {
      var _ = navigator.mozL10n.get;
      iccManager.alert(_('icc-alertMessage-defaultmessage'));
    }
  },

  // STK_CMD_SEND_DTMF
  '0x14': function STK_CMD_SEND_DTMF(command, iccManager) {
    DUMP('STK_CMD_SEND_DTMF:', command.options);
    var options = command.options;
    if (options.text) {
      iccManager.responseSTKCommand({
        resultCode: iccManager._icc.STK_RESULT_OK
      });
      iccManager.alert(options.text);
    } else if (options.text == '') {
      var _ = navigator.mozL10n.get;
      iccManager.confirm(_('icc-confirmMessage-defaultmessage'), 0,
        function(userCleared) {
          if (userCleared) {
            iccManager.responseSTKCommand({
              resultCode: iccManager._icc.STK_RESULT_OK
            });
          } else {
            iccManager.responseSTKCommand({
              resultCode: iccManager._icc.STK_RESULT_UICC_SESSION_TERM_BY_USER
            });
          }
        });
    } else {
      iccManager.responseSTKCommand({
        resultCode: iccManager._icc.STK_RESULT_OK
      });
    }
  },

  // STK_CMD_LAUNCH_BROWSER
  '0x15': function STK_CMD_LAUNCH_BROWSER(command, iccManager) {
    DUMP('STK_CMD_LAUNCH_BROWSER:', command.options);
    var options = command.options;
    iccManager.responseSTKCommand({
      resultCode: iccManager._icc.STK_RESULT_OK
    });
    iccManager.showURL(options.url, options.confirmMessage);
  },

  // STK_CMD_PLAY_TONE
  '0x20': function STK_CMD_PLAY_TONE(command, iccManager) {
    function getPhoneSound(toneCode) {
      toneCode =
        typeof(toneCode) == 'string' ? toneCode.charCodeAt(0) : toneCode;
      switch (toneCode) {
        case iccManager._icc.STK_TONE_TYPE_DIAL_TONE:
          return 'resources/dtmf_tones/350Hz+440Hz_200ms.ogg';
        case iccManager._icc.STK_TONE_TYPE_CALLED_SUBSCRIBER_BUSY:
          return 'resources/dtmf_tones/480Hz+620Hz_200ms.ogg';
        case iccManager._icc.STK_TONE_TYPE_CONGESTION:
          return 'resources/dtmf_tones/425Hz_200ms.ogg';
        case iccManager._icc.STK_TONE_TYPE_RADIO_PATH_ACK:
        case iccManager._icc.STK_TONE_TYPE_RADIO_PATH_NOT_AVAILABLE:
          return 'resources/dtmf_tones/425Hz_200ms.ogg';
        case iccManager._icc.STK_TONE_TYPE_ERROR:
          return 'resources/dtmf_tones/950Hz+1400Hz+1800Hz_200ms.ogg';
        case iccManager._icc.STK_TONE_TYPE_CALL_WAITING_TONE:
        case iccManager._icc.STK_TONE_TYPE_RINGING_TONE:
          return 'resources/dtmf_tones/425Hz_200ms.ogg';
        case iccManager._icc.STK_TONE_TYPE_GENERAL_BEEP:
          return 'resources/dtmf_tones/400Hz_200ms.ogg';
        case iccManager._icc.STK_TONE_TYPE_POSITIVE_ACK_TONE:
          return 'resources/dtmf_tones/425Hz_200ms.ogg';
        case iccManager._icc.STK_TONE_TYPE_NEGATIVE_ACK_TONE:
          return 'resources/dtmf_tones/300Hz+400Hz+500Hz_400ms.ogg';
        default:
          return 'resources/dtmf_tones/350Hz+440Hz_200ms.ogg';
      }
    }

    DUMP('STK_CMD_PLAY_TONE:', command.options);
    var options = command.options;

    var tonePlayer = new Audio();
    tonePlayer.src = getPhoneSound(options.tone);
    tonePlayer.loop = true;

    var timeout = 0;
    if (options.duration &&
        options.duration.timeUnit != undefined &&
        options.duration.timeInterval != undefined) {
      timeout = iccManager.calculateDurationInMS(options.duration.timeUnit,
        options.duration.timeInterval);
    } else if (options.timeUnit != undefined &&
        options.timeInterval != undefined) {
      timeout = iccManager.calculateDurationInMS(options.timUnit,
        options.timeInterval);
    }
    timeout && DUMP('Tone stop in (ms): ', timeout);

    if (options.text) {
      iccManager.confirm(options.text, timeout, function(userCleared) {
        tonePlayer.pause();
        if (userCleared == null) {  // Back && Terminate
          return;
        }
        iccManager.responseSTKCommand({
          resultCode: iccManager._icc.STK_RESULT_OK
        });
      });
    } else {
      // If no dialog is showed, we answer the STK command
      iccManager.responseSTKCommand({
        resultCode: iccManager._icc.STK_RESULT_OK
      });
    }

    if (options.isVibrate) {
      window.navigator.vibrate([200]);
    }

    tonePlayer.play();
  },

  // STK_CMD_DISPLAY_TEXT
  '0x21': function STK_CMD_DISPLAY_TEXT(command, iccManager) {
    DUMP('STK_CMD_DISPLAY_TEXT:', command.options);
    var options = command.options;
    if (options.responseNeeded) {
      iccManager.responseSTKCommand({
        resultCode: iccManager._icc.STK_RESULT_OK
      });
      iccManager.confirm(options.text, iccManager._displayTextTimeout, null);
    } else {
      iccManager.confirm(options.text, iccManager._displayTextTimeout,
        function(userCleared) {
          if (userCleared == null) {
            return;   // ICC Back or ICC Terminate
          }
          DUMP('STK_CMD_DISPLAY_TEXT callback for ', command);
          if (options.userClear && !userCleared) {
            DUMP('No response from user (Timeout)');
            iccManager.responseSTKCommand({
              resultCode: iccManager._icc.STK_RESULT_NO_RESPONSE_FROM_USER
            });
          } else {
            DUMP('Alert closed');
            iccManager.responseSTKCommand({
              resultCode: iccManager._icc.STK_RESULT_OK
            });
          }
        });
    }
  },

  // STK_CMD_GET_INKEY
  '0x22': function STK_CMD_GET_INKEY(command, iccManager) {
    DUMP('STK_CMD_GET_INKEY:', command.options);
    this['0x23'](command, iccManager);
  },

  // STK_CMD_GET_INPUT
  '0x23': function STK_CMD_GET_INPUT(command, iccManager) {
    DUMP('STK_CMD_GET_INPUT:', command.options);
    var options = command.options;

    DUMP('STK Input title: ' + options.text);

    document.addEventListener('visibilitychange',
      function stkInputNoAttended() {
        document.removeEventListener('visibilitychange', stkInputNoAttended,
          true);
        iccManager.responseSTKCommand({
          resultCode: iccManager._icc.STK_RESULT_UICC_SESSION_TERM_BY_USER
        });
        iccManager.hideViews();
      }, true);

    var timeout = options.duration ||
      iccManager.calculateDurationInMS(options.duration) ||
      iccManager._inputTimeout;
    iccManager.input(options.text, timeout, options,
      function(response, value) {
        if (response == null) {
          return;   // ICC Back or ICC Help
        }
        if (!response) {
          DUMP('STK_CMD_GET_INPUT: No response from user (Timeout)');
          iccManager.responseSTKCommand({
            resultCode: iccManager._icc.STK_RESULT_NO_RESPONSE_FROM_USER
          });
        } else {
          DUMP('STK_CMD_GET_INPUT: Response = ', value);
          iccManager.responseSTKCommand({
            resultCode: iccManager._icc.STK_RESULT_OK,
            input: value
          });
        }
      });
  },

  // STK_CMD_SELECT_ITEM
  '0x24': function STK_CMD_SELECT_ITEM(command, iccManager) {
    var application = document.location.protocol + '//' +
      document.location.host.replace('system', 'settings');
    DUMP('STK_CMD_SET_UP_MENU. Transferring to ' + application + ': ', command);
    var reqIccData = window.navigator.mozSettings.createLock().set({
      'icc.data': JSON.stringify(command)
    });
    reqIccData.onsuccess = function icc_getIccData() {
      if (WindowManager.getRunningApps()[application]) {
        return DUMP('Settings is running. Ignoring');
      }
      navigator.mozApps.mgmt.getAll().onsuccess = function gotApps(evt) {
        var apps = evt.target.result;
        apps.forEach(function appIterator(app) {
          if (app.origin != application)
            return;
          DUMP('Launching ', app.origin);
          app.launch();
        }, this);
      };
    };
  },

  // STK_CMD_SET_UP_MENU
  '0x25': function STK_CMD_SET_UP_MENU(command, iccManager) {
    DUMP('STK_CMD_SET_UP_MENU:', command.options);
    var reqApplications = window.navigator.mozSettings.createLock().set({
      'icc.applications': JSON.stringify(command.options)
    });
    reqApplications.onsuccess = function icc_getApplications() {
      DUMP('Cached');
      iccManager.responseSTKCommand({
        resultCode: iccManager._icc.STK_RESULT_OK
      });
    };
  },

  // STK_CMD_PROVIDE_LOCAL_INFO
  '0x26': function STK_CMD_PROVIDE_LOCAL_INFO(command, iccManager) {
    // https://bugzilla.mozilla.org/show_bug.cgi?id=817952
    DUMP('STK_CMD_PROVIDE_LOCAL_INFO', command.options);
    icc_worker.dummy(iccManager);
  },

  // STK_CMD_TIMER_MANAGEMENT
  '0x27': function STK_CMD_TIMER_MANAGEMENT(command, iccManager) {
    // https://bugzilla.mozilla.org/show_bug.cgi?id=817954
    DUMP('STK_CMD_TIMER_MANAGEMENT', command.options);
    icc_worker.dummy(iccManager);
  },

  // STK_CMD_SET_UP_IDLE_MODE_TEXT
  '0x28': function STK_CMD_SET_UP_IDLE_MODE_TEXT(command, iccManager) {
    DUMP('STK_CMD_SET_UP_IDLE_MODE_TEXT:', command.options);
    var options = command.options;
    NotificationHelper.send('STK', options.text, '', function() {
      iccManager.alert(options.text);
    });
    iccManager.responseSTKCommand({
      resultCode: iccManager._icc.STK_RESULT_OK
    });
  }

};
