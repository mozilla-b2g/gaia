'use strict';

function _TonePlayer(config) {
  BaseTonePlayer.call(this, config);
}

extend(_TonePlayer, BaseTonePlayer);

_TonePlayer.prototype.ensureAudio = function tp_ensureAudio() {
  if (this._audio) return;

  this._audio = new Audio();
  this._audio.mozSetup(2, this._sampleRate);
};

_TonePlayer.prototype.generateFrames = function tp_generateFrames(soundData, freqRow, freqCol) {
  var currentSoundSample = 0;
  var kr = 2 * Math.PI * freqRow / this._sampleRate;
  var kc = 2 * Math.PI * freqCol / this._sampleRate;
  for (var i = 0; i < soundData.length; i += 2) {
    var smoother = 0.5 + (Math.sin((i * Math.PI) / soundData.length)) / 2;

    soundData[i] = Math.sin(kr * currentSoundSample) * smoother;
    soundData[i + 1] = Math.sin(kc * currentSoundSample) * smoother;

    currentSoundSample++;
  }
};

_TonePlayer.prototype.play = function tp_play(frequencies) {
  var soundDataSize = this._sampleRate / 4;
  var soundData = new Float32Array(soundDataSize);
  this.generateFrames(soundData, frequencies[0], frequencies[1]);
  this._audio.mozWriteAudio(soundData);
};

var TonePlayer = new _TonePlayer({
  sampleRate: 4000
});

function _KeypadManager(config) {
  BaseKeypadManager.call(this, config);
}

extend(_KeypadManager, BaseKeypadManager);

_KeypadManager.prototype.init = function kh_init() {
  this.phoneNumberView.value = '';
  this._phoneNumber = '';

  var keyHandler = this.keyHandler.bind(this);
  this.keypad.addEventListener('mousedown', keyHandler, true);
  this.keypad.addEventListener('mouseup', keyHandler, true);
  this.deleteButton.addEventListener('mousedown', keyHandler);
  this.deleteButton.addEventListener('mouseup', keyHandler);

  // The keypad add contact bar is only included in the normal version of
  // the keypad.
  if (this.callBarAddContact) {
    this.callBarAddContact.addEventListener('mouseup',
    this.addContact.bind(this));
  }

  // The keypad add contact bar is only included in the normal version and
  // the emergency call version of the keypad.
  if (this.callBarCallAction) {
    this.callBarCallAction.addEventListener('mouseup',
    this.makeCall.bind(this));
  }

  // The keypad cancel bar is only the emergency call version of the keypad.
  if (this.callBarCancelAction) {
    this.callBarCancelAction.addEventListener('mouseup', function() {
      window.parent.LockScreen.switchPanel();
    });
  }

  // The keypad hide bar is only included in the on call version of the
  // keypad.
  if (this.hideBarHideAction) {
    this.hideBarHideAction.addEventListener('mouseup',
    this.callbarBackAction);
  }

  if (this.hideBarHangUpAction) {
    this.hideBarHangUpAction.addEventListener('mouseup',
    this.hangUpCallFromKeypad);
  }

  TonePlayer.init();

  this.render();
};

_KeypadManager.prototype.render = function hk_render(layoutType) {
  if (layoutType == 'oncall') {
    this._onCall = true;
    var numberNode = CallScreen.activeCall.querySelector('.number');
    this._phoneNumber = numberNode.textContent;
    this.phoneNumberViewContainer.classList.add('keypad-visible');
    if (this.callBar) {
      this.callBar.classList.add('hide');
    }

    if (this.hideBar) {
      this.hideBar.classList.remove('hide');
    }

    this.deleteButton.classList.add('hide');
  }
  else {
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

_KeypadManager.prototype.makeCall = function hk_makeCall(event) {
  event.stopPropagation();

  if (this._phoneNumber != '') {
    CallHandler.call(this._phoneNumber);
  }
};

_KeypadManager.prototype.addContact = function hk_addContact(event) {
  var number = this._phoneNumber;
  if (!number) return;

  try {
    new MozActivity({
      name: 'new',
      data: {
        type: 'webcontacts/contact',
        params: {
          'tel': number
        }
      }
    });
  }
  catch (e) {
    console.log('WebActivities unavailable? : ' + e);
  }
};

_KeypadManager.prototype.callbarBackAction = function hk_callbarBackAction(event) {
  CallScreen.hideKeypad();
};

_KeypadManager.prototype.hangUpCallFromKeypad = function hk_hangUpCallFromKeypad(event) {
  CallScreen.views.classList.remove('show');
  OnCallHandler.end();
};

_KeypadManager.prototype.formatPhoneNumber = function kh_formatPhoneNumber(mode) {
  switch (mode) {
  case 'dialpad':
    var fakeView = this.fakePhoneNumberView;
    var view = this.phoneNumberView;

    // We consider the case where the delete button may have
    // been used to delete the whole phone number.
    if (view.value == '') {
      view.style.fontSize = view.dataset.size;
      return;
    }
    break;

  case 'on-call':
    var fakeView = CallScreen.activeCall.querySelector('.fake-number');
    var view = CallScreen.activeCall.querySelector('.number');
    break;
  }

  var computedStyle = window.getComputedStyle(view, null);
  var currentFontSize = computedStyle.getPropertyValue('font-size');
  if (!('size' in view.dataset)) {
    view.dataset.size = currentFontSize;
  }

  var newFontSize = this.getNextFontSize(view, fakeView, parseInt(view.dataset.size), parseInt(currentFontSize));
  view.style.fontSize = newFontSize + 'px';
  this.addEllipsis(view, fakeView, newFontSize);
};

_KeypadManager.prototype.addEllipsis = function kh_addEllipsis(view, fakeView, currentFontSize) {
  var viewWidth = view.getBoundingClientRect().width;
  fakeView.style.fontSize = currentFontSize + 'px';
  fakeView.innerHTML = view.value;

  var counter = 1;
  var value = view.value;

  var newPhoneNumber;
  while (fakeView.getBoundingClientRect().width > viewWidth) {
    newPhoneNumber = '\u2026' + value.substr(-value.length + counter);
    fakeView.innerHTML = newPhoneNumber;
    counter++;
  }

  if (newPhoneNumber) {
    view.value = newPhoneNumber;
  }
};

_KeypadManager.prototype.getNextFontSize = function kh_getNextFontSize(view, fakeView,
fontSize, initialFontSize) {
  var viewWidth = view.getBoundingClientRect().width;
  fakeView.style.fontSize = fontSize + 'px';
  fakeView.innerHTML = view.value;

  var rect = fakeView.getBoundingClientRect();
  while ((rect.width > viewWidth) && (fontSize > minFontSize)) {
    fontSize = Math.max(fontSize - kFontStep, minFontSize);
    fakeView.style.fontSize = fontSize + 'px';
    rect = fakeView.getBoundingClientRect();
  }

  if ((rect.width < viewWidth) && (fontSize < initialFontSize)) {
    fakeView.style.fontSize = (fontSize + kFontStep) + 'px';
    rect = fakeView.getBoundingClientRect();
    if (rect.width <= viewWidth) {
      fontSize += kFontStep;
    }
  }
  return fontSize;
};

_KeypadManager.prototype.keyHandler = function kh_keyHandler(event) {
  var key = event.target.dataset.value;

  if (!key) return;

  event.stopPropagation();
  if (event.type == 'mousedown') {
    this._longPress = false;

    if (key != 'delete') {
      if (keypadSoundIsEnabled) {
        TonePlayer.play(BaseKeypadManager.gTonesFrequencies[key]);
      }

      // Sending the DTMF tone if on a call
      var telephony = navigator.mozTelephony;
      if (telephony && telephony.active && telephony.active.state == 'connected') {

        telephony.startTone(key);
        window.setTimeout(function ch_stopTone() {
          telephony.stopTone();
        }, 100);

      }
    }

    // Manage long press
    if (key == '0' || key == 'delete') {
      this._holdTimer = setTimeout(function(self) {
        if (key == 'delete') {
          self._phoneNumber = '';
        }
        else {
          self._phoneNumber += '+';
        }

        self._longPress = true;
        self._updatePhoneNumberView();
      }, 400, this);
    }

    // Voicemail long press (needs to be longer since it actually dials)
    if (event.target.dataset.voicemail) {
      this._holdTimer = setTimeout(function vm_call(self) {
        self._longPress = true;
        self._callVoicemail();
      }, 3000, this);
    }
  }
  else if (event.type == 'mouseup') {
    // If it was a long press our work is already done
    if (this._longPress) {
      this._longPress = false;
      this._holdTimer = null;
      return;
    }
    if (key == 'delete') {
      this._phoneNumber = this._phoneNumber.slice(0, - 1);
    }
    else {
      this._phoneNumber += key;
    }

    if (this._holdTimer) clearTimeout(this._holdTimer);

    this._updatePhoneNumberView();
  }
};

_KeypadManager.prototype.updatePhoneNumber = function kh_updatePhoneNumber(number) {
  this._phoneNumber = number;
  this._updatePhoneNumberView();
};

_KeypadManager.prototype._updatePhoneNumberView = function kh_updatePhoneNumberview() {
  var phoneNumber = this._phoneNumber;

  // If there are digits in the phone number, show the delete button.
  var visibility = (phoneNumber.length > 0) ? 'visible' : 'hidden';
  this.deleteButton.style.visibility = visibility;

  if (this._onCall) {
    var view = CallScreen.activeCall.querySelector('.number');
    view.textContent = phoneNumber;
    this.formatPhoneNumber('on-call');
  }
  else {
    this.phoneNumberView.value = phoneNumber;
    this.moveCaretToEnd(this.phoneNumberView);
    this.formatPhoneNumber('dialpad');
  }
};

_KeypadManager.prototype._callVoicemail = function kh_callVoicemail() {
  var voicemail = navigator.mozVoicemail;
  if (voicemail && voicemail.number) {
    CallHandler.call(voicemail.number);
  }
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
