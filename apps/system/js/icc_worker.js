/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var icc_worker = {
  // STK_CMD_REFRESH
  //'0x01': function STK_CMD_REFRESH(command, iccManager) {},

  // STK_CMD_POLL_INTERVAL
  //'0x03': function STK_CMD_POLL_INTERVAL(command, iccManager) {},

  // STK_CMD_POLL_OFF
  //'0x04': function STK_CMD_POLL_OFF(command, iccManager) {},

  // STK_CMD_SET_UP_EVENT_LIST
  //'0x05': function STK_CMD_SET_UP_EVENT_LIST(command, iccManager) {},

  // STK_CMD_SET_UP_CALL
  //'0x10': function STK_CMD_SET_UP_CALL(command, iccManager) {},

  // STK_CMD_SEND_SS
  //'0x11': function STK_CMD_SEND_SS(command, iccManager) {},

  // STK_CMD_SEND_USSD
  //'0x12': function STK_CMD_SEND_USSD(command, iccManager) {},

  // STK_CMD_SEND_SMS
  //'0x13': function STK_CMD_SEND_SMS(command, iccManager) {},

  // STK_CMD_SEND_DTMF
  //'0x14': function STK_CMD_SEND_DTMF(command, iccManager) {},

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
  //'0x20': function STK_CMD_PLAY_TONE(command, iccManager) {},

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
  //'0x22': function STK_CMD_GET_INKEY(command, iccManager) {},

  // STK_CMD_GET_INPUT
  //'0x23': function STK_CMD_GET_INPUT(command, iccManager) {},

  // STK_CMD_SELECT_ITEM
  //'0x24': function STK_CMD_SELECT_ITEM(command, iccManager) {},

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
  //'0x26': function STK_CMD_PROVIDE_LOCAL_INFO(command, iccManager) {},

  // STK_CMD_TIMER_MANAGEMENT
  //'0x27': function STK_CMD_TIMER_MANAGEMENT(command, iccManager) {},

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
