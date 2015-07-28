/* globals CallsHandler, FontSizeManager, KeypadManager,
           LazyL10n, LockScreenSlide, MozActivity, SettingsListener, Utils */
/* jshint nonew: false */

'use strict';

var CallScreen = {
  _ticker: null,
  _screenWakeLock: null,
  _typedNumber: '',
  callEndPromptTime: 2000,

  body: document.body,
  screen: document.getElementById('call-screen'),
  lockscreenConnStates: document.getElementById('lockscreen-conn-states'),
  views: document.getElementById('views'),

  calls: document.getElementById('calls'),

  mainContainer: document.getElementById('main-container'),
  contactBackground: document.getElementById('contact-background'),
  callToolbar: document.getElementById('co-advanced'),

  muteButton: document.getElementById('mute'),
  speakerButton: document.getElementById('speaker'),
  bluetoothButton: document.getElementById('bt'),
  keypadButton: document.getElementById('keypad-visibility'),
  placeNewCallButton: document.getElementById('place-new-call'),
  holdButton: document.getElementById('on-hold'),
  mergeButton: document.getElementById('merge'),
  holdAndMergeContainer: document.getElementById('hold-and-merge-container'),

  hideBarMuteButton: document.getElementById('keypad-hidebar-mute-action'),

  bluetoothMenu: document.getElementById('bluetooth-menu'),
  switchToDeviceButton: document.getElementById('btmenu-btdevice'),
  switchToReceiverButton: document.getElementById('btmenu-receiver'),
  switchToSpeakerButton: document.getElementById('btmenu-speaker'),
  bluetoothMenuCancel: document.getElementById('btmenu-cancel'),

  answerButton: document.getElementById('callbar-answer'),
  rejectButton: document.getElementById('callbar-hang-up'),

  incomingContainer: document.getElementById('incoming-container'),
  incomingInfo: document.getElementById('incoming-info'),
  incomingNumber: document.getElementById('incoming-number'),
  incomingSim: document.getElementById('incoming-sim'),
  incomingNumberAdditionalTel:
    document.getElementById('incoming-number-additional-info-tel'),
  incomingNumberAdditionalTelType:
    document.getElementById('incoming-number-additional-info-tel-type'),
  incomingAnswer: document.getElementById('incoming-answer'),
  incomingEnd: document.getElementById('incoming-end'),
  incomingIgnore: document.getElementById('incoming-ignore'),
  lockedClockTime: document.getElementById('lockscreen-clock-time'),
  lockedDate: document.getElementById('lockscreen-date'),

  statusMessage: document.getElementById('statusMsg'),
  configs: {
    lockMode: 'incoming-call'
  },
  showStatusMessage: function cs_showStatusMessage(message) {
    var STATUS_TIME = 2000;
    var paragraph = this.statusMessage.querySelector('p');
    var self = this;

    if (typeof(message) === 'string') {
      navigator.mozL10n.setAttributes(paragraph, message);
    } else if (message.id) {
      navigator.mozL10n.setAttributes(paragraph, message.id, message.args);
    }

    this.statusMessage.classList.add('visible');
    this.statusMessage.addEventListener('transitionend', function tend(evt) {
      evt.stopPropagation();
      self.statusMessage.removeEventListener('transitionend', tend);
      setTimeout(function hide() {
        self.statusMessage.classList.remove('visible');
      }, STATUS_TIME);
    });
  },

  updateCallsDisplay: function cs_updateCallsDisplay() {
    var visibleCalls =
      this.calls.querySelectorAll('section:not([hidden])').length;
    this.body.classList.toggle('single-line', visibleCalls <= 1);
    this.calls.classList.toggle('big-duration', visibleCalls <= 1);
    CallsHandler.updateAllPhoneNumberDisplays();
  },

  hidePlaceNewCallButton: function cs_hidePlaceNewCallButton() {
    this.callToolbar.classList.add('no-add-call');
  },

  showPlaceNewCallButton: function cs_showPlaceNewCallButton() {
    this.callToolbar.classList.remove('no-add-call');
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
    this.hideBarMuteButton.addEventListener('click',
                                            this.toggleMute.bind(this));
    this.keypadButton.addEventListener('click', this.showKeypad.bind(this));
    this.placeNewCallButton.addEventListener('click',
                                             this.placeNewCall.bind(this));
    this.speakerButton.addEventListener('click',
                                        this.toggleSpeaker.bind(this));
    this.bluetoothButton.addEventListener('click',
                                          this.toggleBluetoothMenu.bind(this));
    this.holdButton.addEventListener('click',
                               CallsHandler.holdOrResumeSingleCall.bind(this));
    this.mergeButton.addEventListener('click',
                                      CallsHandler.mergeCalls.bind(this));
    this.answerButton.addEventListener('click',
                                       CallsHandler.answer);
    this.rejectButton.addEventListener('click',
                                       CallsHandler.end);

    this.switchToDeviceButton.addEventListener(
      'click', this.switchToDefaultOut.bind(this, false));
    this.switchToReceiverButton.addEventListener(
      'click', this.switchToReceiver.bind(this));
    this.switchToSpeakerButton.addEventListener(
      'click', this.switchToSpeaker.bind(this));
    this.bluetoothMenuCancel.addEventListener(
      'click', this.toggleBluetoothMenu.bind(this));

    this.incomingAnswer.addEventListener('click',
                                         CallsHandler.holdAndAnswer);
    this.incomingEnd.addEventListener('click',
                                      CallsHandler.endAndAnswer);
    this.incomingIgnore.addEventListener('click',
                                         CallsHandler.ignore);

    this.calls.addEventListener('click', CallsHandler.toggleCalls.bind(this));

    window.addEventListener('resize', this.resizeHandler.bind(this));
    window.addEventListener('hashchange', this.hashchangeHandler.bind(this));
    this.hashchangeHandler();

    SettingsListener.observe('wallpaper.image', null,
                             this._wallpaperImageHandler.bind(this));

    this.syncSpeakerEnabled();
  },

  _connInfoManagerInitialized: false,
  initLockScreenConnInfoManager: function cs_initLockScreenConnInfoManager() {
    if (this._connInfoManagerInitialized) {
      return;
    }

    /* mobile connection state on lock screen */
    if (window.navigator.mozMobileConnections) {
      LazyL10n.get(function localized(_) {
          new window.LockScreenConnInfoManager(CallScreen.lockscreenConnStates);
        CallScreen._connInfoManagerInitialized = true;
      });
    }
  },

  _slideInitialized: false,
  initLockScreenSlide: function cs_initLockScreenSlide() {
    if (this._slideInitialized) {
      return;
    }
    this._slideInitialized = true;

    // Setup incoming call screen slider
    this.hangUpIcon = document.getElementById('lockscreen-area-hangup');
    this.pickUpIcon = document.getElementById('lockscreen-area-pickup');
    this.initUnlockerEvents();
    new LockScreenSlide({
      useNewStyle: true,

      IDs: {
        overlay: 'main-container',
        areas: {
          left: 'lockscreen-area-hangup',
          right: 'lockscreen-area-pickup'
        },
      },

      trackNew: {
        strokeColorTop: 'rgba(0, 0, 0, 0)',
        strokeColorBottom: 'rgba(0, 0, 0, 0)',
        fillColorTop: 'rgba(0, 0, 0, 0.1)',
        fillColorBottom: 'rgba(0, 0, 0, 0.1)'
      },

      colors: {
        left: {
          touchedColor: '224, 0, 0',
          touchedColorStop: '255, 255, 255'
        },
        right: {
          touchedColor: '0, 173, 173',
          touchedColorStop: '255, 255, 255'
        }
      },

      iconBG: {
        left: {
          color: 'rgba(224, 0, 0, 0.80)'
        },
        right: {
          color: 'rgba(0, 173, 173, 0.80)'
        }
      },

      resourcesNew: {
        larrow: '/style/images/lock_screen/lockscreen_toggle_arrow_left.png',
        rarrow: '/style/images/lock_screen/lockscreen_toggle_arrow_right.png'
      }
    });
  },

  _wallpaperImageHandler: function cs_wallpaperImageHandler(image) {
    this.mainContainer.style.backgroundImage = 'url(' +
      (typeof image === 'string' ? image : URL.createObjectURL(image)) + ')';
  },

  setCallerContactImage: function cs_setCallerContactImage() {
    var activeCallForContactImage = CallsHandler.activeCallForContactImage;
    var blob = activeCallForContactImage && activeCallForContactImage.photo;

    var background = blob ? 'url(' + URL.createObjectURL(blob) + ')' : '';
    this.contactBackground.style.backgroundImage = background;
  },

  insertCall: function cs_insertCall(node) {
    this.calls.appendChild(node);
    this.updateCallsDisplay();
  },

  removeCall: function cs_removeCall(node) {
    if (node.parentNode) {
      node.parentNode.removeChild(node);
      this.updateCallsDisplay();
    }
  },

  resizeHandler: function cs_resizeHandler() {
    // If a user has the keypad opened, we want to display the number called
    // while in status bar mode. And restore the digits typed when exiting.
    if (!this.body.classList.contains('showKeypad')) {
      this.updateCallsDisplay(this.inStatusBarMode);
    } else if (this.inStatusBarMode) {
      this._typedNumber = KeypadManager._phoneNumber;
      KeypadManager.restorePhoneNumber();
    } else {
      KeypadManager.updatePhoneNumber(this._typedNumber, 'begin', true);
    }
  },

  hashchangeHandler: function cs_hashchangeHandler() {
    if (window.location.hash.startsWith('#locked')) {
      this.initLockScreenConnInfoManager();
      this.showClock(new Date());
      this.initLockScreenSlide();

      if (!this.screen.dataset.layout) {
        this.render('incoming-locked');
      }
    }
  },

  toggleMute: function cs_toggleMute() {
    this.muteButton.classList.toggle('active-state');
    this.hideBarMuteButton.classList.toggle('active-state');
    this.calls.classList.toggle('muted');
    CallsHandler.toggleMute();
  },

  unmute: function cs_unmute() {
    this.muteButton.classList.remove('active-state');
    this.hideBarMuteButton.classList.remove('active-state');
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

  setShowIsHeld: function cs_setShowIsHeld(enabled) {
    this.holdButton.classList.toggle('active-state', enabled);
  },

  // when BT device available: switch to BT
  // when BT device unavailable: switch to receiver
  switchToDefaultOut: function cs_switchToDefaultOut(doNotConnect) {
    this.speakerButton.classList.remove('active-state');
    this.bluetoothButton.classList.add('active-state');
    CallsHandler.switchToDefaultOut(doNotConnect);
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
    new MozActivity({
      name: 'dial',
      data: {
        type: 'webtelephony/number',
        number: ''
      }
    });
  },

  render: function cs_render(layout_type) {
    this.screen.dataset.layout = layout_type;
  },

  showClock: function cs_showClock(now) {
    // this is a non-standard, Gecko only API, but we have
    // no other way to get the am/pm portion of the date and remove it.
    var amPm = now.toLocaleFormat('%p');

    var timeText = now.toLocaleString(navigator.languages, {
      hour12: navigator.mozHour12,
      hour: 'numeric',
      minute: 'numeric'
    }).replace(amPm, '').trim();

    var dateText = now.toLocaleString(navigator.languages, {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });

    this.lockedClockTime.textContent = timeText;
    this.lockedDate.textContent = dateText;
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

    this.setCallerContactImage();
  },

  syncSpeakerEnabled: function cs_syncSpeakerEnabled() {
    if (navigator.mozTelephony.speakerEnabled) {
      this.speakerButton.classList.add('active-state');
    } else {
      this.speakerButton.classList.remove('active-state');
    }
  },

  enableMuteButton: function cs_enableMuteButton() {
    this.muteButton.removeAttribute('disabled');
  },

  disableMuteButton: function cs_disableMuteButton() {
    this.muteButton.setAttribute('disabled', 'disabled');
  },

  enablePlaceNewCallButton: function cs_enablePlaceNewCallButton() {
    this.placeNewCallButton.removeAttribute('disabled');
  },

  disablePlaceNewCallButton: function cs_disablePlaceNewCallButton() {
    this.placeNewCallButton.setAttribute('disabled', 'disabled');
  },

  enableSpeakerButton: function cs_enableSpeakerButton() {
    this.speakerButton.removeAttribute('disabled');
  },

  disableSpeakerButton: function cs_disableSpeakerButton() {
    this.speakerButton.setAttribute('disabled', 'disabled');
  },

  showOnHoldButton: function cs_showOnHoldButton() {
    this.holdButton.classList.remove('hide');
  },

  hideOnHoldButton: function cs_hideOnHoldButton() {
    this.holdButton.classList.add('hide');
  },

  enableOnHoldButton: function cs_enableOnHoldButton() {
    this.holdButton.removeAttribute('disabled');
  },

  disableOnHoldButton: function cs_disableOnHoldButton() {
    this.holdButton.setAttribute('disabled', 'disabled');
  },

  showMergeButton: function cs_showMergeButton() {
    this.mergeButton.classList.remove('hide');
  },

  hideMergeButton: function cs_hideMergeButton() {
    this.mergeButton.classList.add('hide');
  },

  showOnHoldAndMergeContainer: function cs_showOnHoldAndMergeContainer() {
    this.holdAndMergeContainer.style.display = 'block';
  },

  hideOnHoldAndMergeContainer: function cs_hideOnHoldAndMergeContainer() {
    this.holdAndMergeContainer.style.display = 'none';
  },

  createTicker: function(durationNode) {
    var durationChildNode = durationNode.querySelector('span');

    if (durationNode.dataset.tickerId) {
      return false;
    }

    durationChildNode.textContent = '00:00';
    durationNode.classList.add('isTimer');

    LazyL10n.get(function localized(_) {
      var ticker = setInterval(function ut_updateTimer(startTime) {
        // Bug 834334: Ensure that 28.999 -> 29.000
        var delta = Math.round((Date.now() - startTime) / 1000) * 1000;
        Utils.prettyDuration(durationChildNode, delta);
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

  handleEvent: function cs_handleEvent(evt) {
    var state = null, statePrev = null;
    switch (evt.type) {
      case 'lockscreenslide-unlocker-initializer':
        break;
      case 'lockscreenslide-near-left':
        state = evt.detail.state;
        statePrev = evt.detail.statePrev;
        if (state === 'accelerating') {
          CallScreen.hangUpIcon.classList.add('triggered');
        } else {
          CallScreen.hangUpIcon.classList.remove('triggered');
        }
        break;
      case 'lockscreenslide-near-right':
        state = evt.detail.state;
        statePrev = evt.detail.statePrev;
        if (state === 'accelerating') {
          CallScreen.pickUpIcon.classList.add('triggered');
        } else {
          CallScreen.pickUpIcon.classList.remove('triggered');
        }
        break;
      case 'lockscreenslide-unlocking-start':
        break;
      case 'lockscreenslide-unlocking-stop':
        break;
      case 'lockscreenslide-activate-left':
        CallsHandler.end();
        break;
      case 'lockscreenslide-activate-right':
        CallsHandler.answer();
        break;
      case 'lockscreen-mode-on':
        this.modeSwitch(evt.detail, true);
        break;
      case 'lockscreen-mode-off':
        this.modeSwitch(evt.detail, false);
        break;
    }
  },

  /**
   * @param {boolean} switcher - true if mode is on, false if off.
   */
  modeSwitch: function cs_modeSwitch(mode, switcher) {
    if (switcher) {
      if (mode !== this.configs.lockMode) {
        this.suspendUnlockerEvents();
      }
    } else {
      if (mode !== this.configs.lockMode) {
        this.initUnlockerEvents();
      }
    }
  },

  cdmaConferenceCall: function cs_cdmaConferenceCall() {
    this.hidePlaceNewCallButton();
    this.calls.classList.add('cdma-conference-call');
  },

  initUnlockerEvents: function cs_initUnlockerEvents() {
    window.addEventListener('lockscreenslide-unlocker-initializer', this);
    window.addEventListener('lockscreenslide-near-left', this);
    window.addEventListener('lockscreenslide-near-right', this);
    window.addEventListener('lockscreenslide-unlocking-start', this);
    window.addEventListener('lockscreenslide-activate-left', this);
    window.addEventListener('lockscreenslide-activate-right', this);
    window.addEventListener('lockscreenslide-unlocking-stop', this);
  },

  suspendUnlockerEvents: function cs_initUnlockerEvents() {
    window.removeEventListener('lockscreenslide-unlocker-initializer', this);
    window.removeEventListener('lockscreenslide-near-left', this);
    window.removeEventListener('lockscreenslide-near-right', this);
    window.removeEventListener('lockscreenslide-unlocking-start', this);
    window.removeEventListener('lockscreenslide-activate-left', this);
    window.removeEventListener('lockscreenslide-activate-right', this);
    window.removeEventListener('lockscreenslide-unlocking-stop', this);
  },

  getScenario: function cs_getScenario() {
    var scenario;
    if (this.inStatusBarMode) {
      scenario = FontSizeManager.STATUS_BAR;
    } else if (this.body.classList.contains('single-line')) {
      scenario = FontSizeManager.SINGLE_CALL;
    } else {
      scenario = FontSizeManager.CALL_WAITING;
    }
    return scenario;
  }
};
