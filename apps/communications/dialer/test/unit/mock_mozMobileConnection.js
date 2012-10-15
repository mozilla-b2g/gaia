'use strict';

var MockMozMobileConnection = {
  _ussd_listener_function: null,
  _ussd_listener_object: null,
  _ussd_message_sent: false,
  _ussd_cancelled: false,
  sendUSSD: function mmmc_sendUSSD(message) {
    this._ussd_message_sent = true;
    var evt = {
      type: 'ussdreceived',
      message: message + '- Received'
    };
    if (this._ussd_listener_object) {
      this._ussd_listener_object.handleEvent(evt);
    } else if (this._ussd_listener_function) {
      this._ussd_listener_function(evt);
    }
    var domRequest = {};
    return domRequest;
  },
  cancelUSSD: function mmmc_cancelUSSD() {
    this._ussd_cancelled = true;
  },
  addEventListener: function mmmc_addEventListener(event_name, listener) {
    if (event_name === 'ussdreceived') {
      if (typeof listener === 'object')
        this._ussd_listener_object = listener;
      else if (typeof listener === 'function')
        this._ussd_listener_function = listener;
    }
  },
  teardown: function mmmc_teardown() {
    this._ussd_message_sent = false;
    this._ussd_cancelled = false;
  }
};
