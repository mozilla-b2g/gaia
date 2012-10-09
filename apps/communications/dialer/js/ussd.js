'use strict';

var UssdManager = {

  _: null,
  _conn: window.navigator.mozMobileConnection,
  _popup: null,
  _origin: null,
  _operator: null,
  _pendingNotification: null,

  init: function um_init() {
    this._ = window.navigator.mozL10n.get;
    if (this._conn.voice) {
      this._conn.addEventListener('voicechange', this);
      // Even without SIM card, the mozMobileConnection.voice.network object
      // exists, although its shortName property is null.
      this._operator = this._conn.voice.network.shortName;
    }
    this._origin = document.location.protocol + '//' +
      document.location.host;
    if (this._conn) {
      this._conn.addEventListener('ussdreceived', this);
      window.addEventListener('message', this);
    }
  },

  send: function um_send(message) {
    if (this._conn) {
      var request = this._conn.sendMMI(message);
      request.onsuccess = this.notifySuccess.bind(this);
      request.onerror = this.notifyError.bind(this);
      if (!this._popup) {
        var urlBase = this._origin + '/dialer/ussd.html';
        this._popup = window.open(urlBase,
          this._operator ? this._operator : this._('USSD'),
          'attention');
        // To control cases where the success or error is received
        // even before the new USSD window has been opened and/or
        // initialized.
        this._popup.addEventListener('localized',
          this.uiReady.bind(this));
      }
    }
  },

  notifySuccess: function um_notifySuccess(evt) {
    var message = {
      type: 'success'
      // For the time being the RIL sends an Object in the
      // DOMRequest.result with no content so we notify no result
      // to the UI instead of:
      // result: evt.target.result
    };
    if (this._popup && this._popup.ready) {
      this._popup.postMessage(message, this._origin);
    } else {
      this._pendingNotification = message;
    }
  },

  notifyError: function um_notifyError(evt) {
    var message = {
      type: 'error',
      error: evt.target.error.name
    };
    if (this._popup && this._popup.ready) {
      this._popup.postMessage(message, this._origin);
    } else {
      this._pendingNotification = message;
    }
  },

  uiReady: function um_uiReady() {
    this._popup.ready = true;
    this.notifyPending();
  },

  notifyPending: function um_notifyPending() {
    if (this._pendingNotification)
        this._popup.postMessage(this._pendingNotification, this._origin);
  },

  handleEvent: function um_handleEvent(evt) {
    if (!evt.type)
      return;

    var message;
    switch (evt.type) {
      case 'ussdreceived':
        message = {
          type: 'ussdreceived',
          message: evt.message
        };
        break;
      case 'voicechange':
        // Even without SIM card, the mozMobileConnection.voice.network object
        // exists, although its shortName property is null.
        this._operator = this._conn.voice.network.shortName ?
          this._conn.voice.network.shortName : null;
        message = {
          type: 'voicechange',
          operator: (this._operator ? this._operator : 'Unknown')
        };
        break;
      case 'message':
        switch (evt.data.type) {
          case 'reply':
            this.send(evt.data.message);
            break;
          case 'close':
            this._conn.cancelMMI();
            this._popup = null;
            break;
        }
        return;
        break;
    }

    if (this._popup && this._popup.ready) {
      this._popup.postMessage(message, this._origin);
    }
  }
};

window.addEventListener('localized', function us_startup(evt) {
  UssdManager.init();
});
