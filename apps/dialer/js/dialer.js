'use strict';

var kFontStep = 8;
var kMinFontSize = 12;
// Frequencies comming from http://en.wikipedia.org/wiki/Telephone_keypad
var gTonesFrequencies = {
  '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
  '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
  '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
  '*': [941, 1209], '0': [941, 1336], '#': [941, 1477]
};


// Bug 690056 implement a visibility API, and it's likely that
// we want this event to be fire when an app come back to life
// or is minimized (it does not now).
window.addEventListener('message', function visibleApp(evt) {
  var data = evt.data;
  if (evt.data.message == 'visibilitychange' && !data.hidden) {
    visibilityChanged(data.url, evt);
  } else if (evt.data == 'connected') {
    CallHandler.connected();
  } else if (evt.data == 'disconnected') {
    CallHandler.disconnected();
  }
});

function visibilityChanged(url, evt) {
  var params = (function makeURL() {
    var a = document.createElement('a');
    a.href = url;

    var rv = {};
    var params = a.search.substring(1, a.search.length).split('&');
    for (var i = 0; i < params.length; i++) {
      var data = params[i].split('=');
      rv[data[0]] = data[1];
    }
    return rv;
  })();

  var choice = params['choice'];
  var contacts = document.getElementById('contacts-label');
  if (choice == 'contact' || contacts.hasAttribute('data-active')) {
    Contacts.load();
    choiceChanged(contacts);
  }
}

function choiceChanged(target) {
  var choice = target.dataset.choice;
  if (!choice)
    return;

  if (choice == 'contacts') {
    Contacts.load();
  }

  var view = document.getElementById(choice + '-view');
  if (!view)
    return;

  var tabs = document.getElementById('tabs').querySelector('fieldset');
  var tabsCount = tabs.childElementCount;
  for (var i = 0; i < tabsCount; i++) {
    var tab = tabs.children[i];
    delete tab.dataset.active;

    var tabView = document.getElementById(tab.dataset.choice + '-view');
    if (tabView)
      tabView.hidden = true;
  }

  target.dataset.active = true;
  view.hidden = false;
}

var TonePlayer = {
  _sampleRate: 4000,

  init: function tp_init() {
   this._audio = new Audio();
   this._audio.mozSetup(2, this._sampleRate);
  },

  generateFrames: function tp_generateFrames(soundData, freqRow, freqCol) {
    var currentSoundSample = 0;
    var kr = 2 * Math.PI * freqRow / this._sampleRate;
    var kc = 2 * Math.PI * freqCol / this._sampleRate;
    for (var i = 0; i < soundData.length; i += 2) {
      var smoother = 0.5 + (Math.sin((i * Math.PI) / soundData.length)) / 2;

      soundData[i] = Math.sin(kr * currentSoundSample) * smoother;
      soundData[i + 1] = Math.sin(kc * currentSoundSample) * smoother;

      currentSoundSample++;
    }
  },

  play: function tp_play(frequencies) {
    var soundDataSize = this._sampleRate / 4;
    var soundData = new Float32Array(soundDataSize);
    this.generateFrames(soundData, frequencies[0], frequencies[1]);
    this._audio.mozWriteAudio(soundData);
  }
};

var KeyHandler = {
  get phoneNumber() {
    delete this.phoneNumber;
    return this.phoneNumber = document.getElementById('phone-number');
  },

  get fakePhoneNumberView() {
    delete this.fakePhoneNumberView;
    return this.fakePhoneNumberView =
      document.getElementById('fake-phone-number-view');
  },

  get phoneNumberView() {
    delete this.phoneNumberView;
    return this.phoneNumberView = document.getElementById('phone-number-view');
  },

  init: function kh_init() {
    this.phoneNumber.value = '';

    TonePlayer.init();
  },

  isContactShortcut: function kh_isContactShortcut(key) {
    // TODO implement key shortcuts
    return false;
  },

  formatPhoneNumber: function kh_formatPhoneNumber(phoneNumber) {
    // TODO implement formatting depending on locale
    return phoneNumber;
  },

  updateFontSize: function kh_updateFontSize() {
    var self = this;
    function getNextFontSize(fontSize, text) {
      var div = self.fakePhoneNumberView;
      div.style.fontSize = fontSize + 'px';
      div.innerHTML = text;

      var viewWidth = self.phoneNumberView.getBoundingClientRect().width;
      var rect = div.getBoundingClientRect();
      if (rect.width > viewWidth) {
        fontSize = Math.max(fontSize - kFontStep, kMinFontSize);
      } else if (fontSize < self._initialFontSize) {
        div.style.fontSize = (fontSize + kFontStep) + 'px';
        rect = div.getBoundingClientRect();
        if (rect.width <= viewWidth)
          fontSize += kFontStep;
      }

      return fontSize;
    }

    var view = this.phoneNumberView;
    var computedStyle = window.getComputedStyle(view, null);
    var fontSize = computedStyle.getPropertyValue('font-size');
    if (!this._initialFontSize) {
      this._initialFontSize = parseInt(fontSize);
    }

    var text = this.formatPhoneNumber(this.phoneNumber.value);
    view.innerHTML = text;

    var newFontSize =
      text ? getNextFontSize(parseInt(fontSize), text) : this._initialFontSize;
    if (newFontSize != fontSize)
    view.style.fontSize = newFontSize + 'px';
  },

  keyDown: function kh_keyDown(event) {
    var key = event.target.getAttribute('data-value');
    if (!key)
      return;

    var callback = function(self) {
      switch (key) {
        case '0':
          self.phoneNumber.value = self.phoneNumber.value.slice(0, -1) + '+';
          break;
        case 'del':
          self.phoneNumber.value = '';
          break;
        default:
          if (self.isContactShortcut(key))
            return;
          break;
      }
      self.updateFontSize();
    };

    if (key == 'del') {
      this.phoneNumber.value = KeyHandler.phoneNumber.value.slice(0, -1);
      this.updateFontSize();
    } else if (key == 'call') {
      // TODO: update the call button style to show his availability
      if (this.phoneNumber.value != '') {
        CallHandler.call(this.phoneNumber.value);
      }
    } else {
      this.phoneNumber.value += key;
      this.updateFontSize();
      TonePlayer.play(gTonesFrequencies[key]);
    }

    this._timeout = window.setTimeout(callback, 400, this);
  },

  keyUp: function kh_keyUp(event) {
    clearTimeout(this._timeout);
  }
};

var CallHandler = {
  currentCall: null,
  _onCall: false,

  setupTelephony: function ch_setupTelephony() {
    if (this._telephonySetup)
      return;

    this._telephonySetup = true;

    var telephony = navigator.mozTelephony;
    if (telephony.calls.length > 0) {
      var call = telephony.calls[0];
      CallHander.incoming(call, call.number);
    }

    telephony.oncallschanged = function cc(evt) {
      telephony.calls.forEach(function(call) {
        if (call.state == 'incoming')
          CallHandler.incoming(call, call.number);
      });
    };
  },

  // callbacks
  call: function ch_call(number) {
    this.callScreen.classList.remove('incoming');
    this.callScreen.classList.add('calling');
    this.numberView.innerHTML = number;
    this.statusView.innerHTML = 'Calling...';

    var sanitizedNumber = number.replace(/-/g, '');
    var call = window.navigator.mozTelephony.dial(sanitizedNumber);
    call.addEventListener('statechange', this);
    this.currentCall = call;

    this.recentsEntry = {date: Date.now(), type: 'outgoing', number: number};

    // XXX: remove the fake contact when the contact API lands
    this.pictureView.innerHTML = '';
    var self = this;
    Contacts.findByNumber(number, function showPicture(contact) {
      self.pictureView.innerHTML = profilePictureForNumber(contact.id);
    });

    this.toggleCallScreen();
  },
  incoming: function ch_incoming(call, number) {
    this.callScreen.classList.remove('calling');
    this.callScreen.classList.add('incoming');

    this.currentCall = call;
    call.addEventListener('statechange', this);

    this.recentsEntry = {date: Date.now(), type: 'incoming', number: number};

    this.numberView.innerHTML = call.number;
    this.statusView.innerHTML = 'Call from...';
    this.pictureView.innerHTML = '';

    // XXX: remove the fake contact when the contact API lands
    this.pictureView.innerHTML = profilePictureForNumber(parseInt(number));

    this.toggleCallScreen();
  },
  connected: function ch_connected() {
    this.callScreen.classList.remove('incoming');
    this.callScreen.classList.add('calling');
    // hardening against rapid ending
    if (!this._onCall)
      return;

    this.statusView.innerHTML = '00:00';

    this.recentsEntry.type = this.recentsEntry.type + '-connected';

    this._ticker = setInterval(function ch_updateTimer(self, startTime) {
      var elapsed = new Date(Date.now() - startTime);
      self.statusView.innerHTML = elapsed.toLocaleFormat('%M:%S');
    }, 1000, this, Date.now());
  },
  answer: function ch_answer() {
    this.currentCall.answer();
  },
  end: function ch_end() {
    if (this.currentCall) {
      this.currentCall.hangUp();
    } else {
      this.disconnected();
    }
  },
  disconnected: function ch_disconnected() {
    if (this.currentCall) {
      this.currentCall.removeEventListener('statechange', this);
      this.currentCall = null;
    }

    if (this.recentsEntry) {
      Recents.add(this.recentsEntry);
      this.recentsEntry = null;
    }

    if (this.muteButton.classList.contains('mute'))
      this.toggleMute();
    if (this.speakerButton.classList.contains('speak'))
      this.toggleSpeaker();

    this.closeModal();
    clearInterval(this._ticker);

    this.toggleCallScreen();
  },

  handleEvent: function fm_handleEvent(evt) {
    switch (evt.call.state) {
      case 'connected':
        this.connected();
        break;
      case 'disconnected':
        this.disconnected();
        break;
      default:
        break;
    }
  },

  // properties / methods
  get callScreen() {
    delete this.callScreen;
    return this.callScreen = document.getElementById('call-screen');
  },
  get numberView() {
    delete this.numberView;
    return this.numberView = document.getElementById('call-number-view');
  },
  get statusView() {
    delete this.statusView;
    return this.statusView = document.getElementById('call-status-view');
  },
  get pictureView() {
    delete this.pictureView;
    return this.pictureView = document.getElementById('call-picture');
  },
  get actionsView() {
    delete this.actionsView;
    return this.actionsView = document.getElementById('call-actions-container');
  },
  get muteButton() {
    delete this.muteButton;
    return this.muteButton = document.getElementById('mute-button');
  },
  get speakerButton() {
    delete this.speakerButton;
    return this.speakerButton = document.getElementById('speaker-button');
  },
  get holdButton() {
    delete this.holdButton;
    return this.holdButton = document.getElementById('hold-button');
  },

  execute: function ch_execute(action) {
    if (!this[action]) {
      this.end();
      return;
    }

    this[action]();
  },

  toggleCallScreen: function ch_toggleScreen() {
    var callScreen = document.getElementById('call-screen');
    callScreen.classList.remove('animate');

    var onCall = this._onCall;
    callScreen.classList.toggle('prerender');

    // hardening against the unavailability of MozAfterPaint
    var finishTransition = function ch_finishTransition() {
      if (securityTimeout) {
        clearTimeout(securityTimeout);
        securityTimeout = null;
      }

      callScreen.classList.add('animate');

      callScreen.classList.toggle('oncall');
      callScreen.classList.toggle('prerender');
    };

    window.addEventListener('MozAfterPaint', function ch_triggerTransition() {
      window.removeEventListener('MozAfterPaint', ch_triggerTransition);
      finishTransition();
    });

    var securityTimeout = setTimeout(finishTransition, 100);

    this._onCall = !this._onCall;
  },
  toggleMute: function ch_toggleMute() {
    this.muteButton.classList.toggle('mute');
    navigator.mozTelephony.muted = !navigator.mozTelephony.muted;
  },
  toggleSpeaker: function ch_toggleSpeaker() {
    this.speakerButton.classList.toggle('speak');
    navigator.mozTelephony.speakerEnabled =
      !navigator.mozTelephony.speakerEnabled;
  },
  toggleHold: function ch_toggleHold() {
    this.holdButton.classList.toggle('hold');
    // TODO: make the actual hold call
  },
  keypad: function ch_keypad() {
    choiceChanged(document.getElementById('keyboard-label'));
    this.toggleModal();
  },
  contacts: function ch_contacts() {
    choiceChanged(document.getElementById('contacts-label'));
    this.toggleModal();
  },
  toggleModal: function ch_toggleModal() {
    // 2 steps closing to avoid showing the view in its non-modal state
    // during the transition
    var views = document.getElementById('views');
    if (views.classList.contains('modal')) {
      this.closeModal();
      return;
    }

    views.classList.add('modal');
  },
  closeModal: function ch_closeModal() {
    var views = document.getElementById('views');
    views.classList.remove('modal');
  }
};

window.addEventListener('load', function keyboardInit(evt) {
  window.removeEventListener('load', keyboardInit);

  KeyHandler.init();
  CallHandler.setupTelephony();

  window.parent.postMessage('appready', '*');
});

