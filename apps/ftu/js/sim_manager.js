/* global ConfirmDialog,
          MobileOperator,
          Navigation,
          SimContactsImporter,
          UIManager,
          utils */

'use strict';

var SimManager = (function() {

  /*
   * Icc helper object to track FTE related SIM state
   */
  function Icc(mozIcc) {
    this.mozIcc = mozIcc;
  }
  Icc.prototype = {
    skipped: false,
    unlocked: false,
    alreadyImported: false,
    mozIcc: null,
    isLocked: function() {
      return !this.unlocked && lockStates.indexOf(this.mozIcc.cardState) !== -1;
    }
  };

  /*
   * Update ui element with a retry count message for the given sim
   */
  function showRetryCount(icc, lockType, uiElement) {
    var request = icc.mozIcc.getCardLockRetryCount(lockType);
    request.onsuccess = function() {
      var retryCount = request.result.retryCount;
      if (retryCount) {
        var l10nArgs = {n: retryCount};
        navigator.mozL10n.setAttributes(uiElement,'inputCodeRetriesLeft',
                                          l10nArgs);
        uiElement.classList.remove('hidden');
      }
    };
    request.onerror = function() {
      console.error('Could not fetch CardLockRetryCount', request.error.name);
    };
  }

  // mozIcc.cardState values for a locked SIM
  var lockStates = ['pinRequired', 'pukRequired', 'networkLocked',
                   'corporateLocked', 'serviceProviderLocked', 'network1Locked',
                   'network2Locked', 'hrpdNetworkLocked', 'ruimCorporateLocked',
                   'ruimServiceProviderLocked'];

  return {
  icc0: null,
  icc1: null,
  simSlots: window.navigator.mozMobileConnections ?
    window.navigator.mozMobileConnections.length : 0,

  // track the SIM that is currently being unlocked
  _unlockingIcc: null,

  init: function sm_init() {
    this.mobConn = window.navigator.mozMobileConnections;
    if (!this.mobConn) {
      return;
    }

    this.iccManager = window.navigator.mozIccManager;
    if (!this.iccManager) {
      return;
    }

    // keep track of sim card info in slot 0 and 1
    this.icc0 = null;
    this.icc1 = null;

    if (this.iccManager.iccIds[0]) {
      this.updateIccState(this.iccManager.iccIds[0]);
    }
    if (this.iccManager.iccIds[1]) {
      this.updateIccState(this.iccManager.iccIds[1]);
    }

    this.iccManager.addEventListener('iccdetected',
                                     this.handleIccState.bind(this));

    this.alreadyImported = false;
  },

  handleUnlockError: function sm_handleUnlockError(lockType, retryCount) {
    var l10nArgs = {n: retryCount};
    switch (lockType) {
      case 'pin':
        if (retryCount === 0) {
          this.showPukScreen(this._unlockingIcc);
          break;
        }
        UIManager.pinInput.value = '';
        UIManager.pinInput.classList.add('onerror');
        UIManager.pinError.classList.remove('hidden');
        navigator.mozL10n.setAttributes(UIManager.pinRetriesLeft,
                                          'inputCodeRetriesLeft', l10nArgs);
        UIManager.pinRetriesLeft.classList.remove('hidden');
        if (retryCount === 1) {
          UIManager.pinError.
            querySelector('.lastchance').classList.remove('hidden');
        } else {
          navigator.mozL10n.setAttributes(
            UIManager.pinError.querySelector('.main'),
            'pinAttemptMsg2',
            l10nArgs
          );
          UIManager.pinError.querySelector('.main').classList.remove('hidden');
        }
        break;
      case 'puk':
        UIManager.pukInput.value = '';
        UIManager.pukInput.classList.add('onerror');
        UIManager.pukError.classList.remove('hidden');
        UIManager.pukInfo.classList.add('hidden');
        navigator.mozL10n.setAttributes(UIManager.pukRetriesLeft,
                                          'inputCodeRetriesLeft', l10nArgs);
        UIManager.pukRetriesLeft.classList.remove('hidden');
        if (retryCount === 1) {
          UIManager.pukError.
            querySelector('.lastchance').classList.remove('hidden');
        } else {
          navigator.mozL10n.setAttributes(
            UIManager.pukError.querySelector('.main'),
            'pukAttemptMsg2',
            l10nArgs
          );
          UIManager.pukError.querySelector('.main').classList.remove('hidden');
        }
        // TODO what if counter gets to 0 ??
        break;
      case 'nck':
      case 'cck':
      case 'spck':
        UIManager.xckInput.value = '';
        UIManager.xckInput.classList.add('onerror');
        UIManager.xckError.classList.remove('hidden');
        UIManager.xckInfo.classList.add('hidden');
        navigator.mozL10n.setAttributes(UIManager.xckRetriesLeft,
                                          'inputCodeRetriesLeft', l10nArgs);
        UIManager.xckRetriesLeft.classList.remove('hidden');
        if (retryCount == 1) {
          UIManager.xckError.
            querySelector('.lastchance').classList.remove('hidden');
        } else {
          navigator.mozL10n.setAttributes(
            UIManager.xckError.querySelector('.main'),
            'nckAttemptMsg2',
            l10nArgs
          );
          UIManager.xckError.querySelector('.main').classList.remove('hidden');
        }
        break;
    }
  },

  available: function sm_available() {
    var icc = this.guessIcc();
    return (icc && icc.cardState === 'ready');
  },

  handleIccState: function sm_handleIccState(event) {
    this.updateIccState(event.iccId);
  },

  updateIccState: function(iccId) {
    var iccInfo = this.iccManager.getIccById(iccId);
    if (!iccInfo) {
      throw new Error('Unrecognized iccID: ' + iccId);
    }

    // determine SIM slot number
    if (this.mobConn[0] && iccId === this.mobConn[0].iccId) {
      this.icc0 = new Icc(iccInfo);
    } else if (this.mobConn[1] && iccId === this.mobConn[1].iccId) {
      this.icc1 = new Icc(iccInfo);
    } else {
      console.warn('ICC detected in unsupported slot', iccId);
    }
  },

 /*
  * Possible values:
  *   null,
  *   'unknown',
  *   'pinRequired',
  *   'pukRequired',
  *   'networkLocked',
  *   'corporateLocked',
  *   'serviceProviderLocked',
  *   'network1Locked',
  *   'network2Locked',
  *   'hrpdNetworkLocked',
  *   'ruimCorporateLocked',
  *   'ruimServiceProviderLocked'
  *   'ready'.
  */
  handleCardState: function sm_handleCardState(callback, skipUnlockScreen) {
    // used to track which SIM's PIN unlock
    // screen we are currently displaying
    this._unlockingIcc = null;

    SimManager.checkSIMButton();
    if (typeof callback === 'function') {
      this.finishCallback = callback;
    }

    if (this.shouldShowUnlockScreen(this.icc0) && !skipUnlockScreen) {
      this.showUnlockScreen(this.icc0);
    } else if (this.shouldShowUnlockScreen(this.icc1) && !skipUnlockScreen) {
      this.showUnlockScreen(this.icc1);
    } else if (this.shouldShowSIMInfoScreen()) {
      // reset skipped states so if we navigate back
      // we will redisplay the SIM unlock screens
      this.resetSkipped();
      this.showSIMInfoScreen();
    } else {
      this.resetSkipped();
      this.finish();
    }
  },

  finish: function() {
    this.hideScreen();
    this.hideSIMInfoScreen();
    // card state has been handled, so return
    // to normal navigation, and only show cell
    // data step if we have an unlocked sim
    var showCellData = (this.icc0 && !this.icc0.isLocked()) ||
                       (this.icc1 && !this.icc1.isLocked());
    this.finishCallback && this.finishCallback(showCellData);
  },

  shouldShowUnlockScreen: function sm_shouldShowLockScreen(icc) {
    return icc && !icc.skipped && icc.isLocked();
  },

  // only show sim info screen if we have two SIMs inserted
  shouldShowSIMInfoScreen: function sm_shouldShowSIMInfoScreen() {
    return (this.icc0 && this.icc1);
  },

  showUnlockScreen: function sm_showUnlockScreen(icc) {
    if (icc.unlocked) {
      return;
    }
    this._unlockingIcc = icc;

    switch (icc.mozIcc.cardState) {
      case 'pinRequired':
        this.showPinScreen(icc);
        break;
      case 'pukRequired':
        this.showPukScreen(icc);
        break;
      case 'networkLocked':
      case 'corporateLocked':
      case 'serviceProviderLocked':
      case 'network1Locked':
      case 'network2Locked':
      case 'hrpdNetworkLocked':
      case 'ruimCorporateLocked':
      case 'ruimServiceProviderLocked':
        this.showXckScreen(icc);
        break;
      default:
        throw new Error('Cannot show SIM unlock screen, unknown cardState ' +
                        icc.mozIcc.cardState);
    }
  },

  /**
   * A container of event listeners to avoid listening several times to the same
   * event/object pair.
   */
  voiceChangeListeners: [],

  updateSIMInfoText: function sm_updateSIMInfoText(icc) {
    var iccNumber = (icc === this.icc0) ? 1 : 2;
    if (icc && icc.isLocked()) {
      UIManager['simInfo' + iccNumber].classList.add('locked');
      UIManager['simCarrier' + iccNumber].setAttribute('data-l10n-id',
        'simPinLocked');
      UIManager['simNumber' + iccNumber].removeAttribute('data-l10n-id');
      UIManager['simNumber' + iccNumber].textContent = '';
    } else {
      UIManager['simInfo' + iccNumber].classList.remove('locked');

      var mobConn = this.mobConn[iccNumber - 1];
      var operator = MobileOperator
                    .userFacingInfo(mobConn)
                    .operator;

      if (!operator && !this.voiceChangeListeners[iccNumber - 1]) {
        // The operator is not yet populated, let's listen to the `voicechange`
        // event once and update the UI later.
        this.voiceChangeListeners[iccNumber - 1] = function(evt) {
          var operator = MobileOperator
                        .userFacingInfo(mobConn)
                        .operator;

          if (operator) {
            // If we have an operator, we update the UI and stop listening.
            UIManager['simCarrier' + iccNumber].removeAttribute('data-l10n-id');
            UIManager['simCarrier' + iccNumber].textContent = operator;
            mobConn.removeEventListener(
              'voicechange', this.voiceChangeListeners[iccNumber - 1]);
            this.voiceChangeListeners[iccNumber - 1] = null;
          }
        }.bind(this);

        mobConn.addEventListener(
          'voicechange', this.voiceChangeListeners[iccNumber - 1]);
      }

      if (operator) {
        UIManager['simCarrier' + iccNumber].removeAttribute('data-l10n-id');
        UIManager['simCarrier' + iccNumber].textContent = operator;
      } else {
        UIManager['simCarrier' + iccNumber].setAttribute(
          'data-l10n-id', 'searchingOperator'
        );
      }
      var number = icc.mozIcc.iccInfo.msisdn ||
                   icc.mozIcc.iccInfo.mdn || '';
      if (number) {
        UIManager['simNumber' + iccNumber].textContent = number;
        UIManager['simInfo' + iccNumber].classList.remove('no-number');
      } else {
        UIManager['simInfo' + iccNumber].classList.add('no-number');
      }
    }
  },

  showSIMInfoScreen: function sm_showSIMInfoScreen() {
    this.updateSIMInfoText(this.icc0);
    this.updateSIMInfoText(this.icc1);
    UIManager.activationScreen.classList.remove('show');
    UIManager.simInfoScreen.classList.add('show');
  },

  hideSIMInfoScreen: function sm_hidescreen() {
    UIManager.simInfoScreen.classList.remove('show');
    UIManager.activationScreen.classList.add('show');
  },

  checkSIMButton: function sm_checkSIMButton() {
    if (!this.mobConn) {
      UIManager.simImport.classList.add('hidden');
      return;
    }

    var simOption = UIManager.simImportButton;
    // If there is an unlocked SIM we activate import from SIM
    if (!SimManager.alreadyImported && SimManager.available()) {
      simOption.removeAttribute('disabled');
      UIManager.noSim.classList.add('hidden');
    } else {
      simOption.setAttribute('disabled', 'disabled');
      if (!SimManager.alreadyImported) {
        UIManager.noSim.classList.remove('hidden');
      }
    }
  },

  showPinScreen: function sm_showPinScreen(icc) {
    showRetryCount(icc, 'pin', UIManager.pinRetriesLeft);
    // Button management
    UIManager.unlockSimButton.disabled = true;
    UIManager.pinInput.addEventListener('input', function sm_checkInput(event) {
      UIManager.unlockSimButton.disabled = (event.target.value.length < 4);
    });
    // Screen management
    UIManager.activationScreen.classList.remove('show');
    UIManager.unlockSimScreen.classList.add('show');
    UIManager.pincodeScreen.classList.add('show');
    UIManager.xckcodeScreen.classList.remove('show');

    UIManager.unlockSimHeader.setAttribute('data-l10n-id', 'pincode2');
    if (this.simSlots > 1) {
      var simNumber = icc === this.icc0 ? 1 : 2;
      navigator.mozL10n.setAttributes(UIManager.pinLabel,
                                      'pincodeLabel', {n: simNumber});
    } else {
      UIManager.pinLabel.setAttribute('data-l10n-id', 'type_pin');
    }
    UIManager.pinInput.focus();
  },

  showPukScreen: function sm_showPukScreen(icc) {
    showRetryCount(icc, 'puk', UIManager.pukRetriesLeft);

    UIManager.unlockSimScreen.classList.add('show');
    UIManager.activationScreen.classList.remove('show');
    UIManager.pincodeScreen.classList.remove('show');
    UIManager.pukcodeScreen.classList.add('show');
    UIManager.xckcodeScreen.classList.remove('show');

    UIManager.unlockSimHeader.setAttribute('data-l10n-id', 'pukcode');
    if (this.simSlots > 1) {
      var simNumber = icc === this.icc0 ? 1 : 2;
      navigator.mozL10n.setAttributes(UIManager.pukLabel,
                                      'pukcodeLabel', {n: simNumber});
    } else {
      UIManager.pukLabel.setAttribute('data-l10n-id', 'type_puk');
    }
    UIManager.pukInput.focus();
  },

  showXckScreen: function sm_showXckScreen(icc) {
    var lockType;

    switch (icc.mozIcc.cardState) {
      case 'networkLocked':
        lockType = 'nck';
        break;
      case 'corporateLocked':
        lockType = 'cck';
        break;
      case 'serviceProviderLocked':
        lockType = 'spck';
        break;
      case 'network1Locked':
        lockType = 'nck1';
        break;
      case 'network2Locked':
        lockType = 'nck2';
        break;
      case 'hrpdNetworkLocked':
        lockType = 'hnck';
        break;
      case 'ruimCorporateLocked':
        lockType = 'rcck';
        break;
      case 'ruimServiceProviderLocked':
        lockType = 'rspck';
        break;
      default:
        return; // We shouldn't be here.
    }

    showRetryCount(icc, lockType, UIManager.xckRetriesLeft);

    UIManager.unlockSimScreen.classList.add('show');
    UIManager.activationScreen.classList.remove('show');
    UIManager.pincodeScreen.classList.remove('show');
    UIManager.pukcodeScreen.classList.remove('show');
    UIManager.xckcodeScreen.classList.add('show');

    var simNumber = icc === this.icc0 ? 1 : 2;
    switch (icc.mozIcc.cardState) {
      case 'networkLocked':
        navigator.mozL10n.setAttributes(UIManager.unlockSimHeader,
                                        'nckcodeTitle', {n: simNumber});
        navigator.mozL10n.setAttributes(UIManager.xckLabel, 'nckcodeLabel',
                                           {n: simNumber});
        break;
      case 'corporateLocked':
        navigator.mozL10n.setAttributes(UIManager.unlockSimHeader,
                                        'cckcodeTitle', {n: simNumber});
        navigator.mozL10n.setAttributes(UIManager.xckLabel, 'cckcodeLabel',
                                           {n: simNumber});
        break;
      case 'serviceProviderLocked':
        navigator.mozL10n.setAttributes(UIManager.unlockSimHeader,
                                        'spckcodeTitle', {n: simNumber});
        navigator.mozL10n.setAttributes(UIManager.xckLabel, 'spckcodeLabel',
                                           {n: simNumber});
        break;
      case 'network1Locked':
        navigator.mozL10n.setAttributes(UIManager.unlockSimHeader,
                                        'nck1codeTitle', {n: simNumber});
        navigator.mozL10n.setAttributes(UIManager.xckLabel, 'nck1codeLabel',
                                           {n: simNumber});
        break;
      case 'network2Locked':
        navigator.mozL10n.setAttributes(UIManager.unlockSimHeader,
                                        'nck2codeTitle', {n: simNumber});
        navigator.mozL10n.setAttributes(UIManager.xckLabel, 'nck2codeLabel',
                                           {n: simNumber});
        break;
      case 'hrpdNetworkLocked':
        navigator.mozL10n.setAttributes(UIManager.unlockSimHeader,
                                        'hnckcodeTitle', {n: simNumber});
        navigator.mozL10n.setAttributes(UIManager.xckLabel, 'hnckcodeLabel',
                                           {n: simNumber});
        break;
      case 'ruimCorporateLocked':
        navigator.mozL10n.setAttributes(UIManager.unlockSimHeader,
                                        'rcckcodeTitle', {n: simNumber});
        navigator.mozL10n.setAttributes(UIManager.xckLabel, 'rcckcodeLabel',
                                           {n: simNumber});
        break;
      case 'ruimServiceProviderLocked':
        navigator.mozL10n.setAttributes(UIManager.unlockSimHeader,
                                        'rspckcodeTitle', {n: simNumber});
        navigator.mozL10n.setAttributes(UIManager.xckLabel, 'rspckcodeLabel',
                                           {n: simNumber});
        break;
    }
    UIManager.xckInput.focus();
  },

  resetForm: function sm_clearInputs() {
    this.clearFields();
    UIManager.newpinInput.value = '';
    UIManager.confirmNewpinInput.value = '';
    UIManager.pinInput.value = '';
    UIManager.pukInput.value = '';
    UIManager.pukInfo.classList.remove('hidden');
    UIManager.xckInput.value = '';
    UIManager.unlockSimButton.disabled = false;
  },

  hideScreen: function sm_hideScreen() {
    UIManager.unlockSimScreen.classList.remove('show');
    UIManager.pincodeScreen.classList.remove('show');
    UIManager.pukcodeScreen.classList.remove('show');
    UIManager.xckcodeScreen.classList.remove('show');
    UIManager.activationScreen.classList.add('show');
  },

  skip: function sm_skip() {
    if (this._unlockingIcc) {
      this._unlockingIcc.skipped = true;
    }
    this.resetForm();
    this.hideScreen();
    this.handleCardState();
  },

  resetSkipped: function sm_resetSkipped() {
    if (this.icc0) {
      this.icc0.skipped = false;
    }
    if (this.icc1) {
      this.icc1.skipped = false;
    }
  },

  back: function sm_back() {
    this.resetForm();
    this.resetSkipped();
    this.hideScreen();
    this.hideSIMInfoScreen();
    Navigation.back();
  },

  simUnlockBack: function sm_simUnlockBack() {
    if (this.icc0.skipped) {
      this.icc0.skipped = false;
      this.hideScreen();
      this.handleCardState();
    } else {
      this.back();
    }
  },

  unlock: function sm_unlock() {
    var icc = this._unlockingIcc;
    if (!icc) {
      throw new Error('Cannot unlock SIM, no current ICC');
    }
    this.clearFields();

    switch (icc.mozIcc.cardState) {
      case 'pinRequired':
        this.unlockPin(icc);
        break;
      case 'pukRequired':
        this.unlockPuk(icc);
        break;
      case 'networkLocked':
      case 'corporateLocked':
      case 'serviceProviderLocked':
      case 'network1Locked':
      case 'network2Locked':
      case 'hrpdNetworkLocked':
      case 'ruimCorporateLocked':
      case 'ruimServiceProviderLocked':
        this.unlockXck(icc);
        break;
    }
  },

  unlockPin: function sm_unlockPin(icc) {
    var pin = UIManager.pinInput.value;
    if (pin.length < 4 || pin.length > 8) {
      UIManager.pinError.
        querySelector('.main').setAttribute('data-l10n-id', 'pinValidation');
      UIManager.pinInput.classList.add('onerror');
      UIManager.pinError.classList.remove('hidden');
      UIManager.pinInput.focus();
      return;
    } else {
      UIManager.pinInput.classList.remove('onerror');
      UIManager.pinError.classList.add('hidden');
    }

    // Unlock SIM
    this.attemptUnlock(icc, {lockType: 'pin', pin: pin });
  },

  clearFields: function sm_clearFields() {
    UIManager.pukInput.classList.remove('onerror');
    UIManager.pukError.classList.add('hidden');

    UIManager.newpinInput.classList.remove('onerror');
    UIManager.newpinError.classList.add('hidden');

    UIManager.confirmNewpinInput.classList.remove('onerror');
    UIManager.confirmNewpinError.classList.add('hidden');

    UIManager.pinError.classList.add('hidden');
    UIManager.pinError.querySelector('.main').classList.add('hidden');
    UIManager.pinError.querySelector('.lastchance').classList.add('hidden');
    UIManager.pinRetriesLeft.classList.add('hidden');

    UIManager.pukError.classList.add('hidden');
    UIManager.pukError.querySelector('.main').classList.add('hidden');
    UIManager.pukError.querySelector('.lastchance').classList.add('hidden');
    UIManager.pukRetriesLeft.classList.add('hidden');

    UIManager.xckError.classList.add('hidden');
    UIManager.xckError.querySelector('.main').classList.add('hidden');
    UIManager.xckError.querySelector('.lastchance').classList.add('hidden');
    UIManager.xckRetriesLeft.classList.add('hidden');
  },

  unlockPuk: function sm_unlockPuk(icc) {
    var pukCode = UIManager.pukInput.value;
    if (pukCode.length !== 8) {
      UIManager.pukError.querySelector('.main')
        .setAttribute('data-l10n-id', 'pukValidation');
      UIManager.pukError.classList.remove('hidden');
      UIManager.pukInfo.classList.add('hidden');
      UIManager.pukInput.classList.add('onerror');
      UIManager.pukError.focus();
      return;
    }
    var newpinCode = UIManager.newpinInput.value;
    var confirmNewpin = UIManager.confirmNewpinInput.value;
    if (newpinCode.length < 4 || newpinCode.length > 8) {
      UIManager.newpinError.setAttribute('data-l10n-id', 'pinValidation');
      UIManager.newpinError.classList.remove('hidden');
      UIManager.newpinInput.classList.add('onerror');
      UIManager.newpinError.focus();
      return;
    }
    if (newpinCode != confirmNewpin) {
      UIManager.confirmNewpinError.setAttribute('data-l10n-id',
                                    'newpinConfirmation');
      UIManager.confirmNewpinError.classList.remove('hidden');
      UIManager.newpinInput.classList.add('onerror');
      UIManager.confirmNewpinInput.classList.add('onerror');
      UIManager.confirmNewpinError.focus();
      return;
    }

    // Unlock SIM with PUK and new PIN
    var options = {lockType: 'puk', puk: pukCode, newPin: newpinCode };
    this.attemptUnlock(icc, options);
  },

  unlockXck: function sm_unlockXck(icc) {
    var xck = UIManager.xckInput.value;
    var lockType;
    switch (icc.mozIcc.cardState) {
      case 'networkLocked':
        lockType = 'nck';
        break;
      case 'corporateLocked':
        lockType = 'cck';
        break;
      case 'serviceProviderLocked':
        lockType = 'spck';
        break;
      case 'network1Locked':
        lockType = 'nck1';
        break;
      case 'network2Locked':
        lockType = 'nck2';
        break;
      case 'hrpdNetworkLocked':
        lockType = 'hnck';
        break;
      case 'ruimCorporateLocked':
        lockType = 'rcck';
        break;
      case 'ruimServiceProviderLocked':
        lockType = 'rspck';
        break;
    }
    if (xck.length < 8 || xck.length > 16) {
      UIManager.xckInput.classList.add('onerror');
      UIManager.xckError.classList.remove('hidden');
      UIManager.xckError.querySelector('.main').
        setAttribute('data-l10n-id', lockType + 'Validation');
      UIManager.xckInput.focus();
      return;
    } else {
      UIManager.pinInput.classList.remove('onerror');
      UIManager.pinError.classList.add('hidden');
    }

    // Unlock SIM
    var options = {lockType: lockType, pin: xck };
    this.attemptUnlock(icc, options);
  },

  attemptUnlock: function sm_attemptUnlock(icc, options) {
    var req = icc.mozIcc.unlockCardLock(options);
    req.onsuccess = (function sm_unlockSuccess() {
      icc.unlocked = true;
      this.resetForm();
      this.hideScreen();
      this.handleCardState();
    }).bind(this);
    req.onerror = (function sm_unlockError() {
      this.handleUnlockError(options.lockType, req.error.retryCount);
    }).bind(this);
  },

  // Try to infer whats the default SIM
  guessIcc: function guessIcc() {
    var tempIcc = null;
    if (navigator.mozMobileConnections) {
      // New multi-sim api, use mozMobileConnections to guess
      // the first inserted sim
      for (var i = 0;
        i < navigator.mozMobileConnections.length && tempIcc === null; i++) {
        if (navigator.mozMobileConnections[i] !== null &&
          navigator.mozMobileConnections[i].iccId !== null) {
          tempIcc = navigator.mozIccManager.getIccById(
            navigator.mozMobileConnections[i].iccId);
        }
      }
    } else {
      tempIcc = navigator.mozIccManager;
    }

    return tempIcc;
  },

  importContacts: function sm_importContacts() {
    // Delay for showing feedback to the user after importing
    var DELAY_FEEDBACK = 300;
    UIManager.navBar.setAttribute('aria-disabled', 'true');
    var progress = utils.overlay.show('simContacts-reading',
                                      'activityBar');

    var importButton = UIManager.simImportButton;
    var cancelled = false,
        contactsRead = false;
    var importer = new SimContactsImporter(SimManager.guessIcc());
    utils.overlay.showMenu();
    utils.overlay.oncancel = function oncancel() {
      cancelled = true;
      importer.finish();
      if (contactsRead) {
        // A message about canceling will be displayed while the current chunk
        // is being cooked
        progress.setClass('activityBar');
        utils.overlay.hideMenu();
        progress.setHeaderMsg('messageCanceling');
      } else {
        importer.onfinish(); // Early return while reading contacts
      }
    };
    var importedContacts = 0;

    importer.onread = function sim_import_read(n) {
      contactsRead = true;
      if (n > 0) {
        progress.setClass('progressBar');
        progress.setHeaderMsg('simContacts-importing');
        progress.setTotal(n);
      }
    };

    importer.onimported = function imported_contact() {
      importedContacts++;
      if (!cancelled) {
        progress.update();
      }
    };

    importer.onfinish = function sim_import_finish(numDupsMerged, iccId) {
      window.setTimeout(function do_sim_import_finish() {
        UIManager.navBar.removeAttribute('aria-disabled');
        utils.overlay.hide();
        if (importedContacts > 0) {
          utils.misc.setTimestamp('sim-' + iccId);
        }
        if (!cancelled) {
          SimManager.alreadyImported = true;
          importButton.setAttribute('disabled', 'disabled');
          utils.status.show({
            id: 'simContacts-imported3',
            args: {n: importedContacts}
          });
        }
      }, DELAY_FEEDBACK);

      importer.onfinish = null;
    };

    importer.onerror = function sim_import_error() {
      UIManager.navBar.removeAttribute('aria-disabled');
      utils.overlay.hide();
      // Just in case the user decides to do so later
      importButton.removeAttribute('disabled');

      // Showing error message allowing user to retry
      var cancel = {
        title: 'cancel',
        callback: function() {
          ConfirmDialog.hide();
        }
      };
      var retry = {
        title: 'retry',
        isRecommend: true,
        callback: function() {
          ConfirmDialog.hide();
          // And now the action is reproduced one more time
          importButton.click();
        }
      };
      ConfirmDialog.show(null, 'simContacts-error', cancel, retry);
    }; // importer.onerror

    importer.start();
  }
};
})();
