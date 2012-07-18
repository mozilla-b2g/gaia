'use strict';

var UssdManager = {
  _conn: window.navigator.mozMobileConnection,
  _popup: null,

  init: function um_init() {
    if (this._conn) {
      this._conn.addEventListener('ussdreceived', this);
    }
  },

  send: function um_send(number) {
    if (this._conn) {
      this._conn.sendUSSD(number);
      this._popup = window.open('./ussd.html', 'ussd');
    }
  },

  handleEvent: function ph_handleEvent(evt) {
    if (evt.type != 'ussdreceived')
      return;

    if (this._popup) {
      var origin = document.location.protocol + '//' +
        document.location.host;
      this._popup.postMessage(evt.message, origin);
    }

    this._popup = null;
  }
};

UssdManager.init();
