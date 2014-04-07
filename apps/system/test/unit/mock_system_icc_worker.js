'use strict';

/* exported MockSystemICCWorker */

function MockSystemICCWorker() {
  return {
    onmessagereceived: function() {},

    // STK_CMD_REFRESH
    '0x1': function STK_CMD_REFRESH(message) {
      this.onmessagereceived(message);
    },

    // STK_CMD_POLL_INTERVAL
    '0x3': function STK_CMD_POLL_INTERVAL(message) {
      this.onmessagereceived(message);
    },

    // STK_CMD_POLL_OFF
    '0x4': function STK_CMD_POLL_OFF(message) {
      this.onmessagereceived(message);
    },

    // STK_CMD_SET_UP_EVENT_LIST
    '0x5': function STK_CMD_SET_UP_EVENT_LIST(message) {
      this.onmessagereceived(message);
    },

    // STK_CMD_SET_UP_CALL
    '0x10': function STK_CMD_SET_UP_CALL(message) {
      this.onmessagereceived(message);
    },

    // STK_CMD_SEND_SS
    '0x11': function STK_CMD_SEND_SS(message) {
      this.onmessagereceived(message);
    },

    // STK_CMD_SEND_USSD
    '0x12': function STK_CMD_SEND_USSD(message) {
      this.onmessagereceived(message);
    },

    // STK_CMD_SEND_SMS
    '0x13': function STK_CMD_SEND_SMS(message) {
      this.onmessagereceived(message);
    },

    // STK_CMD_SEND_DTMF
    '0x14': function STK_CMD_SEND_DTMF(message) {
      this.onmessagereceived(message);
    },

    // STK_CMD_LAUNCH_BROWSER
    '0x15': function STK_CMD_LAUNCH_BROWSER(message) {
      this.onmessagereceived(message);
    },

    // STK_CMD_PLAY_TONE
    '0x20': function STK_CMD_PLAY_TONE(message) {
      this.onmessagereceived(message);
    },

    // STK_CMD_DISPLAY_TEXT
    '0x21': function STK_CMD_DISPLAY_TEXT(message) {
      this.onmessagereceived(message);
    },

    // STK_CMD_GET_INKEY
    '0x22': function STK_CMD_GET_INKEY(message) {
      this.onmessagereceived(message);
    },

    // STK_CMD_GET_INPUT
    '0x23': function STK_CMD_GET_INPUT(message) {
      this.onmessagereceived(message);
    },

    // STK_CMD_SELECT_ITEM
    '0x24': function STK_CMD_SELECT_ITEM(message) {
      this.onmessagereceived(message);
    },

    // STK_CMD_SET_UP_MENU
    '0x25': function STK_CMD_SET_UP_MENU(message) {
      this.onmessagereceived(message);
    },

    // STK_CMD_PROVIDE_LOCAL_INFO
    '0x26': function STK_CMD_PROVIDE_LOCAL_INFO(message) {
      this.onmessagereceived(message);
    },

    // STK_CMD_TIMER_MANAGEMENT
    '0x27': function STK_CMD_TIMER_MANAGEMENT(message) {
      this.onmessagereceived(message);
    },

    // STK_CMD_SET_UP_IDLE_MODE_TEXT
    '0x28': function STK_CMD_SET_UP_IDLE_MODE_TEXT(message) {
      this.onmessagereceived(message);
    }
  };
}

var realIccWorker = null;

MockSystemICCWorker.mSetup = function() {
  realIccWorker = window.icc_worker;
  window.icc_worker = MockSystemICCWorker();
};

MockSystemICCWorker.mTeardown = function() {
  window.icc_worker = realIccWorker;
  realIccWorker = null;
};
