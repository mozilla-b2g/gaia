'use strict';

/* globals addMixin, DebugMixin, PinView, DEFAULTS, PIN_DEFAULTS */
/* exported PinController */

(function(exports) {

  const PIN_STATE = {
    UNKNOWN: 'unknown',
    ENABLED: 'enabled',
    DISABLED: 'disabled',
    BLOCKED: 'blocked', 
  };

  var _defaultPin = DEFAULTS.PIN_VALUE;

  var PinController = function(simDataSource, id, viewId, templateId) {
    this._simDataSource = simDataSource;
    this._id = id;
    this._view = new PinView(viewId, PIN_DEFAULTS.PIN_LEN, templateId);

    addMixin(this, DebugMixin);
  };

  PinController.prototype = {
    _id: null,
    _simDataSource: null,
    _view: null,

    // TODO consider removing
    _simPinState: PIN_STATE.UNKNOWN,

    _pinCheckInProgress: false,
    _lastInputedPin: null,

    get pinCheckInProgress() {
      return this._pinCheckInProgress;
    },

    set defaultPin(value) {
      _defaultPin = value;
    },

    get view() {
      return this._view._el;
    },

    hideView: function() {
      this._view.hide();
    },

    verifyPin: function() {
      return this._requestPinVerification().then((result) => {
        if(result) {
          this.hideView();
        }
        return result;
      });
    },

    enablePin: function() {
      return this._requestPinVerification()
      .then((verified) => {
        if(verified) {
          this.debug('Pin verified');
          this._simPinState = PIN_STATE.ENABLED;
          this._lastInputedPin = null;
          return true;
        } else {
          this.debug('Pin verification failed, pin probably disabled');
          var pin = this._lastInputedPin;
          this._lastInputedPin = null;
          return this._enableSimPin(pin);
        }
      });
    },

    disablePin: function() {
      return this._requestPinVerification()
      .then((verified) => {
        if(verified) {
          this.debug('Pin verified');
          var pin = this._lastInputedPin;
          this._lastInputedPin = null;
          return this._disableSimPin(pin);
        } else {
          this.debug('Pin verification failed, pin probably disabled');
          this._lastInputedPin = null;
          return true;
        }
      });
    },

    changePin: function() {
      var pin;
      return this._requestPinVerification(this._view.REQUEST_BEFORE_CHANGE)
      .then((verified) => {
        if(!verified) {
          this.debug('Pin not verfied, not changing');
          this._lastInputedPin = null;
          return false;
        }

        pin = this._lastInputedPin;
        this._lastInputedPin = null;
        return this._getNewPin();
      })
      .then((newPin) => {
        this.debug('New pin value ' + newPin);
        var pinBytes = this._formatPin(pin);
        var newPinBytes =  this._formatPin(newPin);
        return this._simDataSource.changePIN(pinBytes, newPinBytes);
      })
      .then((result) => this._handlePinChangeResult(result));
    },

    cancelPinAction: function() {
      this._view.cancelPinRequest();
    },

    _handlePinChangeResult: function(result) {
      this.debug('Pin change result ' + result);
      if(result === '9000') {
        return true;
      } else {
        this.debug('Unexpected error');
        return false;
      }
    },

    _getNewPin: function(prevAttempFailed) {
      var newPin;
      return this._getUserPin(PIN_DEFAULTS.MAX_PUK_ATTEMPTS, prevAttempFailed,
                              this._view.REQUEST_NEW_PIN)
      .then((pin1) => {
        newPin = pin1;
        return this._getUserPin(PIN_DEFAULTS.MAX_PUK_ATTEMPTS, false,
                                this._view.REQUEST_CONFIRM);
      })
      .then((pin2) => {
        if(newPin === pin2) {
          return newPin;
        }

        this.debug('Pins do not match');
        return this._getNewPin(true);
      });
    },

    _requestPinVerification: function(reqType) {
      this.debug('_requestPinVerification, SIM PIN : ' + this._simPinState);
      // TODO verify if we need this
      //if(this._pinCheckInProgress) {
      //  return Promise.resolve(false);
      //}

      this._pinCheckInProgress = true;
      this._view.show();
      return this._performVerification(PIN_DEFAULTS.MAX_PIN_ATTEMPTS, false, reqType)
      .then((verified) => {
        if(verified) {
          //this._view.hide();
          // TODO think this through
          this._pinCheckInProgress = false;
        }

        return verified;
      });
    },

    _getUserPin: function(attemptsLeft, lastVerFailed, reqType, pinLen) {
      return new Promise((resolve, reject) => {
        var listener = {
          onEvent: (id, data) => {
            this._view.removeListener(listener);
            if (data.pin) {
              this.debug('got PIN: ' + data.pin);
              resolve(data.pin);
            } else {
              reject('pin-cancelled');
            }
          }
        };

        this._view.addListener(listener);
        if(!this._view.isVisible) {
          this._view.show();
        }

        this.debug('waiting for PIN input from user');
        this._view.requestPin(attemptsLeft, lastVerFailed, reqType, pinLen);
      });
    },

    _performVerification: function(attemptsLeft, lastVerFailed, reqType) {
      return this._getUserPin(attemptsLeft, lastVerFailed, reqType)
      .then((pin) => {
        this._lastInputedPin = pin;
        var pinBytes = this._formatPin(pin);
        this.debug('verifying PIN ' + pinBytes);
        return this._simDataSource.verifyPIN(pinBytes);
      })
      .then((result) => this._handleVerficationResult(result));
      //TODO should we catch here?
    },

    _handleVerficationResult: function(result) {
      this.debug('Verification finished, status word:' + result);
      if(result === '9000') {
        return true;
      } else if(result === '63C0' || result === '6983') {
        this.debug('Pin blocked');
        return this._handlePinBlocked();
      } else if(result.startsWith('63C')) {
        var attemptsLeft = Number.parseInt(result[3]);
        this.debug('Verification failed, tries left: ' + attemptsLeft);
        return this._performVerification(attemptsLeft, true);
      } else {
        this.debug('Unknown status word, PIN probably not enabled');
        return false;
      }
    },

    _handlePinBlocked: function() {
      this._simPinState = PIN_STATE.BLOCKED;

      this.debug('PUK unblock flow start.');
      var unblockRequested = () => this._performPinUnblock(PIN_DEFAULTS.MAX_PUK_ATTEMPTS);
      return this._view.blockPin().then(unblockRequested);
    },

    _performPinUnblock: function(attemptsLeft, lastUnblockFailed) {
      var puk;
      return this._getUserPin(attemptsLeft, lastUnblockFailed,
        this._view.REQUEST_PUK, PIN_DEFAULTS.MAX_SIM_PIN_LEN)
      .then((inputedPuk) => {
        this.debug('Inputed PUK ' + inputedPuk);
        puk = inputedPuk;
        return this._getNewPin(false);
      })
      .then((inputedPin) => {
        this.debug('Inputed PIN ' + inputedPin);
        var bytePuk = this._formatPin(puk);
        var bytePin = this._formatPin(inputedPin);
        // if we're part of disable/enable flow we need to save pin here
        this._lastInputedPin = inputedPin;
        return this._simDataSource.unblockPIN(bytePuk, bytePin);
      })
      .then((result) => this._handlePinUnblockResult(result));
    },

    _handlePinUnblockResult: function(result) {
      this.debug('PIN unblock result ' + result);
      if(result === '9000') {
        return true;
      } else if(result === '63C0' || !result.startsWith('63C')) {
        this.debug('Complate block');
        return this._view.blockPuk();
      } else {
        var attemptsLeft = Number.parseInt(result[3]);
        this.debug('PIN unblock failed, tries left: ' + attemptsLeft);
        return this._performPinUnblock(attemptsLeft, true);
      }
    },

    _enableSimPin: function(pin) {
      var pinBytes = this._formatPin(pin);
      return this._simDataSource.enablePIN(pinBytes)
      .then((result) => this._handlePinEnabledResult(result));
    },

    _handlePinEnabledResult: function(result) {
      this.debug('PIN enable result ' + result);
      if(result === '9000') {
        this._simPinState = PIN_STATE.ENABLED;
        //this._view.hide();
        return true;
      } else if(result === '63C0' || result === '6983') {
        this.debug('Pin blocked');
        return this._handlePinBlocked();
      } else {
        var tries = result.startsWith('63C') ? Number.parseInt(result[3]) : 0;
        this._view.showEnableFailed(tries, _defaultPin);
        return false;
      }
    },

    _disableSimPin: function(pin) {
      var pinBytes = this._formatPin(pin);
      return this._simDataSource.disablePIN(pinBytes)
      .then((result) => this._handlePinDisableResult(result));
    },

    _handlePinDisableResult: function(result) {
      this.debug('PIN disable result ' + result);
      if(result === '9000') {
        this._simPinState = PIN_STATE.DISABLED;
        //this._view.hide();
        return true;
      }

      return false;
    },

    _formatPin: function(pin) {
      var pinBytes = pin.split('').map((d) => d.charCodeAt());
      for(var i = pinBytes.length; i < PIN_DEFAULTS.MAX_SIM_PIN_LEN; i++) {
        pinBytes.push(PIN_DEFAULTS.PIN_PADDING);
      }

      return pinBytes;
    }
  };

  exports.PinController = PinController;
}((typeof exports === 'undefined') ? window : exports));
