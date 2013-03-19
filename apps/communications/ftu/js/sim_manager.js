'use strict';

var SimManager = {
  // XXX: For handling the intermediate 'networkLocked' after unlock
  //      the SIM card.
  _unlocked: false,

  init: function sm_init() {
    this.mobConn = window.navigator.mozMobileConnection;
    if (!this.mobConn)
      return;

    this.mobConn.addEventListener('icccardlockerror',
                                  this.handleUnlockError.bind(this));
    this.mobConn.addEventListener('cardstatechange',
                                  this.handleCardState.bind(this));

    this.alreadyImported = false;
  },

  handleUnlockError: function sm_handleUnlockError(data) {
    switch (data.lockType) {
      case 'pin':
        UIManager.pinInput.value = '';
        UIManager.fakePinInput.value = '';
        UIManager.pinInput.classList.add('onerror');
        UIManager.pinError.innerHTML = _('pinErrorMsg');
        UIManager.pinError.classList.remove('hidden');
        UIManager.pinLabel.innerHTML = _('pinAttemptMsg2',
                                         {n: data.retryCount});
        if (data.retryCount == 1)
          UIManager.pinError.innerHTML += _('pinLastChanceMsg');
        break;
      case 'puk':
        UIManager.pukInput.value = '';
        UIManager.fakePukInput.value = '';
        UIManager.pukInput.classList.add('onerror');
        UIManager.pukError.innerHTML = _('pukErrorMsg');
        UIManager.pukError.classList.remove('hidden');
        UIManager.pukInfo.classList.add('hidden');
        UIManager.pukLabel.innerHTML = _('pukAttemptMsg', {n: data.retryCount});
        // TODO what if counter gets to 0 ??
        break;
    }
  },

  available: function sm_available() {
    if (!this.mobConn)
      return false;
    return (this.mobConn.cardState === 'ready');
  },

 /**
  * Possible values:
  *   null,
  *   'absent',
  *   'unknown',
  *   'pinRequired',
  *   'pukRequired',
  *   'networkLocked',
  *   'corporateLocked',
  *   'serviceProviderLocked',
  *   'ready'.
  */
  handleCardState: function sm_handleCardState(callback) {
    SimManager.checkSIMButton();
    this.accessCallback = (typeof callback === 'function') ? callback : null;
    switch (this.mobConn.cardState) {
      case 'pinRequired':
        this.showPinScreen();
        break;
      case 'pukRequired':
        this.showPukScreen();
        break;
      case 'networkLocked':
      case 'corporateLocked':
      case 'serviceProviderLocked':
        this.showXckScreen();
        break;
      default:
        if (this.accessCallback) {
          this.accessCallback(this.mobConn.cardState === 'ready');
        }
        break;
    }
  },

  checkSIMButton: function sm_checkSIMButton() {
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

  showPinScreen: function sm_showScreen() {
    if (this._unlocked)
      return;

    UIManager.activationScreen.classList.remove('show');
    UIManager.unlockSimScreen.classList.add('show');
    UIManager.pincodeScreen.classList.add('show');
    UIManager.xckcodeScreen.classList.remove('show');
    UIManager.fakePinInput.focus();
  },

  showPukScreen: function sm_showPukScreen() {
    if (this._unlocked)
      return;

    UIManager.unlockSimScreen.classList.add('show');
    UIManager.activationScreen.classList.remove('show');
    UIManager.pincodeScreen.classList.remove('show');
    UIManager.pukcodeScreen.classList.add('show');
    UIManager.xckcodeScreen.classList.remove('show');
    UIManager.unlockSimHeader.innerHTML = _('pukcode');
    UIManager.fakePukInput.focus();
  },

  showXckScreen: function sm_showXckScreen() {
    if (this._unlocked)
      return;

    UIManager.unlockSimScreen.classList.add('show');
    UIManager.activationScreen.classList.remove('show');
    UIManager.pincodeScreen.classList.remove('show');
    UIManager.pukcodeScreen.classList.remove('show');
    UIManager.xckcodeScreen.classList.add('show');

    switch (this.mobConn.cardState) {
      case 'networkLocked':
        UIManager.unlockSimHeader.innerHTML = _('nckcode');
        UIManager.xckLabel.textContent = _('type_nck');
        UIManager.xckLabel.dataset.l10nId = 'type_nck';
        break;
      case 'corporateLocked':
        UIManager.unlockSimHeader.innerHTML = _('cckcode');
        UIManager.xckLabel.textContent = _('type_cck');
        UIManager.xckLabel.dataset.l10nId = 'type_cck';
        break;
      case 'serviceProviderLocked':
        UIManager.unlockSimHeader.innerHTML = _('spckcode');
        UIManager.xckLabel.textContent = _('type_spck');
        UIManager.xckLabel.dataset.l10nId = 'type_spck';
        break;
    }
    UIManager.fakeXckInput.focus();
  },

  hideScreen: function sm_hideScreen() {
    UIManager.unlockSimScreen.classList.remove('show');
    UIManager.pincodeScreen.classList.remove('show');
    UIManager.pukcodeScreen.classList.remove('show');
    UIManager.xckcodeScreen.classList.remove('show');
    UIManager.activationScreen.classList.add('show');
  },

  skip: function sm_skip() {
    this.hideScreen();
    if (this.accessCallback) {
      this.accessCallback(false);
    }
  },

  unlock: function sm_unlock() {
    this._unlocked = false;

    switch (this.mobConn.cardState) {
      case 'pinRequired':
        this.unlockPin();
        break;
      case 'pukRequired':
        this.unlockPuk();
        break;
      case 'networkLocked':
      case 'corporateLocked':
      case 'serviceProviderLocked':
        this.unlockXck();
        break;
    }
  },

  unlockPin: function sm_unlockPin() {
    var pin = UIManager.pinInput.value;
    if (pin.length < 4 || pin.length > 8) {
      UIManager.pinError.innerHTML = _('pinValidation');
      UIManager.pinInput.classList.add('onerror');
      UIManager.pinError.classList.remove('hidden');
      return;
    } else {
      UIManager.pinInput.classList.remove('onerror');
      UIManager.pinError.classList.add('hidden');
    }

    // Unlock SIM
    var options = {lockType: 'pin', pin: pin };
    var req = this.mobConn.unlockCardLock(options);
    req.onsuccess = (function sm_unlockSuccess() {
      this._unlocked = true;
      this.hideScreen();
    }).bind(this);
  },

  clearFields: function sm_clearFields() {
    UIManager.pukInput.classList.remove('onerror');
    UIManager.pukError.innerHTML = '';
    UIManager.pukError.classList.add('hidden');

    UIManager.newpinInput.classList.remove('onerror');
    UIManager.newpinError.innerHTML = '';
    UIManager.newpinError.classList.add('hidden');

    UIManager.confirmNewpinInput.classList.remove('onerror');
    UIManager.confirmNewpinError.innerHTML = '';
    UIManager.confirmNewpinError.classList.add('hidden');
  },
  unlockPuk: function sm_unlockPuk() {
    this.clearFields();
    var pukCode = UIManager.pukInput.value;
    if (pukCode.length !== 8) {
      UIManager.pukError.innerHTML = _('pukValidation');
      UIManager.pukError.classList.remove('hidden');
      UIManager.pukInfo.classList.add('hidden');
      UIManager.pukInput.classList.add('onerror');
      UIManager.pukError.focus();
      return;
    }
    var newpinCode = UIManager.newpinInput.value;
    var confirmNewpin = UIManager.confirmNewpinInput.value;
    if (newpinCode.length < 4 || newpinCode.length > 8) {
      UIManager.newpinError.innerHTML = _('pinValidation');
      UIManager.newpinError.classList.remove('hidden');
      UIManager.newpinInput.classList.add('onerror');
      UIManager.newpinError.focus();
      return;
    }
    if (newpinCode != confirmNewpin) {
      UIManager.confirmNewpinError.innerHTML = _('newpinConfirmation');
      UIManager.confirmNewpinError.classList.remove('hidden');
      UIManager.newpinInput.classList.add('onerror');
      UIManager.confirmNewpinInput.classList.add('onerror');
      UIManager.confirmNewpinError.focus();
      return;
    }

    // Unlock SIM with PUK and new PIN
    var options = {lockType: 'puk', puk: pukCode, newPin: newpinCode };
    var req = this.mobConn.unlockCardLock(options);
    req.onsuccess = (function sm_unlockSuccess() {
      this._unlocked = true;
      this.hideScreen();
    }).bind(this);
  },

  unlockXck: function sm_unlockXck() {
    var xck = UIManager.xckInput.value;
    var lockType;
    switch (this.mobConn.cardState) {
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
      UIManager.xckError.innerHTML = _(lockType + 'Validation');
      return;
    } else {
      UIManager.pinInput.classList.remove('onerror');
      UIManager.pinError.classList.add('hidden');
    }

    // Unlock SIM
    var options = {lockType: lockType, pin: xck };
    var req = this.mobConn.unlockCardLock(options);
    req.onsuccess = (function sm_unlockSuccess() {
      this._unlocked = true;
      this.hideScreen();
    }).bind(this);
  },

  importContacts: function sm_importContacts() {
    // Delay for showing feedback to the user after importing
    var DELAY_FEEDBACK = 300;
    UIManager.navBar.setAttribute('aria-disabled', 'true');
    var progress = utils.overlay.show(_('simContacts-reading'),
                                      'activityBar');

    var importButton = UIManager.simImportButton;
    importButton.setAttribute('disabled', 'disabled');

    var importer = new SimContactsImporter();
    var importedContacts = 0;

    importer.onread = function sim_import_read(n) {
      progress.setClass('progressBar');
      progress.setHeaderMsg(_('simContacts-importing'));
      progress.setTotal(n);
    };

    importer.onimported = function imported_contact() {
      importedContacts++;
      progress.update();
    };

    importer.onfinish = function sim_import_finish() {
      window.setTimeout(function do_sim_import_finish() {
        SimManager.alreadyImported = true;
        UIManager.navBar.removeAttribute('aria-disabled');
        utils.overlay.hide();
        utils.status.show(_('simContacts-imported3', {n: importedContacts}));
      }, DELAY_FEEDBACK);
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
