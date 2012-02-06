'use strict';

var kFontStep = 8;
var kMinFontSize = 24;
var kDefaultFontSize = 64;
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
  if (!data.hidden)
    visibilityChanged(data.url);
});

function visibilityChanged(url) {
  // TODO do something better here
  var contacts = document.getElementById('contacts-label');
  if (url.indexOf('?choice=contact') != -1 ||
      contacts.hasAttribute('data-active')) {
    Contacts.load();
    choiceChanged(contacts);
  }
}

function choiceChanged(target) {
  var choice = target.dataset.choice;
  if (!choice)
    return;

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
      var smoother = 1 - (i/soundData.length);
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

    var mainKeys = [
      { title: '1', details: '' },
      { title: '2', details: 'abc' },
      { title: '3', details: 'def' },
      { title: '4', details: 'ghi' },
      { title: '5', details: 'jkl' },
      { title: '6', details: 'mno' },
      { title: '7', details: 'pqrs' },
      { title: '8', details: 'tuv' },
      { title: '9', details: 'wxyz' },
      { title: '\u2217', value: '*', details: '' },
      { title: '0', details: '+' },
      { title: '#', details: '' }
    ];

    var mainKey = document.getElementById('mainKeyset');
    var row = null;
    mainKeys.forEach(function(key, index) {
      if (index % 3 == 0) {
        row = document.createElement('div');
        row.className = 'keyboard-row';
        mainKey.appendChild(row);
      }

      var container = document.createElement('div');
      container.className = 'keyboard-key';
      var value = 'value' in key ? key.value : key.title;
      container.setAttribute('data-value', value);

      var title = document.createElement('span');
      title.appendChild(document.createTextNode(key.title));
      container.appendChild(title);

      var details = document.createElement('span');
      details.appendChild(document.createTextNode(key.details));
      container.appendChild(details);
      row.appendChild(container);
    });

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
      } else if (fontSize < kDefaultFontSize) {
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

    var text = this.formatPhoneNumber(this.phoneNumber.value);
    view.innerHTML = text;

    var newFontSize =
      text ? getNextFontSize(parseInt(fontSize), text) : kDefaultFontSize;
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

  // callbacks
  call: function ch_call(number) {
    this.numberView.innerHTML = number;
    this.statusView.innerHTML = 'Calling...';
    this.actionsView.classList.remove('displayed');
    this.callButton.dataset.action = 'end';
    this.toggleCallScreen();

    var call = window.navigator.mozTelephony.dial(number);
    call.addEventListener('statechange', this);
    this.currentCall = call;
  },
  incoming: function ch_incoming(call) {
    this.currentCall = call;
    call.addEventListener('statechange', this);

    this.numberView.innerHTML = call.number;
    this.statusView.innerHTML = 'Incoming call...';
    this.actionsView.classList.remove('displayed');
    this.callButton.dataset.action = 'answer';
    this.toggleCallScreen();
  },
  connected: function ch_connected() {
    // hardening against rapid ending
    if (!document.getElementById('call-screen').classList.contains('oncall'))
      return;

    this.statusView.innerHTML = '00:00';
    this.actionsView.classList.add('displayed');
    this.callButton.dataset.action = 'end';

    this._ticker = setInterval(function ch_updateTimer(self, startTime) {
      var elapsed = new Date(Date.now() - startTime);
      self.statusView.innerHTML = elapsed.toLocaleFormat('%M:%S');
    }, 1000, this, Date.now());
  },
  answer: function ch_answer() {
    this.currentCall.answer();
  },
  end: function ch_end() {
    this.currentCall.hangUp();
  },
  disconnected: function ch_disconnected() {
    this.toggleCallScreen();

    this.actionsView.classList.remove('displayed');
    if (this.muteButton.classList.contains('mute'))
      this.toggleMute();
    if (this.speakerButton.classList.contains('speak'))
      this.toggleSpeaker();

    this.closeModal();
    clearInterval(this._ticker);

    this.currentCall.removeEventListener('statechange', this);
    this.currentCall = null;
  },

  handleEvent: function fm_handleEvent(evt) {
    console.log('Call changed state: ' + evt.call.state);
    switch (evt.call.state) {
      case 'incoming':
        console.log('incoming call from ' + evt.call.number);
        this.incoming(evt.call);
        break;
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
  get numberView() {
    delete this.numberView;
    return this.numberView = document.getElementById('call-number-view');
  },
  get statusView() {
    delete this.statusView;
    return this.statusView = document.getElementById('call-status-view');
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
  get callButton() {
    delete this.callButton;
    return this.callButton = document.getElementById('call-button');
  },

  execute: function ch_execute(action) {
    if (!this[action]) {
      this.end();
      return;
    }

    this[action]();
  },

  toggleCallScreen: function ch_toggleScreen() {
    document.getElementById('tabs-container').classList.toggle('oncall');
    document.getElementById('views').classList.toggle('oncall');
    document.getElementById('call-screen').classList.toggle('oncall');
  },
  toggleMute: function ch_toggleMute() {
    this.muteButton.classList.toggle('mute');
    // TODO: make the actual mute call on the telephony API
  },
  toggleSpeaker: function ch_toggleSpeaker() {
    this.speakerButton.classList.toggle('speak');
    // TODO: make the actual speaker call
  },
  keypad: function ch_keypad() {
    choiceChanged(document.getElementById('keyboard-label'));
    this.toggleModal();
  },
  contacts: function ch_contacts() {
    Contacts.load();
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
    views.classList.add('hidden');
    views.addEventListener('transitionend', function ch_closeModalFinish() {
      views.removeEventListener('transitionend', ch_closeModalFinish);
      views.classList.remove('modal');
      views.classList.remove('hidden');
    });
  }
};

window.addEventListener('load', function keyboardInit(evt) {
  window.removeEventListener('load', keyboardInit);

  KeyHandler.init();
  navigator.mozTelephony.addEventListener('incoming', CallHandler);

  var readyEvent = document.createEvent('CustomEvent');
  readyEvent.initCustomEvent('appready', true, true, null);
  window.dispatchEvent(readyEvent);
});

