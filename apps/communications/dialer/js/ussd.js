'use strict';

var UssdManager = {

  _conn: null,
  _popup: null,
  _origin: null,

  init: function um_init() {
    this._conn = window.navigator.mozMobileConnection;
    this._origin = document.location.protocol + '//' +
      document.location.host;
    if (this._conn) {
      this._conn.addEventListener('ussdreceived', this);
      window.addEventListener('message', this);
    }
  },

  send: function um_send(message) {
    if (this._conn) {
      var request = this._conn.sendUSSD(message);
      request.onsuccess = this.notifySuccess;
      request.onerror = this.notifyError;
      if (!this._popup) {
        var urlBase = this._origin + '/dialer/ussd.html';
        this._popup = window.open(urlBase, 'ussd', 'attention');
      }
    }
  },

  notifySuccess: function um_notifySuccess() {
    if (UssdManager._popup) {
      var message = {
        type: 'success'
        // For the time being the RIL sends an Object in the
        // DOMRequest.result with no content so we notify no result
        // to the UI instead of:
        // result: this.result
      };
      UssdManager._popup.postMessage(message, UssdManager._origin);
    }
  },

  notifyError: function um_notifyError() {
    if (UssdManager._popup) {
      var message = {
        type: 'error',
        error: this.error
      };
      UssdManager._popup.postMessage(message, UssdManager._origin);
    }
  },

  handleEvent: function ph_handleEvent(evt) {
    if (evt.type == 'ussdreceived') {
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
        this._conn.cancelUSSD();
        this._popup = null;
        break;
    }
  }
};

window.addEventListener('localized', function us_startup(evt) {
  UssdManager.init();
});
