/* globals LazyLoader, MmiUI, MobileOperator, NotificationHelper, Promise */

/* exported MmiManager */

'use strict';

// As defined in 3GPP TS 22.030 version 10.0.0 Release 10 standard
// USSD code used to query call barring supplementary service status
const CALL_BARRING_STATUS_MMI_CODE = '*#33#';
// USSD code used to query call waiting supplementary service status
const CALL_WAITING_STATUS_MMI_CODE = '*#43#';

var MmiManager = {

  _app: null,
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

  // MMI status messages as returned by the RIL
  _statusMessages: [
    'smServiceEnabled',
    'smServiceDisabled',
    'smServiceRegistered',
    'smServiceErased',
    'smServiceInterrogated',
    'smServiceNotProvisioned',
    'smClirPermanent',
    'smClirDefaultOnNextCallOn',
    'smClirDefaultOnNextCallOff',
    'smClirDefaultOffNextCallOn',
    'smClirDefaultOffNextCallOff',
    'smPinChanged',
    'smPinUnblocked',
    'smPin2Changed',
    'smPin2Unblocked'
  ],

  init: function mm_init() {
    if (this._ready) {
      return Promise.resolve();
    }

    MmiUI.init();

    var self = this;
    var lazyFiles = ['/shared/js/icc_helper.js',
                     '/shared/style/input_areas.css',
                     '/shared/js/mobile_operator.js',
                     '/shared/js/notification_helper.js'];

    var appPromise = new Promise(function(resolve, reject) {
      var req = window.navigator.mozApps.getSelf();

      req.onsuccess = function(evt) {
        resolve(evt.target.result);
      };
      req.onerror = reject;
    });

    var lazyLoadPromise = LazyLoader.load(lazyFiles);

    return Promise.all([ appPromise, lazyLoadPromise ]).then(values => {
      self._app = values[0];
      self._ready = true;
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
      var args = {
        voice:  'inactive',
        data:   'inactive',
        fax:    'inactive',
        sms:    'inactive',
        sync:   'inactive',
        async:  'inactive',
        packet: 'inactive',
        pad:    'inactive'
      };

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
                args.voice = result[i].number;
                break;
              case this._conn.ICC_SERVICE_CLASS_DATA:
                args.data = result[i].number;
                break;
              case this._conn.ICC_SERVICE_CLASS_FAX:
                args.fax = result[i].number;
                break;
              case this._conn.ICC_SERVICE_CLASS_SMS:
                args.sms = result[i].number;
                break;
              case this._conn.ICC_SERVICE_CLASS_DATA_SYNC:
                args.sync = result[i].number;
                break;
              case this._conn.ICC_SERVICE_CLASS_DATA_ASYNC:
                args.async = result[i].number;
                break;
              case this._conn.ICC_SERVICE_CLASS_PACKET:
                args.packet = result[i].number;
                break;
              case this._conn.ICC_SERVICE_CLASS_PAD:
                args.pad = result[i].number;
                break;
              default:
                return { id: 'call_forwarding_error' };
            }
          }
        }
      }

      return { id: 'call_forwarding_status', args };
    }).bind(this);

    var ci = this.cardIndexForConnection(this._conn);
    var message = { id: 'mmi_text', args: { text: null } };
    var title = null;
    var error = null;

    // We always expect an MMIResult object even for USSD requests.
    if (!mmiResult) {
      MmiUI.error({ id: 'GenericFailure' });
      return;
    }

    if (mmiResult.serviceCode) {
      title = this._createTitle({
        mmi_service_code: mmiResult.serviceCode
      }, ci);
    }

    var additionalInformation = mmiResult.additionalInformation;

    switch (mmiResult.serviceCode) {
      case 'scCall':
        /* Call control, no need to show a result page as the command will
         * already have been executed (hang up a call, etc...). */
        MmiUI.cancel();
        return;
      case 'scUssd':
        // Bail out if there is nothing to show or if we got the .onsuccess
        // event after the .onussdevent.
        if (!mmiResult.statusMessage || this._pendingRequest === null) {
          return;
        }

        message.args.text = mmiResult.statusMessage;
        break;
      case 'scPin':
      case 'scPin2':
      case 'scPuk':
      case 'scPuk2':
        if (mmiResult.statusMessage) {
          /* Note: The status message is either smPinChanged, smPinUnblocked,
           * smPin2Changed or smPin2Unblocked, see dom/system/gonk/ril_worker.js
           * in the mozilla-central sources. */
          message.id = mmiResult.statusMessage;
        }
        break;
      case 'scCallForwarding':
        if (mmiResult.statusMessage) {
          message.id = mmiResult.statusMessage;
          // Call forwarding requests via MMI codes might return an array of
          // nsIDOMMozMobileCFInfo objects. In that case we serialize that array
          // into a single string that can be shown on the screen.
          if (additionalInformation) {
            message = processCf(additionalInformation);
          }
        } else {
          error = { id: 'GenericFailure' };
        }
        break;
      case 'scCallBarring':
      case 'scCallWaiting':
        message.id = mmiResult.statusMessage;

        // If we are just querying the status of the service, we show a 
        // different message, so the user knows she hasn't changed anything
        if (sentMMI === CALL_BARRING_STATUS_MMI_CODE ||
            sentMMI === CALL_WAITING_STATUS_MMI_CODE) {
          if (mmiResult.statusMessage === 'smServiceEnabled') {
            message.id = 'ServiceIsEnabled';
          } else if (mmiResult.statusMessage === 'smServiceDisabled') {
            message.id = 'ServiceIsDisabled';
          } else if (mmiResult.statusMessage === 'smServiceEnabledFor') {
            message.id = 'ServiceIsEnabledFor';
          }
        }

        // Call barring and call waiting requests via MMI codes might return an
        // array of strings indicating the service it is enabled for or just
        // the disabled status message.
        if (mmiResult.statusMessage === 'smServiceEnabledFor' &&
            additionalInformation &&
            Array.isArray(additionalInformation)) {
          var args = {
            voice:  'disabled',
            data:   'disabled',
            fax:    'disabled',
            sms:    'disabled',
            sync:   'disabled',
            async:  'disabled',
            packet: 'disabled',
            pad:    'disabled'
          };

          for (var i = 0, l = additionalInformation.length; i < l; i++) {
            switch (additionalInformation[i]) {
              case 'serviceClassVoice':     args.voice  = 'enabled'; break;
              case 'serviceClassData':      args.data   = 'enabled'; break;
              case 'serviceClassFax':       args.fax    = 'enabled'; break;
              case 'serviceClassSms':       args.sms    = 'enabled'; break;
              case 'serviceClassDataSync':  args.sync   = 'enabled'; break;
              case 'serviceClassDataAsync': args.async  = 'enabled'; break;
              case 'serviceClassPacket':    args.packet = 'enabled'; break;
              case 'serviceClassPad':       args.pad    = 'enabled'; break;
            }
          }

          message.args = args;
        }

        break;
      default:
        // This would allow carriers and others to implement custom MMI codes
        // with title and statusMessage only.
        if (mmiResult.statusMessage) {
          if (this.statusMessages.indexOf(mmiResult.statusMessage) !== -1) {
            message.id = mmiResult.statusMessage;
          } else {
            message.args = { text: mmiResult.statusMessage };
          }
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
    var error = null;
    var ci = this.cardIndexForConnection(this._conn);

    if (mmiError.serviceCode) {
      title = this._createTitle({ mmi_service_code: mmiError.serviceCode }, ci);
    }

    switch (mmiError.serviceCode) {
      case 'scPin':
      case 'scPin2':
      case 'scPuk':
      case 'scPuk2':
        // If the error is related with an incorrect old PIN, we get the
        // number of remainings attempts.
        error = { id: mmiError.statusMessage };

        if (mmiError.additionalInformation &&
            (mmiError.statusMessage === 'emMmiErrorBadPin' ||
             mmiError.statusMessage === 'emMmiErrorBadPuk')) {
          error = {
            id: mmiError.statusMessage + 'WithAttempts',
            n: mmiError.additionalInformation
          };
        }
        break;

      default:
        error = { id: mmiError.statusMessage || 'GenericFailure' };
    }

    MmiUI.error(error, title);
  },

  openUI: function mm_openUI() {
    this.init().then(function() {
      MmiUI.loading();
    });
  },

  /**
   * Handles an MMI/USSD message. Pops up the MMI UI and displays the message.
   *
   * @param {String} message An MMI/USSD message.
   * @param {Object} session The object representing the USSD session.
   * @param {Integer} cardIndex The index of the SIM card on which this message
   *        was received.
   */
  handleMMIReceived:
  function mm_handleMMIReceived(message, session, cardIndex) {
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
      var title = self._createTitle({ text: operator }, cardIndex);

      MmiUI.received(session, { id: 'mmi_text', text: message }, title);
    });
  },

  /**
   * Creates an object with the appropriate l10n id and arguments for display
   * as the notification title.
   *
   * @param {Objects} options An option object used to specify which kind of
   *        title is needed. It can be populated with a 'text' field for a
   *        non-translated title, with an 'mmi_service_code' field for a
   *        localized MMI service code and 'mmi_error' for a localized MMI
   *        error message.
   * @param {Integer} cardIndex The index of the SIM card on which this message
   *        was received.
   */
  _createTitle: function mm_createTitle(options, cardIndex) {
    var sims = navigator.mozIccManager && navigator.mozIccManager.iccIds.length;
    var id = 'mmi_title';

    if (cardIndex === undefined) {
      sims = 1; // No SIM number in the title
    }

    var args = {
      sims: sims || 1,
      sim: cardIndex + 1
    };

    if (options.mmi_service_code) {
      id = 'mmi_title_with_service_code';
      args.mmi_service_code = options.mmi_service_code;
    } else if (options.mmi_error) {
      id = 'mmi_title_with_error';
      args.mmi_error = options.mmi_error;
    }

    return {
      id: 'mmi-notification-title-with-sim',
      args
    };
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

    this.init().then(function() {
      var iconURL = NotificationHelper.getIconURI(self._app, 'dialer');
      var title = self._createTitle({ text: message }, cardIndex);

      /* XXX: Bug 1033254 - We put the |ussd-message=1| parameter in the
       * URL string to distinguish this notification from the others.
       * This should be thorought the application possibly by using the
       * tag field. */
      var options = {
        body: message, // Not localized
        icon: iconURL + '?ussdMessage=1&cardIndex=' + cardIndex,
        tag: Date.now()
      };

      return NotificationHelper.send(title, options).then(notification => {
        notification.addEventListener('click', evt => {
          evt.target.close();
          self.handleMMIReceived(message, /* session */ null, cardIndex);
        });
      });
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

        var title = self._createTitle({ mmi_service_code: 'scImei' });

        Promise.all(promises).then(function(imeis) {
          var args = {};

          for (var i = 0; i < imeis.length; i++) {
            args['imei' + (i + 1)] = imeis[i];
          }

          MmiUI.success(args, title);
          resolve();
        }, function(reason) {
          MmiUI.error({ id: 'GenericFailure' });
          reject(reason);
        });
      });
    });
  }
};
