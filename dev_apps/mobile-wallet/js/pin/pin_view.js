'use strict';

/* globals addMixin, ObserverSubjectMixin, DebugMixin */
/* exported PinView */

(function(exports) {
  // number of pin input attempts which should
  // trigger the pin warning display
  const PIN_ATTEMPTS_WARNING = 2;
  const PIN_INCORRECT_TIMEOUT = 1000; //ms
  const PIN_DEFAULT_LEN = 4;

  const PIN_REQ_DEF = 'request-default-pin';
  const PIN_REQ_BEFORE_CHANGE = 'request-pin-before-change';
  const PIN_REQ_PUK = 'request-puk';
  const PIN_REQ_NEW_PIN = 'request-new-pin';
  const PIN_REQ_REPEAT_NEW_PIN = 'request-repeat-new-pin';

  const PIN_ENTRY_TEXT_MAP = {};

  PIN_ENTRY_TEXT_MAP[PIN_REQ_DEF] = {
    entry: 'Please enter your PIN',
    error: 'Incorrect PIN'
  };

  PIN_ENTRY_TEXT_MAP[PIN_REQ_BEFORE_CHANGE] = {
    entry: 'Please enter current PIN',
    error: 'Incorrect PIN'
  },

  PIN_ENTRY_TEXT_MAP[PIN_REQ_PUK] = {
    entry: 'Please enter your PUK',
    error: 'Incorrect PUK'
  };

  PIN_ENTRY_TEXT_MAP[PIN_REQ_NEW_PIN] = {
    entry: 'Please enter new PIN',
    error: 'New PIN mismatch',
  };

  PIN_ENTRY_TEXT_MAP[PIN_REQ_REPEAT_NEW_PIN] = {
    entry: 'Please confirm new PIN',
    error: ''
  };

  var PinView = function(id, defPinLen, templateId) {
    this._id = id;
    this._defaultPinLen = defPinLen || PIN_DEFAULT_LEN;
    this._maxPinLen = this._defaultPinLen;

    addMixin(this, ObserverSubjectMixin);
    addMixin(this, DebugMixin);

    if(templateId) {
      this._el = document.querySelector('#' + templateId).cloneNode(true);
      this._el.id = this._id;
    } else {
      this._el = document.querySelector('#' + this._id);
    }

    this._init();
  };

  PinView.prototype = {
    REQUEST_PIN: PIN_REQ_DEF,
    REQUEST_BEFORE_CHANGE: PIN_REQ_BEFORE_CHANGE,
    REQUEST_PUK: PIN_REQ_PUK,
    REQUEST_NEW_PIN: PIN_REQ_NEW_PIN,
    REQUEST_CONFIRM: PIN_REQ_REPEAT_NEW_PIN,

    _el: null,
    _id: null,
    _visible: false,

    _pinInputEl: null,
    _inputedPin: '',

    // we have a default PIN length but we can do one time request for PINs
    // of different length (i.e. PUK)
    _defaultPinLen: 0,
    _maxPinLen: 0,

    _inputBlocked: false,

    isVisible() {
      return this._visible;
    },

    show: function() {
      this._visible = true;
      this._el.classList.remove('hide');
      this._clearPin();
    },

    hide: function() {
      this._visible = false;
      this._el.classList.add('hide');
    },

    _init: function() {
      this._pinInputEl = this._el.querySelector('.pin-input');

      var keyHandler = this._keyHandler.bind(this);
      var keypad = this._el.querySelector('.pin-keypad');
      keypad.addEventListener('touchstart', keyHandler, true);

      this._updatePinInput();
    },

    _keyHandler: function(event) {
      event.preventDefault();
      event.stopPropagation();

      var key = event.target.dataset.value;
      if(!key || this._inputBlocked) {
        return;
      }

      switch(key) {
        case 'clear': this._clearPin(); break;
        case 'backspace': this._backspacePin(); break;
        default: this._appendPin(key);
      }
    },

    _clearPin: function() {
      this._inputedPin = '';
      this._updatePinInput();
    },

    _backspacePin: function() {
      if(!this._inputedPin.length) {
        return;
      }

      this._inputedPin = this._inputedPin.slice(0, -1);
      this._updatePinInput();
    },

    _appendPin: function(digit) {
      if(this._inputedPin.length >= this._maxPinLen) {
        return;
      }
      
      this._inputedPin += digit;
      this._updatePinInput();

      if(this._inputedPin.length === this._maxPinLen) {
        if(this._maxPinLen !== this._defaultPinLen) {
          this._maxPinLen = this._defaultPinLen;
        }
        this._notify({ action: 'pin-inputed', pin:  this._inputedPin });
      }
    },

    _updatePinInput: function() {
      var inputedDigits = this._inputedPin.length;
      var fragment = document.createDocumentFragment();
      for(var i = 0; i < this._maxPinLen; i++) {
        var pinDigit = document.createElement('div');
        if(i < inputedDigits) {
          pinDigit.classList.add('pin-digit-entered');
        }
        fragment.appendChild(pinDigit);
      }
      this._pinInputEl.innerHTML = '';
      this._pinInputEl.appendChild(fragment);
    },

    _updatePinInputTexts: function _updatePinInputTexts(reqType) {
      reqType = (reqType in PIN_ENTRY_TEXT_MAP) ? reqType : PIN_REQ_DEF;
      this._el.querySelector('.pin-entry-text')
              .textContent = PIN_ENTRY_TEXT_MAP[reqType].entry;
      this._el.querySelector('.pin-entry-error-text')
              .textContent = PIN_ENTRY_TEXT_MAP[reqType].error;
    },

    requestPin: function(attemptsLeft, showPinIncorrect, reqType, pinLen) {
      this.debug('requestPIN, tries: ' + attemptsLeft + ', type: ' + reqType);
      this._maxPinLen = pinLen || this._maxPinLen;
      this._clearPin();

      this._updatePinInputTexts(reqType);
      this._showByClass('pin-unblocked');

      if(showPinIncorrect) {
        this._showPinIncorrect();
        if(reqType !== PIN_REQ_NEW_PIN) {
          this._showWarning(attemptsLeft);
        }
      } else if(attemptsLeft <= PIN_ATTEMPTS_WARNING) {
        this._showWarning(attemptsLeft);
      } else {
        this._clearWarning();
      }
    },

    cancelPinRequest: function() {
      this._maxPinLen = this._defaultPinLen;
      this._notify({});
    },

    blockPin: function() {
      window.navigator.vibrate([200, 100, 200, 100, 200]);
      this._showByClass('pin-blocked');

      return new Promise((resolve, reject) => {
        var unblockBtn = this._el.querySelector('.pin-unblock-btn');
        var onclick = () => {
          unblockBtn.removeEventListener('click', onclick);
          resolve();
        };

        unblockBtn.addEventListener('click', onclick);
      });
    },

    blockPuk: function() {
      window.navigator.vibrate([200, 100, 200, 100, 200]);
      this._showByClass('puk-blocked');
      return new Promise(()=>{});
    },

    showEnableFailed: function(tries, defaultPin) {
      window.navigator.vibrate([200, 100, 200, 100, 200]);
      this._showByClass('pin-enable-error');
      this._el.querySelector('.pin-default-val').textContent = defaultPin;
      if(tries || tries === 0) {
        this._el.querySelector('.pin-enable-warning').classList.remove('hide');
        var att = (tries === 1) ? ' entry attempt' : ' entry attempts';
        this._el.querySelector('.pin-enable-attempt').textContent = tries + att;
      } else {
        this._el.querySelector('.pin-enable-warning').classList.add('hide');
      }
    },

    _showByClass: function(clss) {
      var nodesList = this._el.querySelectorAll('article');
      Array.prototype.slice.call(nodesList).forEach(el => {
        if(el.classList.contains(clss)) {
          el.classList.remove('hide');
        } else {
          el.classList.add('hide');
        }
      });
    },

    _showWarning: function(attemptsLeft) {
      this._el.querySelector('.pin-warning').classList.remove('hide');
      var warning = attemptsLeft + ' attempt';
      warning = (attemptsLeft !== 1) ? (warning + 's') : warning;
      warning += ' remaining';
      this._el.querySelector('.pin-attempts').textContent = warning;
    },

    _togglePinIncorrect: function(show) {
      this._inputBlocked = show;
      this._el.querySelector('.pin-entry').classList.toggle('hide');
      this._el.querySelector('.pin-incorrect').classList.toggle('hide');
    },

    _showPinIncorrect: function() {
      window.navigator.vibrate([200, 100, 200]);
      this._togglePinIncorrect(true);
      setTimeout(() => this._togglePinIncorrect(false), PIN_INCORRECT_TIMEOUT);
    },

    _clearWarning: function() {
      this._el.querySelector('.pin-warning').classList.add('hide');
    }
  };

  exports.PinView = PinView;
}((typeof exports === 'undefined') ? window : exports));
