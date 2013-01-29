'use strict';

function _TonePlayer(config) {
  BaseTonePlayer.call(this, config);
}

extend(_TonePlayer, BaseTonePlayer);

_TonePlayer.prototype.start = function tp_start(frequencies, shortPress) {
  this._frequencies = frequencies;
  this._position = 0;
  this._stopping = false;

  // Already playing
  if (this._intervalID) {
    return;
  }

  this._audio.mozSetup(1, this._sampleRate);
  this._audio.volume = 1;

  // Writing 150ms of sound (duration for a short press)
  var initialSoundData = new Float32Array(1200);
  this.generateFrames(initialSoundData, shortPress);
  this._audio.mozWriteAudio(initialSoundData);

  if (shortPress) return;

  // Long press support
  // Continuing playing until .stop() is called
  this._intervalID = setInterval((function audioLoop() {
    if (this._stopping) return;

    var soundData = new Float32Array(1200);
    this.generateFrames(soundData);
    if (this._audio != null) this._audio.mozWriteAudio(soundData);
  }).bind(this), 60); // Avoiding under-run issues by keeping this low
};

// Generating audio frames for the 2 given frequencies
_TonePlayer.prototype.generateFrames =
    function tp_generateFrames(soundData, shortPress) {
  var position = this._position;

  var kr = 2 * Math.PI * this._frequencies[0] / this._sampleRate;
  var kc = 2 * Math.PI * this._frequencies[1] / this._sampleRate;

  for (var i = 0; i < soundData.length; i++) {
    // Poor man's ADSR
    // Only short press have a release phase because we don't know
    // when the long press will end
    var factor;
    if (position < 200) {
      // Attack
      factor = position / 200;
    } else if (position > 200 && position < 400) {
      // Decay
      factor = 1 - ((position - 200) / 200) * 0.3; // Decay factor
    } else if (shortPress && position > 800) {
      // Release, short press only
      factor = 0.7 - ((position - 800) / 400 * 0.7);
    } else {
      // Sustain
      factor = 0.7;
    }

    soundData[i] = (Math.sin(kr * position) +
                    Math.sin(kc * position)) / 2 * factor;
    position++;
  }

  this._position += soundData.length;
};

var TonePlayer = new _TonePlayer({
  sampleRate: 8000
});

function _KeypadManager(config) {
  BaseKeypadManager.call(this, config);
}

extend(_KeypadManager, BaseKeypadManager);

_KeypadManager.prototype.render = function hk_render(layoutType) {
  if (layoutType == 'oncall') {
    var numberNode = CallScreen.activeCall.querySelector('.number');
    this._phoneNumber = numberNode.textContent;
    var additionalContactInfoNode = CallScreen.activeCall.
    querySelector('.additionalContactInfo');
    this._additionalContactInfo = additionalContactInfoNode.textContent;
    this._isKeypadClicked = false;
    this.phoneNumberViewContainer.classList.add('keypad-visible');
    this._originalPhoneNumber = this._phoneNumber;
    this._originalAdditionalContactInfo = this._additionalContactInfo;
    if (this.callBar) {
      this.callBar.classList.add('hide');
    }

    if (this.hideBar) {
      this.hideBar.classList.remove('hide');
    }

    this.deleteButton.classList.add('hide');
  } else {
    this.phoneNumberViewContainer.classList.remove('keypad-visible');
    if (this.callBar) {
      this.callBar.classList.remove('hide');
    }

    if (this.hideBar) {
      this.hideBar.classList.add('hide');
    }

    this.deleteButton.classList.remove('hide');
  }
};

_KeypadManager.prototype.hangUpCallFromKeypad =
    function hk_hangUpCallFromKeypad(event) {
  CallScreen.body.classList.remove('showKeypad');
  OnCallHandler.end();
};

_KeypadManager.prototype.formatPhoneNumber =
    function kh_formatPhoneNumber(ellipsisSide, maxFontSize) {
  var view, fakeView;
  if (this._onCall) {
    fakeView = CallScreen.activeCall.querySelector('.fake-number');
    view = CallScreen.activeCall.querySelector('.number');
  } else {
    fakeView = this.fakePhoneNumberView;
    view = this.phoneNumberView;

    // We consider the case where the delete button may have
    // been used to delete the whole phone number.
    if (view.value == '') {
      view.style.fontSize = this.maxFontSize;
      return;
    }
  }

  var newFontSize;
  if (maxFontSize) {
    newFontSize = this.maxFontSize;
  } else {
    newFontSize = this.getNextFontSize(view, fakeView);
  }
  view.style.fontSize = newFontSize + 'px';
  this.addEllipsis(view, fakeView, ellipsisSide);
};

_KeypadManager.prototype.addEllipsis =
    function kh_addEllipsis(view, fakeView, ellipsisSide) {
  var side = ellipsisSide || 'begin';
  LazyL10n.get(function localized(_) {
    var localizedSide;
    if (navigator.mozL10n.language.direction === 'rtl') {
      localizedSide = (side === 'begin' ? 'right' : 'left');
    } else {
      localizedSide = (side === 'begin' ? 'left' : 'right');
    }
    var computedStyle = window.getComputedStyle(view, null);
    var currentFontSize = parseInt(computedStyle.getPropertyValue('font-size'));
    var viewWidth = view.getBoundingClientRect().width;
    fakeView.style.fontSize = currentFontSize + 'px';
    fakeView.innerHTML = view.value ? view.value : view.innerHTML;

    var value = fakeView.innerHTML;

    // Guess the possible position of the ellipsis in order to minimize
    // the following while loop iterations:
    var counter = value.length - (viewWidth *
      (fakeView.textContent.length / fakeView.getBoundingClientRect().width));

    var newPhoneNumber;
    while (fakeView.getBoundingClientRect().width > viewWidth) {

      if (localizedSide == 'left') {
        newPhoneNumber = '\u2026' + value.substr(-value.length + counter);
      } else if (localizedSide == 'right') {
        newPhoneNumber = value.substr(0, value.length - counter) + '\u2026';
      }

      fakeView.innerHTML = newPhoneNumber;
      counter++;
    }

    if (newPhoneNumber) {
      if (view.value) {
        view.value = newPhoneNumber;
      } else {
        view.innerHTML = newPhoneNumber;
      }
    }
  });
};

_KeypadManager.prototype.getNextFontSize =
    function kh_getNextFontSize(view, fakeView) {
  var computedStyle = window.getComputedStyle(view, null);
  var fontSize = parseInt(computedStyle.getPropertyValue('font-size'));
  var viewWidth = view.getBoundingClientRect().width;
  fakeView.style.fontSize = fontSize + 'px';
  fakeView.innerHTML = (view.value ? view.value : view.innerHTML);

  var rect = fakeView.getBoundingClientRect();

  while ((rect.width < viewWidth) && (fontSize < this.maxFontSize)) {
    fontSize = Math.min(fontSize + kFontStep, this.maxFontSize);
    fakeView.style.fontSize = fontSize + 'px';
    rect = fakeView.getBoundingClientRect();
  }

  while ((rect.width > viewWidth) && (fontSize > this.minFontSize)) {
    fontSize = Math.max(fontSize - kFontStep, this.minFontSize);
    fakeView.style.fontSize = fontSize + 'px';
    rect = fakeView.getBoundingClientRect();
  }

  return fontSize;
};

_KeypadManager.prototype.keyHandler = function kh_keyHandler(event) {
  var key = event.target.dataset.value;

  // We could receive this event from an element that
  // doesn't have the dataset value. Got the last key
  // pressed and assing this value to continue with the
  // proccess.
  if (!key) {
    return;
  }

  var telephony = navigator.mozTelephony;

  event.stopPropagation();
  if (event.type == 'mousedown') {
    this._longPress = false;

    if (key != 'delete') {
      if (keypadSoundIsEnabled) {
        // We do not support long press if not on a call
        TonePlayer.start(BaseKeypadManager.gTonesFrequencies[key],
                            !this._onCall);
      }

      // Sending the DTMF tone if on a call
      if (this._onCall) {
        // Stop previous tone before dispatching a new one
        telephony.stopTone();
        telephony.startTone(key);
      }
    }

    // Manage long press
    if ((key == '0' && !this._onCall) || key == 'delete') {
      this._holdTimer = setTimeout(function(self) {
        if (key == 'delete') {
          self._phoneNumber = '';
        } else {
          var index = self._phoneNumber.length - 1;
          //Remove last 0, this is a long press and we want to add the '+'
          if (index >= 0 && self._phoneNumber[index] === '0') {
            self._phoneNumber = self._phoneNumber.substr(0, index);
          }
          self._phoneNumber += '+';
        }

        self._longPress = true;
        self.updateAddContactStatus();
        self._updatePhoneNumberView('begin', false);
      }, 400, this);
    }

    // Voicemail long press (needs to be longer since it actually dials)
    if (event.target.dataset.voicemail) {
      this._holdTimer = setTimeout(function vm_call(self) {
        self._longPress = true;
        self._callVoicemail();
      }, 3000, this);
    }

    if (key == 'delete') {
      this._phoneNumber = this._phoneNumber.slice(0, - 1);
      this.updateAddContactStatus();
    } else if (this.phoneNumberViewContainer.classList.
    contains('keypad-visible')) {
      if (!this._isKeypadClicked) {
        this._isKeypadClicked = true;
        this._phoneNumber = key;
        this._additionalContactInfo = '';
        this._updateAdditionalContactInfoView();
      } else {
        this._phoneNumber += key;
      }
    } else {
      this._phoneNumber += key;
      this.updateAddContactStatus();
    }
    this._updatePhoneNumberView('begin', false);
  } else if (event.type == 'mouseup' || event.type == 'mouseleave') {
    // Stop playing the DTMF/tone after a small delay
    // or right away if this is a long press

    var delay = this._longPress ? 0 : 100;
    if (this._onCall) {
      if (keypadSoundIsEnabled) {
        TonePlayer.stop();
      }

      window.setTimeout(function ch_stopTone() {
        telephony.stopTone();
      }, delay);
    }

    // If it was a long press our work is already done
    if (this._longPress) {
      this._longPress = false;
      this._holdTimer = null;
      return;
    }

    if (this._holdTimer) clearTimeout(this._holdTimer);
  }
};

_KeypadManager.prototype.updatePhoneNumber =
    function kh_updatePhoneNumber(number, ellipsisSide, maxFontSize) {
  this._phoneNumber = number;
  this._updatePhoneNumberView(ellipsisSide, maxFontSize);
};

_KeypadManager.prototype._updatePhoneNumberView =
    function kh_updatePhoneNumberview(ellipsisSide, maxFontSize) {
  var phoneNumber = this._phoneNumber;

  // If there are digits in the phone number, show the delete button.
  if (!this._onCall) {
    var visibility = (phoneNumber.length > 0) ? 'visible' : 'hidden';
    this.deleteButton.style.visibility = visibility;
  }

  if (this._onCall) {
    var view = CallScreen.activeCall.querySelector('.number');
    view.textContent = phoneNumber;
  } else {
    this.phoneNumberView.value = phoneNumber;
    this.moveCaretToEnd(this.phoneNumberView);
  }

  this.formatPhoneNumber(ellipsisSide, maxFontSize);
};

_KeypadManager.prototype.restorePhoneNumber =
    function kh_restorePhoneNumber(ellipsisSide, maxFontSize) {
  this.updatePhoneNumber(this._originalPhoneNumber, ellipsisSide,
  maxFontSize);
};

_KeypadManager.prototype.updateAdditionalContactInfo =
    function kh_updateAdditionalContactInfo(additionalContactInfo) {
  this._additionalContactInfo = additionalContactInfo;
  this._updateAdditionalContactInfoView();
};

_KeypadManager.prototype._updateAdditionalContactInfoView =
    function kh__updateAdditionalContactInfoView() {
  var phoneNumberView = CallScreen.activeCall.querySelector('.number');
  var additionalview =
      CallScreen.activeCall.querySelector('.additionalContactInfo');

  if (!this._additionalContactInfo ||
      this._additionalContactInfo.trim() === '') {
    additionalview.textContent = '';
    additionalview.classList.add('noAdditionalContactInfo');
    phoneNumberView.classList.add('noAdditionalContactInfo');
  } else {
    phoneNumberView.classList.remove('noAdditionalContactInfo');
    additionalview.classList.remove('noAdditionalContactInfo');
    additionalview.textContent = this._additionalContactInfo;
  }
};

_KeypadManager.prototype.restoreAdditionalContactInfo =
    function kh_restoreAdditionalContactInfo() {
  this.updateAdditionalContactInfo(this._originalAdditionalContactInfo);
};

_KeypadManager.prototype._callVoicemail = function kh_callVoicemail() {
  var voicemail = navigator.mozVoicemail;
  if (voicemail && voicemail.number) {
    CallHandler.call(voicemail.number);
    return;
  }
  var settings = navigator.mozSettings;
  if (!settings) {
    return;
  }
  var transaction = settings.createLock();
  var request = transaction.get('ril.iccInfo.mbdn');
  request.onsuccess = function() {
    if (request.result['ril.iccInfo.mbdn']) {
      CallHandler.call(request.result['ril.iccInfo.mbdn']);
    }
  };
  request.onerror = function() {};
};

var KeypadManager = new _KeypadManager({
  phoneNumber: ''
});

function extend(subClass, superClass) {
  var F = function() {};
  F.prototype = superClass.prototype;
  subClass.prototype = new F();
  subClass.prototype.constructor = subClass;
  subClass.uber = superClass.prototype;
}
