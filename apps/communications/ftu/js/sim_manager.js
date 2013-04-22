'use strict';

var SimManager = {
  init: function sm_init() {
    this.mobConn = window.navigator.mozMobileConnection;
    if (!this.mobConn)
      return;

    this.mobConn.addEventListener('icccardlockerror',
                                  this.handleUnlockError.bind(this));
    this.mobConn.addEventListener('cardstatechange',
                                  this.handleCardState.bind(this));

    this.alreadyImported = false;

    Object.defineProperty(this,
                          'retryCount', {
                            get: function() {
                              return this.mobConn.retryCount;
                            }
                          });
  },

  handleUnlockError: function sm_handleUnlockError(data) {
    var l10nArgs = {n: data.retryCount};
    switch (data.lockType) {
      case 'pin':
        UIManager.pinInput.value = '';
        UIManager.fakePinInput.value = '';
        UIManager.pinInput.classList.add('onerror');
        UIManager.pinError.textContent = _('pinError');
        UIManager.pinError.classList.remove('hidden');
        UIManager.pinError.textContent = _('pinAttemptMsg2', l10nArgs);
        UIManager.pinRetriesLeft.textContent = _('inputCodeRetriesLeft',
                                                 l10nArgs);
        if (data.retryCount == 1) {
          UIManager.pinError.textContent += ' ' + _('pinLastChanceMsg');
        }
        break;
      case 'puk':
        UIManager.pukInput.value = '';
        UIManager.fakePukInput.value = '';
        UIManager.pukInput.classList.add('onerror');
        UIManager.pukError.textContent = _('pukError');
        UIManager.pukError.classList.remove('hidden');
        UIManager.pukInfo.classList.add('hidden');
        UIManager.pukError.textContent = _('pukAttemptMsg2', l10nArgs);
        UIManager.pukRetriesLeft.textContent = _('inputCodeRetriesLeft',
                                                 l10nArgs);
        if (data.retryCount == 1) {
          UIManager.pukError.textContent += _('pukLastChanceMsg');
        }
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
    if (!this.alreadyImported && SimManager.available()) {
      simOption.removeAttribute('disabled');
      UIManager.noSim.classList.add('hidden');
    } else {
      simOption.setAttribute('disabled', 'disabled');
      if (!this.alreadyImported) {
        UIManager.noSim.classList.remove('hidden');
      }
    }
  },
  accessCallback: null,

  showPinScreen: function sm_showScreen() {
    if (!this.retryCount || this.retryCount === 'undefined') {
      UIManager.pinRetriesLeft.classList.add('hidden');
    } else {
      var l10nArgs = {n: retries};
      UIManager.pinRetriesLeft.textContent = _('inputCodeRetriesLeft',
                                               l10nArgs);
      UIManager.pinRetriesLeft.classList.remove('hidden');
    }
    UIManager.activationScreen.classList.remove('show');
    UIManager.unlockSimScreen.classList.add('show');
    UIManager.pincodeScreen.classList.add('show');
    UIManager.fakePinInput.focus();
  },

  showPukScreen: function sm_showPukScreen() {
    if (!this.retryCount) {
      UIManager.pukRetriesLeft.classList.add('hidden');
    } else {
      var l10nArgs = {n: retries};
      UIManager.pukRetriesLeft.textContent = _('inputCodeRetriesLeft',
                                               l10nArgs);
      UIManager.pukRetriesLeft.classList.remove('hidden');
    }
    UIManager.unlockSimScreen.classList.add('show');
    UIManager.activationScreen.classList.remove('show');
    UIManager.pincodeScreen.classList.remove('show');
    UIManager.pukcodeScreen.classList.add('show');
    UIManager.unlockSimHeader.textContent = _('pukcode');
    UIManager.fakePukInput.focus();
  },

  hideScreen: function sm_hideScreen() {
    UIManager.unlockSimScreen.classList.remove('show');
    UIManager.pincodeScreen.classList.remove('show');
    UIManager.pukcodeScreen.classList.remove('show');
    UIManager.activationScreen.classList.add('show');
  },

  skip: function sm_skip() {
    this.hideScreen();
    if (this.accessCallback) {
      this.accessCallback(false);
    }
  },

  unlock: function sm_unlock() {
    switch (this.mobConn.cardState) {
      case 'pinRequired':
        this.unlockPin();
        break;
      case 'pukRequired':
        this.unlockPuk();
        break;
    }
  },

  unlockPin: function sm_unlockPin() {
    var pin = UIManager.pinInput.value;
    if (pin.length < 4 || pin.length > 8) {
      UIManager.pinError.textContent = _('pinValidation');
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
    req.onsuccess = function sm_unlockSuccess() {
      this.hideScreen();
    }.bind(this);
  },

  clearFields: function sm_clearFields() {
    UIManager.pukInput.classList.remove('onerror');
    UIManager.pukError.classList.add('hidden');

    UIManager.newpinInput.classList.remove('onerror');
    UIManager.newpinError.classList.add('hidden');

    UIManager.confirmNewpinInput.classList.remove('onerror');
    UIManager.confirmNewpinError.classList.add('hidden');
  },

  unlockPuk: function sm_unlockPuk() {
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
    var req = this.mobConn.unlockCardLock(options);

    req.onsuccess = (function sm_unlockSuccess() {
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
      progress.setHeaderMsg(_('simContacts-importing'))
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
