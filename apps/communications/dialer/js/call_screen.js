'use strict';

var CallScreen = {
  _ticker: null,
  _screenWakeLock: null,
  _typedNumber: '',

  body: document.body,
  screen: document.getElementById('call-screen'),
  views: document.getElementById('views'),

  calls: document.getElementById('calls'),

  mainContainer: document.getElementById('main-container'),
  callToolbar: document.getElementById('co-advanced'),

  muteButton: document.getElementById('mute'),
  speakerButton: document.getElementById('speaker'),
  keypadButton: document.getElementById('keypad-visibility'),

  answerButton: document.getElementById('callbar-answer'),
  rejectButton: document.getElementById('callbar-hang-up'),
  holdButton: document.getElementById('callbar-hold'),

  incomingContainer: document.getElementById('incoming-container'),
  incomingNumber: document.getElementById('incoming-number'),
  incomingAnswer: document.getElementById('incoming-answer'),
  incomingEnd: document.getElementById('incoming-end'),
  incomingIgnore: document.getElementById('incoming-ignore'),
  lockedContactPhoto: document.getElementById('locked-contact-photo'),

  set callsCount(count) {
    this.calls.dataset.count = count;
  },

  init: function cs_init() {
    this.muteButton.addEventListener('click', this.toggleMute.bind(this));
    this.keypadButton.addEventListener('click', this.showKeypad.bind(this));
    this.speakerButton.addEventListener('click',
                                    this.toggleSpeaker.bind(this));
    this.answerButton.addEventListener('click',
                                    CallsHandler.answer);
    this.rejectButton.addEventListener('click',
                                    CallsHandler.end);
    this.holdButton.addEventListener('mouseup', CallsHandler.toggleCalls);

    this.incomingAnswer.addEventListener('click',
                              CallsHandler.holdAndAnswer);
    this.incomingEnd.addEventListener('click',
                              CallsHandler.endAndAnswer);
    this.incomingIgnore.addEventListener('click',
                                    CallsHandler.ignore);

    this.calls.addEventListener('click',
                                CallsHandler.toggleCalls);

    var callScreenHasLayout = !!this.screen.dataset.layout;
    if ((window.location.hash === '#locked') && !callScreenHasLayout) {
      CallScreen.render('incoming-locked');
    }
    if (navigator.mozSettings) {
      var req = navigator.mozSettings.createLock().get('wallpaper.image');
      req.onsuccess = function cs_wi_onsuccess() {
        CallScreen.setCallerContactImage(
          req.result['wallpaper.image'], {force: false, mask: true});
      };
    }

    // Handle resize events
    window.addEventListener('resize', this.resizeHandler.bind(this));

    this.syncSpeakerEnabled();
  },

  insertCall: function cs_insertCall(node) {
    this.calls.appendChild(node);
  },

  resizeHandler: function cs_resizeHandler() {
    // If a user has the keypad opened, we want to display the number called
    // while in status bar mode. And restore the digits typed when exiting.
    if (!this.body.classList.contains('showKeypad')) {
      return;
    }

    if (window.innerHeight <= 40) {
      this._typedNumber = KeypadManager._phoneNumber;
      KeypadManager.restorePhoneNumber();
    } else {
      KeypadManager.updatePhoneNumber(this._typedNumber, 'begin', true);
    }
  },

  setCallerContactImage: function cs_setContactImage(image_url, opt) {
    var isString = (typeof image_url == 'string');
    var isLocked = (this.screen.dataset.layout === 'incoming-locked');
    var target = isLocked ? this.lockedContactPhoto : this.mainContainer;
    var photoURL = isString ? image_url : URL.createObjectURL(image_url);

    if (!target.style.backgroundImage || (opt && opt.force)) {
      target.style.backgroundImage = 'url(' + photoURL + ')';
      if (opt && opt.mask) {
        target.classList.add('masked');
      } else {
        target.classList.remove('masked');
      }
    }
  },

  toggleMute: function cs_toggleMute() {
    this.muteButton.classList.toggle('mute');
    CallsHandler.toggleMute();
  },

  unmute: function cs_unmute() {
    this.muteButton.classList.remove('mute');
    CallsHandler.unmute();
  },

  toggleSpeaker: function cs_toggleSpeaker() {
    this.speakerButton.classList.toggle('speak');
    CallsHandler.toggleSpeaker();
  },

  turnSpeakerOn: function cs_turnSpeakerOn() {
    this.speakerButton.classList.add('speak');
    CallsHandler.turnSpeakerOn();
  },

  turnSpeakerOff: function cs_turnSpeakerOff() {
    this.speakerButton.classList.remove('speak');
    CallsHandler.turnSpeakerOff();
  },

  showKeypad: function cs_showKeypad() {
    KeypadManager.render('oncall');
    this.body.classList.add('showKeypad');
  },

  hideKeypad: function cs_hideKeypad() {
    KeypadManager.restorePhoneNumber();
    KeypadManager.restoreAdditionalContactInfo();
    this.body.classList.remove('showKeypad');
  },

  render: function cs_render(layout_type) {
    this.screen.dataset.layout = layout_type;
    if (layout_type !== 'connected') {
      this.keypadButton.setAttribute('disabled', 'disabled');
    }
  },

  showIncoming: function cs_showIncoming() {
    this.body.classList.remove('showKeypad');

    this.callToolbar.classList.add('transparent');
    this.incomingContainer.classList.add('displayed');

    this._screenWakeLock = navigator.requestWakeLock('screen');
  },

  hideIncoming: function cs_hideIncoming() {
    this.callToolbar.classList.remove('transparent');
    this.incomingContainer.classList.remove('displayed');

    if (this._screenWakeLock) {
      this._screenWakeLock.unlock();
      this._screenWakeLock = null;
    }
  },

  syncSpeakerEnabled: function cs_syncSpeakerEnabled() {
    if (navigator.mozTelephony.speakerEnabled) {
      this.speakerButton.classList.add('speak');
    } else {
      this.speakerButton.classList.remove('speak');
    }
  },

  enableKeypad: function cs_enableKeypad() {
    this.keypadButton.removeAttribute('disabled');
  },

  disableKeypad: function cs_disableKeypad() {
    this.keypadButton.setAttribute('disabled', 'disabled');
  }
};
