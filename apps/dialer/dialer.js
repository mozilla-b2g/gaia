
var kFontStep = 8;
var kMinFontSize = 24;
var kDefaultFontSize = 64;
var gTones = {
  '0': null, '1': null, '2': null, '3': null, '4': null,
  '5': null, '6': null, '7': null, '8': null, '9': null,
  '*': null, '#': null
};


// Bug 690056 implement a visibility API, and it's likely that
// we want this event to be fire when an app come back to life
// or is minimized (it does not now).
window.addEventListener('visibilitychange', function visibleApp(evt) {
  if (!evt.detail.hidden)
    visibilityChanged(evt.detail.url);
});

function visibilityChanged(url) {
  // TODO do something better here
  var contacts = document.getElementById('contacts');
  if (url.indexOf('?choice=contact') != -1 ||
      contacts.hasAttribute('data-active')) {
    choiceChanged(contacts);  
  } else if (url.indexOf('?choice=incoming') != -1) {
    var call = window.navigator.mozTelephony.liveCalls[0];
    CallHandler.incoming(call);
  }
}

function choiceChanged(target) {
  if (!target.classList.contains('choice'))
    return;

  var view = document.getElementById(target.id + '-view');
  if (!view)
    return;

  // XXX this should not live here
  Contacts.hideSearch();

  var choices = document.getElementById('choices');
  var choicesCount = choices.childElementCount;
  for (var i = 0; i < choicesCount; i++) {
    var choice = choices.children[i];
    choice.removeAttribute('data-active');

    var choiceView = document.getElementById(choice.id + '-view');
    choiceView.setAttribute('hidden', 'true');
  }

  target.setAttribute('data-active', 'true');
  view.removeAttribute('hidden');
}

var KeyHandler = {
  get phoneNumber() {
    delete this.phoneNumber;
    return this.phoneNumber = document.getElementById('phoneNumber');
  },

  get fakePhoneNumberView() {
    delete this.fakePhoneNumberView;
    return this.fakePhoneNumberView =
      document.getElementById('fakePhoneNumber-view');
  },

  get phoneNumberView() {
    delete this.phoneNumberView;
    return this.phoneNumberView = document.getElementById('phoneNumber-view');
  },

  init: function kh_init() {
    this.phoneNumber.value = '';
    for (var tone in gTones)
        gTones[tone] = document.getElementById('tone' + tone);

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

      var windowWidth = document.body.clientWidth;
      var rect = div.getBoundingClientRect();
      if (rect.width > windowWidth) {
        fontSize = Math.max(fontSize - kFontStep, kMinFontSize);
      } else if (fontSize < kDefaultFontSize) {
        div.style.fontSize = (fontSize + kFontStep) + 'px';
        rect = div.getBoundingClientRect();
        if (rect.width <= windowWidth)
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
      gTones[key].play();
    }

    this._timeout = window.setTimeout(callback, 400, this);
  },

  keyUp: function kh_keyUp(event) {
    clearTimeout(this._timeout);
  }
};

var CallHandler = {
  // callbacks
  call: function ch_call(number) {
    this.numberView.innerHTML = number;
    this.statusView.innerHTML = 'Calling...';
    this.actionsView.classList.remove('displayed');
    this.callButton.dataset.action = 'end';
    this.toggleCallScreen();

    var call = window.navigator.mozTelephony.dial(number);
    call.addEventListener('readystatechange', this);
    this.currentCall = call;
  },
  incoming: function ch_incoming(call) {
    this.currentCall = call;

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
    this.connected();
  },
  end: function ch_end() {
    this.toggleCallScreen();
    this.currentCall.disconnect();
    this.currentCall.removeEventListener('readystatechange', this);

    this.actionsView.classList.remove('displayed');
    if (this.muteButton.classList.contains('mute'))
      this.toggleMute();

    this.closeModal();
    clearInterval(this._ticker);
  },

  handleEvent: function fm_handleEvent(evt) {
    this.connected();
  },

  // properties / methods
  get numberView() {
    delete this.numberView;
    return this.numberView = document.getElementById('callNumber-view');
  },
  get statusView() {
    delete this.statusView;
    return this.statusView = document.getElementById('callStatus-view');
  },
  get actionsView() {
    delete this.actionsView;
    return this.actionsView = document.getElementById('callActions-container');
  },
  get muteButton() {
    delete this.muteButton;
    return this.muteButton = document.getElementById('mute-button');
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
    document.getElementById('choices').classList.toggle('oncall');
    document.getElementById('views').classList.toggle('oncall');
    document.getElementById('call-screen').classList.toggle('oncall');
  },
  toggleMute: function ch_toggleMute() {
    this.muteButton.classList.toggle('mute');
    // TODO: make the actual mute call on the telephony API
  },
  keypad: function ch_keypad() {
    choiceChanged(document.getElementById('keyboard'));
    document.getElementById('views').classList.add('modal');
  },
  contacts: function ch_contacts() {
    choiceChanged(document.getElementById('contacts'));
    document.getElementById('views').classList.add('modal');
  },
  closeModal: function ch_closeModal() {
    // 2 steps closing to avoid showing the view in its non-modal state
    // during the transition
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
});

