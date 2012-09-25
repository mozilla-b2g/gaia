'use strict';

var UssdManager = {
  _conn: window.navigator.mozMobileConnection,
  _popup: null,
  _origin: document.location.protocol + '//' +
    document.location.host,

  init: function um_init() {
    if (this._conn) {
      this._conn.addEventListener('ussdreceived', this);
      window.addEventListener('message', this);
    }
  },

  send: function um_send(message) {
    if (this._conn) {
      this.clearTimeout();
      this._conn.sendUSSD(message);
      this.setTimeout();
      if (!this._popup) {
        var urlBase = this._origin + '/dialer/ussd.html';
        this._popup = window.open(urlBase, 'ussd', 'attention');
      }
    }
  },

  setTimeout: function um_setTimeout() {
    this._timeout = setTimeout(this.notifyNoResponse.bind(this), 10000);
  },

  clearTimeout: function um_clearTimeout() {
    if (this._timeout) {
      clearTimeout(this._timeout);
      delete this._timeout;
    }
  },

  notifyNoResponse: function um_notifyNoResponse() {
    if (this._popup) {
      this._popup.postMessage('noresponse', this._origin);
    }
  },

  handleEvent: function ph_handleEvent(evt) {
    if (evt.type == 'ussdreceived') {
      this.clearTimeout();
      if (this._popup) {
        this._popup.postMessage(evt.message, this._origin);
      }
      return;
    }

    switch (evt.data.type) {
      case 'reply':
        this.send(evt.data.message);
        break;
      case 'close':
        this.clearTimeout();
        this._conn.cancelUSSD();
        this._popup = null;
        break;
    }
  }
};

window.addEventListener('localized', function us_startup(evt) {
  UssdManager.init();
});
