'use strict';

var UssdManager = {

  _: null,
  _conn: null,
  ready: false,
  _popup: null,
  _origin: null,
  _operator: null,
  _pendingNotification: null,
  _lastMessage: null,
  // In same cases, the RIL doesn't provide the expected order of events
  // while sending an MMI that triggers an interactive USSD request (specially
  // while roaming), which should be DOMRequest.onsuccess (or .onerror) +
  // ussdreceived. If the first event received is the ussdreceived one, we take
  // the DOMRequest.onsuccess received subsequenty as a closure of the USSD
  // session.
  _pendingRequest: null,

  init: function um_init() {
    this._conn = window.navigator.mozMobileConnection;

    if (this._conn.voice) {
      this._conn.addEventListener('voicechange', this);
      this._operator = MobileOperator.userFacingInfo(this._conn).operator;
    }

    this._origin = document.location.protocol + '//' + document.location.host;

    if (this._conn) {
      // We cancel any active session if one exists to avoid sending any new
      // USSD message within an invalid session.
      this._conn.cancelMMI();
      this._conn.addEventListener('ussdreceived', this);
      window.addEventListener('message', this);
    }

    this.ready = true;
  },

  send: function um_send(message) {
    if (!this.ready) {
      this.init();
    }

    if (this._conn) {
      var request = this._pendingRequest = this._conn.sendMMI(message);
      request.onsuccess = this.notifySuccess.bind(this);
      request.onerror = this.notifyError.bind(this);
      if (!this._popup) {
        this.openUI();
      }
    }
  },

  notifySuccess: function um_notifySuccess(evt) {
    // Helper function to compose an informative message about a successful
    // request to query the call forwarding status.
    var processCf = (function processCf(result) {
      var msg = this._('cf-status');

      var voice, data, fax, sms, sync, async, packet, pad;

      for (var i = 0; i < result.length; i++) {
        if (!result[i].active) {
          continue;
        }

        for (var serviceClassMask = 1;
             serviceClassMask <= this._conn.ICC_SERVICE_CLASS_MAX;
             serviceClassMask <<= 1) {
          if ((serviceClassMask & result[i].serviceClass) != 0) {
            switch (serviceClassMask) {
              case this._conn.ICC_SERVICE_CLASS_VOICE:
                voice = result[i].number;
                break;
              case this._conn.ICC_SERVICE_CLASS_DATA:
                data = result[i].number;
                break;
              case this._conn.ICC_SERVICE_CLASS_FAX:
                fax = result[i].number;
                break;
              case this._conn.ICC_SERVICE_CLASS_SMS:
                sms = result[i].number;
                break;
              case this._conn.ICC_SERVICE_CLASS_DATA_SYNC:
                sync = result[i].number;
                break;
              case this._conn.ICC_SERVICE_CLASS_DATA_ASYNC:
                async = result[i].number;
                break;
              case this._conn.ICC_SERVICE_CLASS_PACKET:
                packet = result[i].number;
                break;
              case this._conn.ICC_SERVICE_CLASS_PAD:
                pad = result[i].number;
                break;
              default:
                return this._('cf-error');
            }
          }
        }
      }

      msg += this._('cf-voice', {voice: voice || this._('cf-inactive')}) +
             this._('cf-data', {data: data || this._('cf-inactive')}) +
             this._('cf-fax', {fax: fax || this._('cf-inactive')}) +
             this._('cf-sms', {sms: sms || this._('cf-inactive')}) +
             this._('cf-sync', {sync: sync || this._('cf-inactive')}) +
             this._('cf-async', {async: async || this._('cf-inactive')}) +
             this._('cf-packet', {packet: packet || this._('cf-inactive')}) +
             this._('cf-pad', {pad: pad || this._('cf-inactive')});
      return msg;
    }).bind(this);

    var result = evt.target.result;
    if (this._pendingRequest === null &&
        (!result || !result.length)) {
      result = this._('mmi-session-expired');
    }

    // Call forwarding requests via MMI codes might return an array of
    // nsIDOMMozMobileCFInfo objects. In that case we serialize that array
    // into a single string that can be shown on the screen.
    var msg = '';
    Array.isArray(result) ? msg = processCf(result) : msg = result;

    var message = {
      type: 'success',
      result: msg
    };

    this.postMessage(message);
  },

  notifyError: function um_notifyError(evt) {
    var message = {
      type: 'error',
      error: evt.target.error.name
    };
    this.postMessage(message);
  },

  openUI: function um_openUI(ussd) {
    if (!this.ready) {
      this.init();
    }

    if (this._popup) {
      return;
    }

    LazyL10n.get((function localized(_) {
      this._ = _;

      // The MMI UI might be opened for one of these reasons:
      // 1. The dialer requested the send of a new MMI/USSD message.
      //    In this case, 'openUI' is called with no parameters.
      // 2. The platform sent a system message indicating that a new incoming
      //    USSD has being received.
      var urlBase = '/dialer/ussd.html';
      if (!ussd) {
        // The #send hash makes the 'sending' screen appear.
        urlBase += '#send';
      }

      this._popup = window.open(urlBase,
        this._operator ? this._operator : this._('USSD'), 'attention');

      // To control cases where the success or error is received
      // even before the new USSD window has been opened and/or
      // initialized.
      this._popup.addEventListener('ready', this.uiReady.bind(this));

      if (!ussd) {
        return;
      }
      // The message containing the received USSD won't be delivered until
      // the UI notifies about its successfull load.
      var message = {
        type: 'ussdreceived',
        message: ussd.message,
        sessionEnded: ussd.sessionEnded
      };
      this.postMessage(message);
    }).bind(this));
  },

  uiReady: function um_uiReady() {
    this._popup.removeEventListener('ready', this.uiReady);
    this._popup.ready = true;
    if (this._closedOnVisibilityChange) {
      this.notifyLast();
    } else {
      this.notifyPending();
    }
  },

  notifyPending: function um_notifyPending() {
    if (this._pendingNotification) {
      this.postMessage(this._pendingNotification);
    }
  },

  notifyLast: function um_notifyLast() {
    if (this._lastMessage) {
      this.postMessage(this._lastMessage);
    }
  },

  isUSSD: function um_isUSSD(number) {
    // A valid USSD/MMI code is any 'number' ending in '#'.
    return (number.charAt(number.length - 1) === '#');
  },

  postMessage: function um_postMessage(message) {
    if (this._popup && this._popup.ready) {
      this._popup.postMessage(message, this._origin);
      this._pendingNotification = null;
      if (message.type !== 'voicechange') {
        this._lastMessage = message;
      }
    } else {
      this._pendingNotification = message;
    }
  },

  closeUI: function um_closeUI(keepSessionAlive) {
    if (!keepSessionAlive) {
      this._conn.cancelMMI();
    }
    this._popup.close();
    this._popup = null;
    this._closedOnVisibilityChange = false;
  },

  handleIncomingUssd: function um_handleIncomingUssd(ussd) {
    this.openUI(ussd);
  },

  handleEvent: function um_handleEvent(evt) {
    if (!evt.type)
      return;

    var message;
    switch (evt.type) {
      case 'ussdreceived':
        this._pendingRequest = null;
        // Do not notify the UI if no message to show.
        if (evt.message != null || evt.sessionEnded)
          message = {
            type: 'ussdreceived',
            message: evt.message,
            sessionEnded: evt.sessionEnded
          };
        break;
      case 'voicechange':
        this._operator = MobileOperator.userFacingInfo(this._conn).operator;
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
          case 'cancel':
            this.closeUI();
            break;
        }
        return;
    }

    if (message) {
      this.postMessage(message);
    }
  }
};

window.addEventListener('mozvisibilitychange',
  function us_handleVisibility(ev) {
    if (document.mozHidden) {
      if (UssdManager._popup) {
        UssdManager.closeUI(true);
        UssdManager._closedOnVisibilityChange = true;
      }
    } else if (UssdManager._closedOnVisibilityChange) {
      UssdManager.openUI();
    }
  }
);
