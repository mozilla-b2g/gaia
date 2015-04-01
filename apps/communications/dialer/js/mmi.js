/* globals LazyLoader, MmiUI, MobileOperator, Notification, NotificationHelper,
           Promise */

/* exported MmiManager */

'use strict';

// As defined in 3GPP TS 22.030 version 10.0.0 Release 10 standard
// USSD code used to query call barring supplementary service status
const CALL_BARRING_STATUS_MMI_CODE = '*#33#';
// USSD code used to query call waiting supplementary service status
const CALL_WAITING_STATUS_MMI_CODE = '*#43#';

var MmiManager = {

  _: null,
  _conn: null,
  _ready: false,
  // In some cases, the RIL doesn't provide the expected order of events
  // while sending an MMI that triggers an interactive USSD request (specially
  // while roaming), which should be DOMRequest.onsuccess (or .onerror) +
  // ussdreceived. If the first event received is the ussdreceived one, we take
  // the DOMRequest.onsuccess received subsequenty as a closure of the USSD
  // session.
  _pendingRequest: null,
  _session: null,

  init: function mm_init() {
    if (this._ready) {
      return Promise.resolve();
    }

    this._ = navigator.mozL10n.get;

    var self = this;
    var lazyFiles = ['/shared/js/icc_helper.js',
                     '/shared/style/input_areas.css',
                     '/shared/js/mobile_operator.js'];

    return new Promise(function(resolve, reject) {
      LazyLoader.load(lazyFiles, function() {
        MmiUI.init();
        self._ready = true;
        resolve();
      });
    });
  },

  /**
   * Handle dialing an MMI code by starting the UI and following up on the
   * promise in the MMICall object returned by Telephony.dial().
   *
   * @param {Object} conn The MozMobileConnection on which the MMI code was
   *        dialed on.
   * @param {String} message The dialed MMI code.
   * @param {Promise} promise The MMICall promise.
   * @returns {Promise} A promise that is resolved once the MMI message
   *          response has been handled.
   */
  handleDialing: function mm_handleDialing(conn, message, promise) {
    var self = this;

    this._conn = conn;
    this._pendingRequest = promise;

    return this.init().then(function() {
      self.openUI();

      /* TODO we are creating this callback instead of just following up on
       * the promise because we need to pass the original mmi code sent. This
       * should be removed when bug 889737 and bug 1049651 are landed as it
       * should be possible to get it in the callback. */
      return promise.then(function(result) {
        if (result.success) {
          self.notifySuccess(result, message);
        } else {
          self.notifyError(result, message);
        }
      });
    });
  },

  // Passing the sent MMI code because the message displayed to the user
  // could be different depending on the MMI code.
  notifySuccess: function mm_notifySuccess(mmiResult, sentMMI) {
    // Helper function to compose an informative message about a successful
    // request to query the call forwarding status.
    var processCf = (function processCf(result) {
      var voice, data, fax, sms, sync, async, packet, pad;

      for (var i = 0; i < result.length; i++) {
        if (!result[i].active) {
          continue;
        }

        for (var serviceClassMask = 1;
             serviceClassMask <= this._conn.ICC_SERVICE_CLASS_MAX;
             serviceClassMask <<= 1) {
          if ((serviceClassMask & result[i].serviceClass) !== 0) {
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
                return this._('call-forwarding-error');
            }
          }
        }
      }

      var inactive = this._('call-forwarding-inactive');
      var msg = [
        this._('call-forwarding-status'),
        this._('call-forwarding-voice', { voice: voice || inactive }),
        this._('call-forwarding-data', { data: data || inactive }),
        this._('call-forwarding-fax', { fax: fax || inactive }),
        this._('call-forwarding-sms', { sms: sms || inactive }),
        this._('call-forwarding-sync', { sync: sync || inactive }),
        this._('call-forwarding-async', { async: async || inactive }),
        this._('call-forwarding-packet', { packet: packet || inactive }),
        this._('call-forwarding-pad', { pad: pad || inactive })
      ].join('\n');

      return msg;
    }).bind(this);

    var ci = this.cardIndexForConnection(this._conn);
    var message = null;
    var title = null;
    var error = null;

    // We always expect an MMIResult object even for USSD requests.
    if (!mmiResult) {
      MmiUI.error(this._('GenericFailure'));
      return;
    }

    if (mmiResult.serviceCode) {
      title = this.prependSimNumber(this._(mmiResult.serviceCode), ci);
    }

    var additionalInformation = mmiResult.additionalInformation;

    switch (mmiResult.serviceCode) {
      case 'scUssd':
        // Bail out if there is nothing to show or if we got the .onsuccess
        // event after the .onussdevent.
        if (!mmiResult.statusMessage || this._pendingRequest === null) {
          return;
        }

        message = mmiResult.statusMessage;
        break;
      case 'scPin':
      case 'scPin2':
      case 'scPuk':
      case 'scPuk2':
        if (mmiResult.statusMessage) {
          message = this._(mmiResult.statusMessage);
        }
        break;
      case 'scCallForwarding':
        if (mmiResult.statusMessage) {
          message = this._(mmiResult.statusMessage);
          // Call forwarding requests via MMI codes might return an array of
          // nsIDOMMozMobileCFInfo objects. In that case we serialize that array
          // into a single string that can be shown on the screen.
          if (additionalInformation) {
            message = processCf(additionalInformation);
          }
        } else {
          error = this._('GenericFailure');
        }
        break;
      case 'scCallBarring':
      case 'scCallWaiting':
        message = this._(mmiResult.statusMessage);
        // If we are just querying the status of the service, we show a 
        // different message, so the user knows she hasn't change anything
        if (sentMMI === CALL_BARRING_STATUS_MMI_CODE ||
            sentMMI === CALL_WAITING_STATUS_MMI_CODE) {
          if (mmiResult.statusMessage === 'smServiceEnabled') {
            message = this._('ServiceIsEnabled');
          } else if (mmiResult.statusMessage === 'smServiceDisabled') {
            message = this._('ServiceIsDisabled');
          } else if (mmiResult.statusMessage === 'smServiceEnabledFor') {
            message = this._('ServiceIsEnabledFor');
          }
        }
        // Call barring and call waiting requests via MMI codes might return an
        // array of strings indicating the service it is enabled for or just
        // the disabled status message.
        if (mmiResult.statusMessage === 'smServiceEnabledFor' &&
            additionalInformation &&
            Array.isArray(additionalInformation)) {
          for (var i = 0, l = additionalInformation.length; i < l; i++) {
            message += '\n' + this._(additionalInformation[i]);
          }
        }
        break;
      default:
        // This would allow carriers and others to implement custom MMI codes
        // with title and statusMessage only.
        if (mmiResult.statusMessage) {
          message = this._(mmiResult.statusMessage) || mmiResult.statusMessage;
        }
        break;
    }

    if (!error) {
      MmiUI.success(message, title);
    } else {
      MmiUI.error(error, title);
    }
  },

  notifyError: function mm_notifyError(mmiError) {
    var title = null;
    var ci = this.cardIndexForConnection(this._conn);

    if (mmiError.serviceCode) {
      title = this.prependSimNumber(this._(mmiError.serviceCode), ci);
    }

    var error = mmiError.statusMessage ? this._(mmiError.statusMessage)
                                       : this._('GenericFailure');

    switch (mmiError.serviceCode) {
      case 'scPin':
      case 'scPin2':
      case 'scPuk':
      case 'scPuk2':
        // If the error is related with an incorrect old PIN, we get the
        // number of remainings attempts.
        if (mmiError.additionalInformation &&
            (mmiError.statusMessage === 'emMmiErrorPasswordIncorrect' ||
             mmiError.statusMessage === 'emMmiErrorBadPin' ||
             mmiError.statusMessage === 'emMmiErrorBadPuk')) {
          error += '\n' + this._('emMmiErrorPinPukAttempts', {
            n: mmiError.additionalInformation
          });
        }
        break;
    }

    MmiUI.error(error, title);
  },

  openUI: function mm_openUI() {
    this.init().then(function() {
      MmiUI.loading();
    });
  },

  /**
   * Create a notification/message string by prepending the SIM number if the
   * phone has more than one SIM card.
   *
   * @param text {String} The message text.
   * @param cardIndex {Integer} The SIM card slot index.
   * @return {String} Either the original string alone or with the SIM number
   *         prepended to it.
   */
  prependSimNumber: function mm_prependSimNumber(text, cardIndex) {
    if (window.navigator.mozIccManager &&
        window.navigator.mozIccManager.iccIds.length > 1) {
      var simName = this._('sim-number', { n: +cardIndex + 1 });

      text = this._(
        'mmi-notification-title-with-sim',
        { sim: simName, title: text }
      );
    }

    return text;
  },

  /**
   * Handles an MMI/USSD message. Pops up the MMI UI and displays the message.
   *
   * @param {String} message An MMI/USSD message.
   * @param {Object} session The object representing the USSD session.
   * @param {Integer} cardIndex The index of the SIM card on which this message
   *        was received.
   */
  handleMMIReceived: function mm_handleMMIReceived(message, session, cardIndex)
  {
    var self = this;

    return this.init().then(function() {
      self._pendingRequest = null;
      self._session = session;
      // Do not notify the UI if no message to show.
      if (!message && session) {
        return;
      }

      var conn = navigator.mozMobileConnections[cardIndex || 0];
      var operator = MobileOperator.userFacingInfo(conn).operator;
      var title = self.prependSimNumber(operator || '', cardIndex);

      MmiUI.received(session, message, title);
    });
  },

  /**
   * Sends a notification for the specified message, returns a promise that is
   * resolved once the operation is finished.
   *
   * @param {String} message An MMI/USSD message.
   * @param {Integer} cardIndex The index of the SIM card on which this message
   *        was received.
   * @return {Promise} A promise that is resolved once the operation is
   *         finished.
   */
  sendNotification: function mm_sendNotification(message, cardIndex) {
    var self = this;

    return new Promise(function(resolve, reject) {
      var request = window.navigator.mozApps.getSelf();
      request.onsuccess = function(evt) {
        var app = evt.target.result;

        self.init().then(function() {
          LazyLoader.load('/shared/js/notification_helper.js', function() {
            var iconURL = NotificationHelper.getIconURI(app, 'dialer');
            var clickCB = function(evt) {
              evt.target.close();
              self.handleMMIReceived(message, /* session */ null, cardIndex);
            };
            var conn = navigator.mozMobileConnections[cardIndex || 0];
            var operator = MobileOperator.userFacingInfo(conn).operator;
            var title = self.prependSimNumber(operator ? operator : '',
                                              cardIndex);
            /* XXX: Bug 1033254 - We put the |ussd-message=1| parameter in the
             * URL string to distinguish this notification from the others.
             * This should be thorought the application possibly by using the
             * tag field. */
            var notification = new Notification(title, {
              body: message,
              icon: iconURL + '?ussdMessage=1&cardIndex=' + cardIndex,
              tag: Date.now()
            });
            notification.addEventListener('click', clickCB);
            resolve();
          });
        });
      };
      request.onerror = function(error) {
        reject(error);
      };
    });
  },

  reply: function mm_reply(message) {
    var self = this;

    return this._session.send(message).then(function(request) {
       self._pendingRequest = request;
    });
  },

  cancel: function mm_cancel() {
    /* The user closed the UI, ignore any further message from this
     * session, calling dial() will automatically cancel the current
     * one and start a new session. */
    this._pendingRequest = null;
    this._session = null;
  },

  cardIndexForConnection: function mm_cardIndexForConnection(conn) {
    for (var i = 0; i < navigator.mozMobileConnections.length; i++) {
      if (conn === navigator.mozMobileConnections[i]) {
        return i;
      }
    }

    return 0;
  },

  /**
   * Retrieves the IMEI code for the specified SIM card slot.
   *
   * @param {Integer} cardIndex The index of the SIM card slot.
   * @returns {Promise} A promise that resolves to the IMEI code for the slot
   *          upon successful completion or rejects upon failure.
   */
  _getImeiForCard: function mm_getImeiForCard(cardIndex) {
    return navigator.mozTelephony.dial('*#06#', cardIndex).then(
      function(mmiCall) {
        return mmiCall.result.then(function(result) {
          /* We always expect the IMEI, so if we got a successful completion
           * without the IMEI value, we throw an error message. */
          if ((result === null) || (result.serviceCode !== 'scImei') ||
              (result.statusMessage === null)) {
            return Promise.reject(
              new Error('Could not retrieve the IMEI code for SIM' +
                        cardIndex));
          }

          return result.statusMessage;
        });
      }
    );
  },

  /**
   * Returns true if the specified number is the MMI code used to request the
   * IMEI codes of the phone's SIM slots (*#06#).
   *
   * @param {String} number A phone number or MMI code.
   * @returns {Boolean} true if the passed number is the MMI IMEI request code
   *          and false in all other cases.
   */
  isImei: function mm_isImei(number) {
    return (number === '*#06#');
  },

  /**
   * Sends the necessary MMI messages to retrieve IMEI codes for all SIM slots
   * and displays the resulting codes on the screen.
   *
   * @returns {Promise} A promise that is resolved when the operation has been
   *          completed.
   */
  showImei: function mm_showImei() {
    var self = this;

    return new Promise(function(resolve, reject) {
      self.init().then(function() {
        var promises = [];

        for (var i = 0; i < navigator.mozMobileConnections.length; i++) {
          promises.push(self._getImeiForCard(i));
        }

        self.openUI();

        Promise.all(promises).then(function(imeis) {
          MmiUI.success(imeis.join('\n'), self._('scImei'));
          resolve();
        }, function(reason) {
          MmiUI.error(self._('GenericFailure'));
          reject(reason);
        });
      });
    });
  }
};
