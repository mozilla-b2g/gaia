'use strict';

var CallScreen = {
  _ticker: null,
  _screenWakeLock: null,
  _typedNumber: '',

  body: document.body,
  screen: document.getElementById('call-screen'),
  views: document.getElementById('views'),

  calls: document.getElementById('calls'),
  groupCalls: document.getElementById('group-call-details'),
  groupCallsList: document.getElementById('group-call-details-list'),

  mainContainer: document.getElementById('main-container'),
  callToolbar: document.getElementById('co-advanced'),

  muteButton: document.getElementById('mute'),
  speakerButton: document.getElementById('speaker'),
  keypadButton: document.getElementById('keypad-visibility'),
  placeNewCallButton: document.getElementById('place-new-call'),

  answerButton: document.getElementById('callbar-answer'),
  rejectButton: document.getElementById('callbar-hang-up'),
  holdButton: document.getElementById('callbar-hold'),

  showGroupButton: document.getElementById('group-show'),
  hideGroupButton: document.getElementById('group-hide'),

  incomingContainer: document.getElementById('incoming-container'),
  incomingNumber: document.getElementById('incoming-number'),
  incomingAnswer: document.getElementById('incoming-answer'),
  incomingEnd: document.getElementById('incoming-end'),
  incomingIgnore: document.getElementById('incoming-ignore'),
  lockedContactPhoto: document.getElementById('locked-contact-photo'),
  lockedClockNumbers: document.getElementById('lockscreen-clock-numbers'),
  lockedClockMeridiem: document.getElementById('lockscreen-clock-meridiem'),
  lockedDate: document.getElementById('lockscreen-date'),

  statusMessage: document.getElementById('statusMsg'),
  showStatusMessage: function cs_showStatusMesssage(text) {
    var STATUS_TIME = 2000;
    var self = this;
    self.statusMessage.querySelector('p').textContent = text;
    self.statusMessage.classList.add('visible');
    self.statusMessage.addEventListener('transitionend', function tend() {
      self.statusMessage.removeEventListener('transitionend', tend);
      setTimeout(function hide() {
        self.statusMessage.classList.remove('visible');
      }, STATUS_TIME);
    });
  },

  set singleLine(enabled) {
    this.calls.classList.toggle('single-line', enabled);
    this.calls.classList.toggle('big-duration', enabled);
  },

  /**
   * When enabled hides the end-and-answer button in call waiting mode and
   * displays only the hold-and-answer one.
   *
   * @param {Boolean} enabled Enables hold-and-answer-only operation.
   */
  set holdAndAnswerOnly(enabled) {
    this.incomingContainer.classList.toggle('hold-and-answer-only', enabled);
  },

  /**
   * When enabled displays the CDMA-specific call-waiting UI
   *
   * @param {Boolean} enabled Enables the CDMA call-waiting UI.
   */
  set cdmaCallWaiting(enabled) {
    this.calls.classList.toggle('switch', enabled);
    this.callToolbar.classList.toggle('no-add-call', enabled);
  },

  get inStatusBarMode() {
    return window.innerHeight <= 40;
  },

  init: function cs_init() {
    this.muteButton.addEventListener('click', this.toggleMute.bind(this));
    this.keypadButton.addEventListener('click', this.showKeypad.bind(this));
    this.placeNewCallButton.addEventListener('click',
                                             this.placeNewCall.bind(this));
    this.speakerButton.addEventListener('click',
                                    this.toggleSpeaker.bind(this));
    this.answerButton.addEventListener('click',
                                    CallsHandler.answer);
    this.rejectButton.addEventListener('click',
                                    CallsHandler.end);
    this.holdButton.addEventListener('mouseup', CallsHandler.toggleCalls);

    this.showGroupButton.addEventListener('click',
                                    CallScreen.showGroupDetails.bind(this));

    this.hideGroupButton.addEventListener('click',
                                    CallScreen.hideGroupDetails.bind(this));

    this.incomingAnswer.addEventListener('click',
                              CallsHandler.holdAndAnswer);
    this.incomingEnd.addEventListener('click',
                              CallsHandler.endAndAnswer);
    this.incomingIgnore.addEventListener('click',
                                    CallsHandler.ignore);

    this.calls.addEventListener('click', CallsHandler.toggleCalls.bind(this));

    var callScreenHasLayout = !!this.screen.dataset.layout;
    if ((window.location.hash === '#locked') && !callScreenHasLayout) {
      CallScreen.render('incoming-locked');
    }
    CallScreen.showClock(new Date());

    if (navigator.mozSettings) {
      var req = navigator.mozSettings.createLock().get('wallpaper.image');
      req.onsuccess = function cs_wi_onsuccess() {
        CallScreen.setCallerContactImage(
          req.result['wallpaper.image'], {force: false});
      };
    }

    // Handle resize events
    window.addEventListener('resize', this.resizeHandler.bind(this));

    this.syncSpeakerEnabled();
  },

  toggle: function cs_toggle(callback) {
    var screen = this.screen;
    screen.classList.toggle('displayed');

    if (!callback || typeof(callback) !== 'function') {
      return;
    }

    // We have no opening transition for incoming locked
    if (this.screen.dataset.layout === 'incoming-locked') {
      setTimeout(callback);
      return;
    }

    /* We need CSS transitions for the status bar state and the regular state */
    screen.addEventListener('transitionend', function trWait() {
      screen.removeEventListener('transitionend', trWait);
      callback();
    });
  },

  insertCall: function cs_insertCall(node) {
    this.calls.appendChild(node);
  },

  moveToGroup: function cs_moveToGroup(node) {
    this.groupCallsList.appendChild(node);
  },

  resizeHandler: function cs_resizeHandler() {
    // If a user has the keypad opened, we want to display the number called
    // while in status bar mode. And restore the digits typed when exiting.
    if (!this.body.classList.contains('showKeypad')) {
      return;
    }

    if (this.inStatusBarMode) {
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
    }
  },

  toggleMute: function cs_toggleMute() {
    this.muteButton.classList.toggle('active-state');
    this.calls.classList.toggle('muted');
    CallsHandler.toggleMute();
  },

  unmute: function cs_unmute() {
    this.muteButton.classList.remove('active-state');
    this.calls.classList.remove('muted');
    CallsHandler.unmute();
  },

  toggleSpeaker: function cs_toggleSpeaker() {
    this.speakerButton.classList.toggle('active-state');
    CallsHandler.toggleSpeaker();
  },

  turnSpeakerOn: function cs_turnSpeakerOn() {
    this.speakerButton.classList.add('active-state');
    CallsHandler.turnSpeakerOn();
  },

  turnSpeakerOff: function cs_turnSpeakerOff() {
    this.speakerButton.classList.remove('active-state');
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

  placeNewCall: function cs_placeNewCall() {
    navigator.mozApps.getSelf().onsuccess = function(evt) {
      var app = evt.target.result;
      CallsHandler.requestContactsTab();
      app.launch('dialer');
      window.resizeTo(100, 40);
    };
  },

  render: function cs_render(layout_type) {
    this.screen.dataset.layout = layout_type;
    if (layout_type !== 'connected') {
      this.keypadButton.setAttribute('disabled', 'disabled');
    }
  },

  showClock: function cs_showClock(now) {
    LazyL10n.get(function localized(_) {
      var f = new navigator.mozL10n.DateTimeFormat();
      var timeFormat = _('shortTimeFormat');
      var dateFormat = _('longDateFormat');
      var time = f.localeFormat(now, timeFormat);
      this.lockedClockNumbers.textContent = time.match(/([012]?\d).[0-5]\d/g);
      this.lockedClockMeridiem.textContent =
        (time.match(/AM|PM/i) || []).join('');
      this.lockedDate.textContent = f.localeFormat(now, dateFormat);
    }.bind(this));
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
      this.speakerButton.classList.add('active-state');
    } else {
      this.speakerButton.classList.remove('active-state');
    }
  },

  enableKeypad: function cs_enableKeypad() {
    this.keypadButton.removeAttribute('disabled');
  },

  disableKeypad: function cs_disableKeypad() {
    this.keypadButton.setAttribute('disabled', 'disabled');
  },

  showGroupDetails: function cs_showGroupDetails(evt) {
    if (evt) {
      evt.stopPropagation();
    }
    this.groupCalls.classList.add('display');
  },

  hideGroupDetails: function cs_hideGroupDetails(evt) {
    if (evt) {
      evt.preventDefault();
    }
    this.groupCalls.classList.remove('display');
  }
};
