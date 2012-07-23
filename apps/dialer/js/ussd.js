'use strict';

var UssdManager = {
  _conn: window.navigator.mozMobileConnection,
  _popup: null,

  init: function um_init() {
    if (this._conn) {
      this._conn.addEventListener('ussdreceived', this);
      window.addEventListener('message', this);
    }
  },

  send: function um_send(number) {
    if (this._conn) {
      this._conn.sendUSSD(number);
      this._popup = window.open('./ussd.html', 'ussd');
    }
  },

  handleEvent: function ph_handleEvent(evt) {
    if (evt.type == 'ussdreceived') {
      if (this._popup) {
        var origin = document.location.protocol + '//' +
          document.location.host;
        this._popup.postMessage(evt.message, origin);
      }
      return;
    }

    switch (evt.data.type) {
      case 'reply':
        this.send(evt.data.number);
        break;
      case 'close':
        this._conn.cancelUSSD();
        this._popup = null;
        break;
    }
  }
};

UssdManager.init();
