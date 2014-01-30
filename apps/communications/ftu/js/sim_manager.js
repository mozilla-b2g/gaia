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

  var _;

  // mozIcc.cardState values for a locked SIM
  var lockStates = ['pinRequired', 'pukRequired', 'networkLocked',
                   'corporateLocked', 'serviceProviderLocked'];

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

    _ = navigator.mozL10n.get;

    this.alreadyImported = false;
  },

  handleUnlockError: function sm_handleUnlockError(data) {
    var l10nArgs = {n: data.retryCount};
    switch (data.lockType) {
      case 'pin':
        if (data.retryCount == 0) {
          this.showPukScreen(this._unlockingIcc);
          break;
        }
        UIManager.pinInput.value = '';
        UIManager.pinInput.classList.add('onerror');
        UIManager.pinError.textContent = _('pinError');
        UIManager.pinError.classList.remove('hidden');
        UIManager.pinError.textContent = _('pinAttemptMsg2', l10nArgs);
        UIManager.pinRetriesLeft.textContent = _('inputCodeRetriesLeft',
                                                 l10nArgs);
        UIManager.pinRetriesLeft.classList.remove('hidden');
        if (data.retryCount == 1) {
          UIManager.pinError.textContent += ' ' + _('pinLastChanceMsg');
        }
        break;
      case 'puk':
        UIManager.pukInput.value = '';
        UIManager.pukInput.classList.add('onerror');
        UIManager.pukError.textContent = _('pukError');
        UIManager.pukError.classList.remove('hidden');
        UIManager.pukInfo.classList.add('hidden');
        UIManager.pukError.textContent = _('pukAttemptMsg2', l10nArgs);
        UIManager.pukRetriesLeft.textContent = _('inputCodeRetriesLeft',
                                                 l10nArgs);
        UIManager.pukRetriesLeft.classList.remove('hidden');
        if (data.retryCount == 1) {
          UIManager.pukError.textContent += _('pukLastChanceMsg');
        }
        // TODO what if counter gets to 0 ??
        break;
      case 'nck':
      case 'cck':
      case 'spck':
        UIManager.xckInput.value = '';
        UIManager.xckInput.classList.add('onerror');
        UIManager.xckError.textContent = _('nckError');
        UIManager.xckError.classList.remove('hidden');
        UIManager.xckInfo.classList.add('hidden');
        UIManager.xckError.textContent = _('nckAttemptMsg2', l10nArgs);
        UIManager.xckRetriesLeft.textContent = _('inputCodeRetriesLeft',
                                                 l10nArgs);
        UIManager.xckRetriesLeft.classList.remove('hidden');
        if (data.retryCount == 1) {
          UIManager.xckError.textContent += _('nckLastChanceMsg');
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
      console.warn('ICC detected in unsupported slot', iccID);
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
  *   'ready'.
  */
  handleCardState: function sm_handleCardState(callback) {
    // used to track which SIM's PIN unlock
    // screen we are currently displaying
    this._unlockingIcc = null;

    SimManager.checkSIMButton();
    if (typeof callback === 'function') {
      this.finishCallback = callback;
    }

    if (this.shouldShowUnlockScreen(this.icc0)) {
      this.showUnlockScreen(this.icc0);
    } else if (this.shouldShowUnlockScreen(this.icc1)) {
      this.showUnlockScreen(this.icc1);
    } else if (this.shouldShowSIMInfoScreen()) {
      // reset skipped states so if we navigate back
      // we will redisplay the SIM unlock screens
      this.resetSkipped();
      this.showSIMInfoScreen();
    } else {
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
        this.showXckScreen(icc);
        break;
      default:
        throw new Error('Cannot show SIM unlock screen, unknown cardState ' +
                        icc.mozIcc.cardState);
        break;
    }
  },

  updateSIMInfoText: function sm_updateSIMInfoText(icc) {
    var iccNumber = (icc === this.icc0) ? 1 : 2;
    if (icc && icc.isLocked()) {
      UIManager['simInfo' + iccNumber].classList.add('locked');
      UIManager['simCarrier' + iccNumber].textContent = _('simPinLocked');
      UIManager['simNumber' + iccNumber].textContent = '';
    } else {
      UIManager['simInfo' + iccNumber].classList.remove('locked');
      var carrier = MobileOperator
                    .userFacingInfo(this.mobConn[iccNumber - 1])
                    .operator || _('noOperator');
      UIManager['simCarrier' + iccNumber].textContent = carrier;
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
    icc.mozIcc.getCardLockRetryCount('pin', function(retryCount) {
      if (retryCount) {
        var l10nArgs = {n: retryCount};
        UIManager.pinRetriesLeft.textContent = _('inputCodeRetriesLeft',
                                                 l10nArgs);
        UIManager.pinRetriesLeft.classList.remove('hidden');
      }
    });
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

    UIManager.unlockSimHeader.textContent = _('pincode2');
    var pincodeLabel = _('type_pin');
    if (this.simSlots > 1) {
      var simNumber = icc === this.icc0 ? 1 : 2;
      pincodeLabel = _('pincodeLabel', {n: simNumber});
    }
    UIManager.pinLabel.textContent = pincodeLabel;
    UIManager.pinInput.focus();
  },

  showPukScreen: function sm_showPukScreen(icc) {
    icc.mozIcc.getCardLockRetryCount('puk', function(retryCount) {
      if (retryCount) {
        var l10nArgs = {n: retryCount};
        UIManager.pukRetriesLeft.textContent = _('inputCodeRetriesLeft',
                                                 l10nArgs);
        UIManager.pukRetriesLeft.classList.remove('hidden');
      }
    });

    UIManager.unlockSimScreen.classList.add('show');
    UIManager.activationScreen.classList.remove('show');
    UIManager.pincodeScreen.classList.remove('show');
    UIManager.pukcodeScreen.classList.add('show');
    UIManager.xckcodeScreen.classList.remove('show');

    UIManager.unlockSimHeader.textContent = _('pukcode');
    var pukcodeLabel = _('type_puk');
    if (this.simSlots > 1) {
      var simNumber = icc === this.icc0 ? 1 : 2;
      pukcodeLabel = _('pukcodeLabel', {n: simNumber});
    }
    UIManager.pukLabel.textContent = pukcodeLabel;

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
      default:
        return; // We shouldn't be here.
    }

    icc.mozIcc.getCardLockRetryCount(lockType, function(retryCount) {
      if (retryCount) {
        var l10nArgs = {n: retryCount};
        UIManager.xckRetriesLeft.textContent = _('inputCodeRetriesLeft',
                                                 l10nArgs);
        UIManager.xckRetriesLeft.classList.remove('hidden');
      }
    });

    UIManager.unlockSimScreen.classList.add('show');
    UIManager.activationScreen.classList.remove('show');
    UIManager.pincodeScreen.classList.remove('show');
    UIManager.pukcodeScreen.classList.remove('show');
    UIManager.xckcodeScreen.classList.add('show');

    var simNumber = icc === this.icc0 ? 1 : 2;
    switch (icc.mozIcc.cardState) {
      case 'networkLocked':
        UIManager.unlockSimHeader.textContent = _('nckcodeTitle',
                                                  {n: simNumber});
        UIManager.xckLabel.textContent = _('nckcodeLabel',
                                           {n: simNumber});
        break;
      case 'corporateLocked':
        UIManager.unlockSimHeader.textContent = _('cckcodeTitle',
                                                  {n: simNumber});
        UIManager.xckLabel.textContent = _('cckcodeTitle',
                                           {n: simNumber});
        break;
      case 'serviceProviderLocked':
        UIManager.unlockSimHeader.textContent = _('spckcodeTitle',
                                                  {n: simNumber});
        UIManager.xckLabel.textContent = _('spckcodeTitle',
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
        this.unlockXck(icc);
        break;
    }
  },

  unlockPin: function sm_unlockPin(icc) {
    var pin = UIManager.pinInput.value;
    if (pin.length < 4 || pin.length > 8) {
      UIManager.pinError.textContent = _('pinValidation');
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
  },

  unlockPuk: function sm_unlockPuk(icc) {
    this.clearFields();
    var pukCode = UIManager.pukInput.value;
    if (pukCode.length !== 8) {
      UIManager.pukError.textContent = _('pukValidation');
      UIManager.pukError.classList.remove('hidden');
      UIManager.pukInfo.classList.add('hidden');
      UIManager.pukInput.classList.add('onerror');
      UIManager.pukError.focus();
      return;
    }
    var newpinCode = UIManager.newpinInput.value;
    var confirmNewpin = UIManager.confirmNewpinInput.value;
    if (newpinCode.length < 4 || newpinCode.length > 8) {
      UIManager.newpinError.textContent = _('pinValidation');
      UIManager.newpinError.classList.remove('hidden');
      UIManager.newpinInput.classList.add('onerror');
      UIManager.newpinError.focus();
      return;
    }
    if (newpinCode != confirmNewpin) {
      UIManager.confirmNewpinError.textContent = _('newpinConfirmation');
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
    }
    if (xck.length < 8 || xck.length > 16) {
      UIManager.xckInput.classList.add('onerror');
      UIManager.xckError.classList.remove('hidden');
      UIManager.xckError.textContent = _(lockType + 'Validation');
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
      this.handleUnlockError(req.error);
    }).bind(this);
  },

  // Try to infer whats the default SIM
  guessIcc: function guessIcc() {
    var tempIcc = null;
    if (navigator.mozMobileConnections) {
      // New multi-sim api, use mozMobileConnection to guess
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
    var progress = utils.overlay.show(_('simContacts-reading'),
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
        progress.setHeaderMsg(_('messageCanceling'));
      } else {
        importer.onfinish(); // Early return while reading contacts
      }
    };
    var importedContacts = 0;

    importer.onread = function sim_import_read(n) {
      contactsRead = true;
      if (n > 0) {
        progress.setClass('progressBar');
        progress.setHeaderMsg(_('simContacts-importing'));
        progress.setTotal(n);
      }
    };

    importer.onimported = function imported_contact() {
      importedContacts++;
      if (!cancelled) {
        progress.update();
      }
    };

    importer.onfinish = function sim_import_finish() {
      window.setTimeout(function do_sim_import_finish() {
        UIManager.navBar.removeAttribute('aria-disabled');
        utils.overlay.hide();
        if (importedContacts > 0) {
          window.importUtils.setTimestamp('sim');
        }
        if (!cancelled) {
          SimManager.alreadyImported = true;
          importButton.setAttribute('disabled', 'disabled');
          utils.status.show(_('simContacts-imported3',
                              {n: importedContacts})
          );
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
        title: _('cancel'),
        callback: function() {
          ConfirmDialog.hide();
        }
      };
      var retry = {
        title: _('retry'),
        isRecommend: true,
        callback: function() {
          ConfirmDialog.hide();
          // And now the action is reproduced one more time
          importButton.click();
        }
      };
      ConfirmDialog.show(null, _('simContacts-error'), cancel, retry);
    }; // importer.onerror

    importer.start();
  }
};
})();
