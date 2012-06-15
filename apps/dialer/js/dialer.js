'use strict';

var kFontStep = 4;
var kMinFontSize = 12;
// Frequencies comming from http://en.wikipedia.org/wiki/Telephone_keypad
var gTonesFrequencies = {
  '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
  '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
  '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
  '*': [941, 1209], '0': [941, 1336], '#': [941, 1477]
};

document.addEventListener('mozvisibilitychange', function visibility(e) {
  var url = document.location.href;
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

  if (document.mozHidden) {
    Recents.stopUpdatingDates();
  } else {
    Recents.startUpdatingDates();

    var choice = params['choice'];
    var contacts = document.getElementById('contacts-label');
    if (choice == 'contact' || contacts.hasAttribute('data-active')) {
      Contacts.load();
      choiceChanged(contacts);
    }
  }
});

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
        case '*':
          self.phoneNumber.value = self.phoneNumber.value.slice(0, -1) + '#';
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

    if (key == 'del-digit') {
      this.phoneNumber.value = KeyHandler.phoneNumber.value.slice(0, -1);
      this.updateFontSize();
    } else if (key == 'make-call') {
      // TODO: update the call button style to show his availability
      if (this.phoneNumber.value != '') {
        CallHandler.call(this.phoneNumber.value);
      }
    } else {
      this.phoneNumber.value += key;
      this.updateFontSize();
      TonePlayer.play(gTonesFrequencies[key]);

      // Sending the DTMF tone
      var telephony = navigator.mozTelephony;
      if (telephony) {
        telephony.startTone(key);
        window.setTimeout(function ch_stopTone() {
          telephony.stopTone();
        }, 100);
      }
    }

    this._timeout = window.setTimeout(callback, 400, this);
  },

  keyUp: function kh_keyUp(event) {
    if (this._timeout) {
      clearTimeout(this._timeout);
      this._timeout = null;
    }
  }
};

var CallHandler = {
  currentCall: null,
  _onCall: false,
  _screenLock: null,

  setupTelephony: function ch_setupTelephony() {
    if (this._telephonySetup)
      return;

    this._telephonySetup = true;

    // Somehow the muted property appears to true after initialization.
    // Set it to false.
    navigator.mozTelephony.muted = false;

    var telephony = navigator.mozTelephony;
    if (telephony.calls.length > 0) {
      var call = telephony.calls[0];
      CallHandler.incoming(call);
    }

    telephony.oncallschanged = function cc(evt) {
      telephony.calls.forEach(function(call) {
        if (call.state == 'incoming')
          CallHandler.incoming(call);
      });
    };
  },

  // callbacks
  call: function ch_call(number) {
    this.callScreen.classList.remove('incoming');
    this.callScreen.classList.remove('in-call');
    this.callScreen.classList.add('calling');
    this.numberView.innerHTML = number;

    this.lookupContact(number);

    var sanitizedNumber = number.replace(/-/g, '');

    var call = window.navigator.mozTelephony.dial(sanitizedNumber);
    call.addEventListener('statechange', this);
    this.currentCall = call;

    this.recentsEntry = {date: Date.now(), type: 'outgoing', number: number};

    this.toggleCallScreen();
  },

  incoming: function ch_incoming(call) {
    this.callScreen.classList.remove('calling');
    this.callScreen.classList.remove('in-call');
    this.callScreen.classList.add('incoming');

    this.currentCall = call;
    call.addEventListener('statechange', this);

    this.recentsEntry = {
      date: Date.now(),
      type: 'incoming',
      number: call.number
    };

    this.numberView.innerHTML = call.number || 'Anonymous';

    if (call.number)
      this.lookupContact(call.number);

    this.toggleCallScreen();
  },

  connected: function ch_connected() {
    var callDirectionChar = '';
    if (this.callScreen.classList.contains('incoming')) {
      this.callScreen.classList.remove('incoming');
      callDirectionChar = '&#8618';
    } else if (this.callScreen.classList.contains('calling')) {
      this.callScreen.classList.remove('calling');
      callDirectionChar = '&#8617';
    }
    this.callScreen.classList.add('in-call');

    // hardening against rapid ending
    if (!this._onCall)
      return;

    this.durationView.innerHTML = callDirectionChar + ' ' + '00:00';

    this.recentsEntry.type += '-connected';

    this._ticker = setInterval(function ch_updateTimer(self, startTime) {
      var elapsed = new Date(Date.now() - startTime);
      self.durationView.innerHTML = callDirectionChar + ' ' +
        elapsed.toLocaleFormat('%M:%S');
    }, 1000, this, Date.now());
  },

  answer: function ch_answer() {
    this.currentCall.answer();
  },

  end: function ch_end() {
    if (this.recentsEntry &&
       (this.recentsEntry.type.indexOf('-connected') == -1)) {
      this.recentsEntry.type += '-refused';
    }

    if (this.currentCall) {
      this.currentCall.hangUp();
    }

    // We're not waiting for a disconnected statechange
    // If the user touch the 'end' button we wants to get
    // out of the call-screen right away.
    this.disconnected();
  },

  disconnected: function ch_disconnected() {
    if (this.currentCall) {
      this.currentCall.removeEventListener('statechange', this);
      this.currentCall = null;
    }

    if (this.muteButton.classList.contains('mute'))
      this.toggleMute();
    if (this.speakerButton.classList.contains('speak'))
      this.toggleSpeaker();
    if (this.keypadButton.classList.contains('displayed'))
      this.toggleKeypad();

    if (this._ticker) {
      clearInterval(this._ticker);
      this._ticker = null;
    }

    this.toggleCallScreen();

    if (this.recentsEntry) {
      Recents.add(this.recentsEntry);

      if ((this.recentsEntry.type.indexOf('outgoing') == -1) &&
          (this.recentsEntry.type.indexOf('-refused') == -1) &&
          (this.recentsEntry.type.indexOf('-connected') == -1)) {

        var number = this.recentsEntry.number;
        navigator.mozApps.getSelf().onsuccess = function(evt) {
          var app = evt.target.result;

          // Taking the first icon for now
          // TODO: define the size
          var icons = app.manifest.icons;
          var iconURL = null;
          if (icons) {
            iconURL = app.installOrigin + icons[Object.keys(icons)[0]];
          }

          var notiClick = function() {
            // Asking to launch itself
            app.launch();
          };

          var title = 'Missed call';
          var body = 'From ' + number;

          NotificationHelper.send(title, body, iconURL, notiClick);
        };
      }

      this.recentsEntry = null;
    }
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
  get durationView() {
    delete this.durationView;
    return this.durationView = document.getElementById('call-duration-view');
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
  get keypadButton() {
    delete this.keypadButton;
    return this.keypadButton = document.getElementById('keypad-button');
  },
  get keypadView() {
    delete this.keypadView;
    return this.keypadView = document.getElementById('kb-keypad');
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
    var finished = false;

    var finishTransition = function ch_finishTransition() {
      if (finished)
        return;

      if (securityTimeout) {
        clearTimeout(securityTimeout);
        securityTimeout = null;
      }

      finished = true;

      window.setTimeout(function cs_transitionNextLoop() {
        callScreen.classList.add('animate');
        callScreen.classList.toggle('oncall');
        callScreen.classList.toggle('prerender');
      });
    };

    window.addEventListener('MozAfterPaint', function ch_finishAfterPaint() {
      window.removeEventListener('MozAfterPaint', ch_finishAfterPaint);
      finishTransition();
    });
    var securityTimeout = window.setTimeout(finishTransition, 100);

    this._onCall = !this._onCall;

    // Assume we always either onCall or not, and always onCall before
    // not onCall.
    if (this._onCall) {
      this._screenLock = navigator.requestWakeLock('screen');
      ProximityHandler.enable();
    } else {
      this._screenLock.unlock();
      this._screenLock = null;
      ProximityHandler.disable();
    }
  },

  toggleMute: function ch_toggleMute() {
    this.muteButton.classList.toggle('mute');
    navigator.mozTelephony.muted = !navigator.mozTelephony.muted;
  },

  toggleKeypad: function ch_toggleKeypad() {
    this.keypadButton.classList.toggle('displayed');
    this.keypadView.classList.toggle('overlay');
  },

  toggleSpeaker: function ch_toggleSpeaker() {
    this.speakerButton.classList.toggle('speak');
    navigator.mozTelephony.speakerEnabled =
      !navigator.mozTelephony.speakerEnabled;
  },

  lookupContact: function ch_lookupContact(number) {
    Contacts.findByNumber(number, (function(contact) {
      this.numberView.innerHTML = contact.name;
    }).bind(this));
  }
};

window.addEventListener('localized', function startup(evt) {
  window.removeEventListener('localized', startup);

  KeyHandler.init();
  CallHandler.setupTelephony();

  // Set the 'lang' and 'dir' attributes to <html> when the page is translated
  var html = document.querySelector('html');
  var lang = document.mozL10n.language;
  html.lang = lang.code;
  html.dir = lang.direction;

  // <body> children are hidden until the UI is translated
  document.body.classList.remove('hidden');
});
