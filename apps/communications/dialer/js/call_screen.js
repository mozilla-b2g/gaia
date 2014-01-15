'use strict';

var CallScreen = {
  _ticker: null,
  _screenWakeLock: null,
  _typedNumber: '',
  callEndPromptTime: 2000,

  body: document.body,
  screen: document.getElementById('call-screen'),
  views: document.getElementById('views'),

  calls: document.getElementById('calls'),
  groupCalls: document.getElementById('group-call-details'),
  groupCallsList: document.getElementById('group-call-details-list'),

  mainContainer: document.getElementById('main-container'),
  contactBackground: document.getElementById('contact-background'),
  callToolbar: document.getElementById('co-advanced'),

  muteButton: document.getElementById('mute'),
  speakerButton: document.getElementById('speaker'),
  bluetoothButton: document.getElementById('bt'),
  keypadButton: document.getElementById('keypad-visibility'),
  placeNewCallButton: document.getElementById('place-new-call'),

  bluetoothMenu: document.getElementById('bluetooth-menu'),
  switchToDeviceButton: document.getElementById('btmenu-btdevice'),
  switchToReceiverButton: document.getElementById('btmenu-receiver'),
  switchToSpeakerButton: document.getElementById('btmenu-speaker'),
  bluetoothMenuCancel: document.getElementById('btmenu-cancel'),

  answerButton: document.getElementById('callbar-answer'),
  rejectButton: document.getElementById('callbar-hang-up'),
  holdButton: document.getElementById('callbar-hold'),

  showGroupButton: document.getElementById('group-show'),
  hideGroupButton: document.getElementById('group-hide'),

  incomingContainer: document.getElementById('incoming-container'),
  incomingNumber: document.getElementById('incoming-number'),
  incomingNumberAdditionalInfo:
    document.getElementById('incoming-number-additional-info'),
  incomingAnswer: document.getElementById('incoming-answer'),
  incomingEnd: document.getElementById('incoming-end'),
  incomingIgnore: document.getElementById('incoming-ignore'),
  lockedClockNumbers: document.getElementById('lockscreen-clock-numbers'),
  lockedClockMeridiem: document.getElementById('lockscreen-clock-meridiem'),
  lockedDate: document.getElementById('lockscreen-date'),

  statusMessage: document.getElementById('statusMsg'),
  showStatusMessage: function cs_showStatusMesssage(text) {
    var STATUS_TIME = 2000;
    var self = this;
    self.statusMessage.querySelector('p').textContent = text;
    self.statusMessage.classList.add('visible');
    self.statusMessage.addEventListener('transitionend', function tend(evt) {
      evt.stopPropagation();
      self.statusMessage.removeEventListener('transitionend', tend);
      setTimeout(function hide() {
        self.statusMessage.classList.remove('visible');
      }, STATUS_TIME);
    });
  },

  updateSingleLine: function cs_updateSingleLine() {
    var enabled =
      (this.calls.querySelectorAll('section:not([hidden])').length <= 1);
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
    this.bluetoothButton.addEventListener('click',
                                    this.toggleBluetoothMenu.bind(this));
    this.answerButton.addEventListener('click',
                                    CallsHandler.answer);
    this.rejectButton.addEventListener('click',
                                    CallsHandler.end);
    this.holdButton.addEventListener('mouseup', CallsHandler.toggleCalls);

    this.showGroupButton.addEventListener('click',
                                    this.showGroupDetails.bind(this));

    this.hideGroupButton.addEventListener('click',
                                    this.hideGroupDetails.bind(this));

    this.switchToDeviceButton.addEventListener('click',
                                    this.switchToDefaultOut.bind(this));
    this.switchToReceiverButton.addEventListener('click',
                                    this.switchToReceiver.bind(this));
    this.switchToSpeakerButton.addEventListener('click',
                                    this.switchToSpeaker.bind(this));
    this.bluetoothMenuCancel.addEventListener('click',
                                    this.toggleBluetoothMenu.bind(this));

    this.incomingAnswer.addEventListener('click',
                              CallsHandler.holdAndAnswer);
    this.incomingEnd.addEventListener('click',
                              CallsHandler.endAndAnswer);
    this.incomingIgnore.addEventListener('click',
                                    CallsHandler.ignore);

    this.calls.addEventListener('click', CallsHandler.toggleCalls.bind(this));

    if (window.location.hash === '#locked') {
      this.showClock(new Date());
      this.initLockScreenSlide();

      if (!this.screen.dataset.layout) {
        this.render('incoming-locked');
      }
    }

    this.setWallpaper();

    // Handle resize events
    window.addEventListener('resize', this.resizeHandler.bind(this));

    this.syncSpeakerEnabled();
  },

  initLockScreenSlide: function cs_initLockScreenSlide() {
    // Setup incoming call screen slider
    this.hangUpIcon = document.getElementById('lockscreen-area-hangup');
    this.pickUpIcon = document.getElementById('lockscreen-area-pickup');

    new LockScreenSlide(
      // IntentionRouter
      {
        unlockerInitialize: function _unlockerInitialize() {
          //Seems not necessary for incoming call screen.
        },

        activateRight: function _activateRight() {
          CallsHandler.answer();
        },

        activateLeft: function _activateLeft() {
          CallsHandler.end();
        },

        unlockingStart: function _unlockingStart() {
          // Bug 956074: Needed to make sure the slider will work.
        },

        unlockingStop: function _unlockingStop() {
          // Bug 956074: Needed to make sure the slider will work.
        },

        nearLeft: function _nearLeft(state, statePrev) {
          if (state === 'accelerating') {
            CallScreen.hangUpIcon.classList.add('triggered');
          } else {
            CallScreen.hangUpIcon.classList.remove('triggered');
          }
        },

        nearRight: function _nearRight(state, statePrev) {
          if (state === 'accelerating') {
            CallScreen.pickUpIcon.classList.add('triggered');
          } else {
            CallScreen.pickUpIcon.classList.remove('triggered');
          }
        }
      },
      // Options
      {
        IDs: {
          overlay: 'main-container',
          areas: {
            left: 'lockscreen-area-hangup',
            right: 'lockscreen-area-pickup'
          }
        },

        colors: {
          left: {
            touchedColor: '255, 0, 0',
            touchedColorStop: '255, 178, 178'
          },

          right: {
            touchedColor: '132, 200, 44',
            touchedColorStop: '218, 238, 191'
          }
        },

        resources: {
          larrow: '/dialer/style/images/larrow.png',
          rarrow: '/dialer/style/images/rarrow.png'
        },
        handle: {
          autoExpand: {
            sentinelOffset: 80
          }
        }
      }
    );
  },

  _wallpaperReady: false,
  _toggleWaiting: false,
  _toggleCallback: null,

  setWallpaper: function cs_setWallpaper() {
    if (!navigator.mozSettings) {
      this._onWallpaperReady();
      return;
    }

    var self = this;
    var req = navigator.mozSettings.createLock().get('wallpaper.image');
    req.onsuccess = function cs_wi_onsuccess() {
      var wallpaperImage = req.result['wallpaper.image'];
      var isString = (typeof wallpaperImage == 'string');
      var image =
        isString ? wallpaperImage : URL.createObjectURL(wallpaperImage);
      self.mainContainer.style.backgroundImage = 'url(' + image + ')';
      setTimeout(self._onWallpaperReady.bind(self));
    };

    req.onerror = this._onWallpaperReady.bind(this);
  },

  _onWallpaperReady: function cs_onWallpaperReady() {
    this._wallpaperReady = true;
    if (this._toggleWaiting) {
      this.toggle(this._toggleCallback);
      this._toggleCallback = null;
      this._toggleWaiting = false;
    }
  },

  _transitionDone: false,
  _contactBackgroundWaiting: false,
  _contactImage: null,

  toggle: function cs_toggle(callback) {
    // Waiting for the wallpaper to be set before toggling the screen in
    if (!this._wallpaperReady) {
      this._toggleWaiting = true;
      this._toggleCallback = callback;
      return;
    }

    var screen = this.screen;
    screen.classList.toggle('displayed');

    var self = this;

    // We have no opening transition for incoming locked
    if (this.screen.dataset.layout === 'incoming-locked') {
      if (callback && typeof(callback) == 'function') {
        setTimeout(callback);
      }
      self._onTransitionDone();
      return;
    }

    /* We need CSS transitions for the status bar state and the regular state */
    screen.addEventListener('transitionend', function trWait(evt) {
      if (evt.target != screen) {
        return;
      }
      screen.removeEventListener('transitionend', trWait);
      if (callback && typeof(callback) == 'function') {
        callback();
      }
      self._onTransitionDone();
    });
  },

  _onTransitionDone: function cs_onTransitionDone() {
    this._transitionDone = true;
    if (this._contactBackgroundWaiting) {
      this.setCallerContactImage(this._contactImage);
      this._contactBackgroundWaiting = false;
    }
  },

  setCallerContactImage: function cs_setContactImage(blob, force) {
    // Waiting for the call screen transition to end before updating
    // the contact image
    if (!this._transitionDone) {
      this._contactImage = blob;
      this._contactBackgroundWaiting = true;
      return;
    }

    if (this._contactImage == blob && !this._contactBackgroundWaiting) {
      return;
    }

    this._contactImage = blob;

    this.contactBackground.classList.remove('ready');
    var background = blob ? 'url(' + URL.createObjectURL(blob) + ')' : '';
    this.contactBackground.style.backgroundImage = background;
    this.contactBackground.classList.add('ready');
  },

  setEmergencyWallpaper: function cs_setEmergencyWallpaper() {
    this.mainContainer.classList.add('emergency-active');
  },

  insertCall: function cs_insertCall(node) {
    this.calls.appendChild(node);
    this.updateSingleLine();
  },

  removeCall: function cs_removeCall(node) {
    // The node can be either inside groupCallsList or calls.
    node.parentNode.removeChild(node);
    this.updateSingleLine();
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

  toggleBluetoothMenu: function cs_toggleBluetoothMenu(value) {
    if (typeof value != 'boolean') {
      this.bluetoothMenu.classList.toggle('display');
    } else {
      this.bluetoothMenu.classList.toggle('display', value);
    }
  },

  switchToSpeaker: function cs_switchToReceiver() {
    this.speakerButton.classList.add('active-state');
    this.bluetoothButton.classList.add('active-state');
    CallsHandler.switchToSpeaker();
    this.toggleBluetoothMenu(false);
  },

  switchToReceiver: function cs_switchToReceiver() {
    this.speakerButton.classList.remove('active-state');
    this.bluetoothButton.classList.remove('active-state');
    CallsHandler.switchToReceiver();
    this.toggleBluetoothMenu(false);
  },

  // when BT device available: switch to BT
  // when BT device unavailable: switch to receiver
  switchToDefaultOut: function cs_switchToDefaultOut() {
    this.speakerButton.classList.remove('active-state');
    this.bluetoothButton.classList.add('active-state');
    CallsHandler.switchToDefaultOut();
    this.toggleBluetoothMenu(false);
  },

  setBTReceiverIcon: function cs_setBTReceiverIcon(enabled) {
    if (enabled) {
      this.speakerButton.classList.add('hide');
      this.bluetoothButton.classList.remove('hide');
    } else {
      this.speakerButton.classList.remove('hide');
      this.bluetoothButton.classList.add('hide');
    }
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
      this.disableKeypad();
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
    var hc = CallsHandler.activeCall;
    if (hc) {
      this.setCallerContactImage(hc.photo);
    } else {
      this.setCallerContactImage(null);
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
  },

  createTicker: function(durationNode) {
    var durationChildNode = durationNode.querySelector('span');

    if (durationNode.dataset.tickerId)
      return false;

    durationChildNode.textContent = '00:00';
    durationNode.classList.add('isTimer');

    function padNumber(n) {
      return n > 9 ? n : '0' + n;
    }

    LazyL10n.get(function localized(_) {
      var ticker = setInterval(function ut_updateTimer(startTime) {
        // Bug 834334: Ensure that 28.999 -> 29.000
        var delta = Math.round((Date.now() - startTime) / 1000) * 1000;
        var elapsed = new Date(delta);
        var duration = {
          h: padNumber(elapsed.getUTCHours()),
          m: padNumber(elapsed.getUTCMinutes()),
          s: padNumber(elapsed.getUTCSeconds())
        };
        durationChildNode.textContent = _(elapsed.getUTCHours() > 0 ?
          'callDurationHours' : 'callDurationMinutes', duration);
      }, 1000, Date.now());
      durationNode.dataset.tickerId = ticker;
    });
    return true;
  },

  stopTicker: function(durationNode) {
    durationNode.classList.remove('isTimer');
    clearInterval(durationNode.dataset.tickerId);
    delete durationNode.dataset.tickerId;
  },

  setEndConferenceCall: function cs_setEndConferenceCall() {
    var callElems = this.groupCallsList.getElementsByTagName('SECTION');
    for (var i = 0; i < callElems.length; i++) {
      callElems[i].dataset.groupHangup = 'groupHangup';
    }
  }
};
