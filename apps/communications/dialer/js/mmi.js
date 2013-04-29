'use strict';

var MmiManager = {

  COMMS_APP_ORIGIN: document.location.protocol + '//' +
    document.location.host,
  _: null,
  _conn: null,
  ready: false,
  _operator: null,
  // In same cases, the RIL doesn't provide the expected order of events
  // while sending an MMI that triggers an interactive USSD request (specially
  // while roaming), which should be DOMRequest.onsuccess (or .onerror) +
  // ussdreceived. If the first event received is the ussdreceived one, we take
  // the DOMRequest.onsuccess received subsequenty as a closure of the USSD
  // session.
  _pendingRequest: null,

  init: function mm_init() {
    this._conn = window.navigator.mozMobileConnection;

    if (this._conn.voice) {
      this._conn.addEventListener('voicechange', this);
      this._operator = MobileOperator.userFacingInfo(this._conn).operator;
      var message = {
        type: 'mmi-networkchange',
        operator: (this._operator ? this._operator : 'Unknown')
      };

      window.postMessage(message, this.COMMS_APP_ORIGIN);
    }

    if (this._conn) {
      // We cancel any active session if one exists to avoid sending any new
      // USSD message within an invalid session.
      this._conn.cancelMMI();
      this._conn.addEventListener('ussdreceived', this);
      window.addEventListener('message', this);
    }

    this.ready = true;
  },

  send: function mm_send(message) {
    if (!this.ready) {
      this.init();
    }

    if (this._conn) {
      var request = this._pendingRequest = this._conn.sendMMI(message);
      request.onsuccess = this.notifySuccess.bind(this);
      request.onerror = this.notifyError.bind(this);
      this.openUI();
    }
  },

  notifySuccess: function mm_notifySuccess(evt) {
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
      type: 'mmi-success',
      result: msg
    };

    window.postMessage(message, this.COMMS_APP_ORIGIN);
  },

  notifyError: function mm_notifyError(evt) {
    var message = {
      type: 'mmi-error',
      error: evt.target.error.name
    };
    window.postMessage(message, this.COMMS_APP_ORIGIN);
  },

  openUI: function mm_openUI() {
    if (!this.ready) {
      this.init();
    }

    LazyL10n.get((function localized(_) {
      this._ = _;
      window.postMessage({type: 'mmi-loading'}, this.COMMS_APP_ORIGIN);
    }).bind(this));
  },

  handleMMIReceived: function mm_handleMMIReceived(message, sessionEnded) {
    this._pendingRequest = null;
    // Do not notify the UI if no message to show.
    if (message == null && !sessionEnded) {
      return;
    }

    var data = {
      type: 'mmi-received-ui',
      message: message,
      sessionEnded: sessionEnded
    };
    window.postMessage(data, this.COMMS_APP_ORIGIN);
  },

  isMMI: function mm_isMMI(number) {
    // A valid USSD/MMI code is any 'number' ending in '#'.
    return (number.charAt(number.length - 1) === '#');
  },

  handleEvent: function mm_handleEvent(evt) {
    if (!evt.type)
      return;

    var message;
    switch (evt.type) {
      case 'voicechange':
        this._operator = MobileOperator.userFacingInfo(this._conn).operator;
        message = {
          type: 'mmi-networkchange',
          operator: (this._operator ? this._operator : 'Unknown')
        };
        break;
      case 'message':
        if (evt.origin !== this.COMMS_APP_ORIGIN) {
          return;
        }
        switch (evt.data.type) {
          case 'mmi-reply':
            this.send(evt.data.message);
            break;
          case 'mmi-cancel':
            if (this._conn) {
              this._conn.cancelMMI();
            }
            break;
        }
        return;
    }

    if (message) {
      window.postMessage(message, this.COMMS_APP_ORIGIN);
    }
  }
};
