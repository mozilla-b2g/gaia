/* globals LazyL10n, LazyLoader, MobileOperator, Notification,
           NotificationHelper, Promise */

/* exported MmiManager */

'use strict';

var MmiManager = {

  COMMS_APP_ORIGIN: document.location.protocol + '//' +
                    document.location.host,
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

  init: function mm_init(callback) {
    if (this._ready) {
      if (callback && callback instanceof Function) {
        callback();
      }
      return;
    }

    var self = this;
    var lazyFiles = ['/shared/js/icc_helper.js',
                     '/shared/js/mobile_operator.js'];
    LazyLoader.load(lazyFiles, function resourcesLoaded() {
      window.addEventListener('message', self);
      for (var i = 0; i < navigator.mozMobileConnections.length; i++) {
        var conn = navigator.mozMobileConnections[i];

        // We cancel any active sessions if one exists to avoid sending any new
        // USSD message within an invalid session.
        conn.cancelMMI();
      }

      LazyL10n.get(function localized(_) {
        self._ = _;
        self._ready = true;
        callback();
      });
    });
  },

  send: function mm_send(message, cardIndex) {
    var conn = navigator.mozMobileConnections[cardIndex || 0];
    if (this._conn && (this._conn != conn)) {
      console.error('Starting a new MMI session before the previous has ' +
                    'finished is not permitted');
      return;
    }

    this._conn = conn;

    this.init((function onInitDone() {
      if (this._conn) {
        var request = this._pendingRequest = this._conn.sendMMI(message);
        request.onsuccess = this.notifySuccess.bind(this);
        request.onerror = this.notifyError.bind(this);
        this.openUI();
      }
    }).bind(this));
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

    var mmiResult = evt.target.result;
    var message = {};

    // We always expect an MMIResult object even for USSD requests.
    if (!mmiResult) {
      message = {
        type: 'mmi-error',
        error: this._('GenericFailure')
      };

      window.postMessage(message, this.COMMS_APP_ORIGIN);
      return;
    }

    message.type = 'mmi-success';

    if (mmiResult.serviceCode) {
      message.title = this._(mmiResult.serviceCode);
    }

    var additionalInformation = mmiResult.additionalInformation;

    switch (mmiResult.serviceCode) {
      case 'scUssd':
        // Bail out if there is nothing to show or if we got the .onsuccess
        // event after the .onussdevent.
        if (!mmiResult.statusMessage || this._pendingRequest === null) {
          return;
        }

        message.result = mmiResult.statusMessage;
        break;
      case 'scPin':
      case 'scPin2':
      case 'scPuk':
      case 'scPuk2':
        if (mmiResult.statusMessage) {
          message.result = this._(mmiResult.statusMessage);
        }
        break;
      case 'scCallForwarding':
        if (mmiResult.statusMessage) {
          message.result = this._(mmiResult.statusMessage);
          // Call forwarding requests via MMI codes might return an array of
          // nsIDOMMozMobileCFInfo objects. In that case we serialize that array
          // into a single string that can be shown on the screen.
          if (additionalInformation) {
            message.result = processCf(additionalInformation);
          }
        } else {
          message.type = 'mmi-error';
          message.error = this._('GenericFailure');
        }
        break;
      case 'scCallBarring':
      case 'scCallWaiting':
        // Call barring and call waiting requests via MMI codes might return an
        // array of strings indicating the service it is enabled for or just
        // the disabled status message.
        message.result = this._(mmiResult.statusMessage);
        if (mmiResult.statusMessage === 'smServiceEnabledFor' &&
            additionalInformation &&
            Array.isArray(additionalInformation)) {
          for (var i = 0, l = additionalInformation.length; i < l; i++) {
            message.result += '\n' + this._(additionalInformation[i]);
          }
        }
        break;
      default:
        // This would allow carriers and others to implement custom MMI codes
        // with title and statusMessage only.
        if (mmiResult.statusMessage) {
          message.result = this._(mmiResult.statusMessage) ?
                           this._(mmiResult.statusMessage) :
                           mmiResult.statusMessage;
        }
        break;
    }

    window.postMessage(message, this.COMMS_APP_ORIGIN);
  },

  notifyError: function mm_notifyError(evt) {
    var mmiError = evt.target.error;

    var message = {
      type: 'mmi-error'
    };

    if (mmiError.serviceCode) {
      message.title = this._(mmiError.serviceCode);
    }

    message.error = mmiError.name ?
      this._(mmiError.name) : this._('GenericFailure');

    switch (mmiError.serviceCode) {
      case 'scPin':
      case 'scPin2':
      case 'scPuk':
      case 'scPuk2':
        // If the error is related with an incorrect old PIN, we get the
        // number of remainings attempts.
        if (mmiError.additionalInformation &&
            (mmiError.name === 'emMmiErrorPasswordIncorrect' ||
             mmiError.name === 'emMmiErrorBadPin' ||
             mmiError.name === 'emMmiErrorBadPuk')) {
          message.error += '\n' + this._('emMmiErrorPinPukAttempts', {
            n: mmiError.additionalInformation
          });
        }
        break;
    }

    window.postMessage(message, this.COMMS_APP_ORIGIN);
  },

  openUI: function mm_openUI() {
    this.init((function onInitDone(_) {
      window.postMessage({type: 'mmi-loading'}, this.COMMS_APP_ORIGIN);
    }).bind(this));
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
      text = '(' + this._('sim-number', { n: +cardIndex + 1 }) + ') ' + text;
    }

    return text;
  },

  /**
   * Handles an MMI/USSD message. Pops up the MMI UI and displays the message.
   *
   * @param {String} message An MMI/USSD message.
   * @param {Boolean} sessionEnded True if this message ends the session, i.e.
   *        no more MMI messages will be sent in response to this one.
   * @param {Integer} cardIndex The index of the SIM card on which this message
   *        was received.
   */
  handleMMIReceived: function mm_handleMMIReceived(message, sessionEnded,
                                                   cardIndex)
  {
    this.init((function() {
      this._pendingRequest = null;
      // Do not notify the UI if no message to show.
      if (message == null && !sessionEnded) {
        return;
      }

      var conn = navigator.mozMobileConnections[cardIndex || 0];
      var title = this.prependSimNumber(
        MobileOperator.userFacingInfo(conn).operator, cardIndex);
      var data = {
        type: 'mmi-received-ui',
        message: message,
        title: title,
        sessionEnded: sessionEnded
      };
      window.postMessage(data, this.COMMS_APP_ORIGIN);
    }).bind(this));
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
      self.init(function() {
        var request = window.navigator.mozApps.getSelf();
        request.onsuccess = function(evt) {
          var app = evt.target.result;

          LazyLoader.load('/shared/js/notification_helper.js', function() {
            var iconURL = NotificationHelper.getIconURI(app, 'dialer');
            var clickCB = function(evt) {
              evt.target.close();
              self.handleMMIReceived(message, /* sessionEnded */ true,
                                     cardIndex);
            };
            var conn = navigator.mozMobileConnections[cardIndex || 0];
            var title = self.prependSimNumber(
              MobileOperator.userFacingInfo(conn).operator, cardIndex);
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
        };
        request.onerror = function(error) {
          reject(error);
        };
      });
    });
  },

  isMMI: function mm_isMMI(number, cardIndex) {
    var cdmaTypes = ['evdo0', 'evdoa', 'evdob', '1xrtt', 'is95a', 'is95b'];
    var conn = navigator.mozMobileConnections[cardIndex || 0];
    var voiceType = conn.voice ? conn.voice.type : null;
    var supportedNetworkTypes = conn.supportedNetworkTypes;
    var imeiWhitelist = function mm_imeiWhitelist(element) {
      return (['gsm', 'lte', 'wcdma'].indexOf(element) !== -1);
    };

    if ((number === '*#06#') && supportedNetworkTypes.some(imeiWhitelist)) {
      // Requesting the IMEI code works on phones supporting a GSM network
      return true;
    } else if (cdmaTypes.indexOf(voiceType) !== -1) {
      // If we're on a CDMA network USSD/MMI numbers are not available
      return false;
    } else {
      // A valid USSD/MMI code is any 'number' ending in '#'.
      return (number.charAt(number.length - 1) === '#');
    }
  },

  handleEvent: function mm_handleEvent(evt) {
    if (!evt.type) {
      return;
    }

    switch (evt.type) {
      case 'message':
        if (evt.origin !== this.COMMS_APP_ORIGIN) {
          return;
        }
        switch (evt.data.type) {
          case 'mmi-reply':
            this.send(evt.data.message,
                      this.cardIndexForConnection(this._conn));
            break;
          case 'mmi-cancel':
            if (this._conn) {
              this._conn.cancelMMI();
              this._conn = null;
            }
            break;
        }

        return;
    }
  },

  cardIndexForConnection: function mm_cardIndexForConnection(conn) {
    for (var i = 0; i < navigator.mozMobileConnections.length; i++) {
      if (conn == navigator.mozMobileConnections[i]) {
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
    return new Promise(function(resolve, reject) {
      var request = navigator.mozMobileConnections[cardIndex]
                             .sendMMI('*#06#');
      request.onsuccess = function mm_onGetImeiSuccess(event) {
        var result = event.target.result;

        // We always expect the IMEI, so if we got a .onsuccess event
        // without the IMEI value, we throw an error message.
        if ((result === null) || (result.serviceCode !== 'scImei') ||
            (result.statusMessage === null)) {
          reject(new Error('Could not retrieve the IMEI code for SIM' +
                           cardIndex));
        }

        resolve(result.statusMessage);
      };
      request.onerror = function mm_onGetImeiError(error) {
        reject(error);
      };
    });
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
      self.init(function() {
        var promises = [];

        for (var i = 0; i < navigator.mozMobileConnections.length; i++) {
          promises.push(self._getImeiForCard(i));
        }

        self.openUI();

        Promise.all(promises).then(function(imeis) {
          window.postMessage({
            type: 'mmi-success',
            title: self._('scImei'),
            result: imeis.join('\n')
          }, self.COMMS_APP_ORIGIN);
          resolve();
        }, function(reason) {
          window.postMessage({
            type: 'mmi-error',
            error: self._('GenericFailure')
          }, self.COMMS_APP_ORIGIN);
          reject(reason);
        });
      });
    });
  }
};
