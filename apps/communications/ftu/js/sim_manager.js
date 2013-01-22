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
  },

  handleUnlockError: function sm_handleUnlockError(data) {
    switch (data.lockType) {
      case 'pin':
        UIManager.pinInput.value = '';
        UIManager.fakePinInput.value = '';
        UIManager.pinInput.classList.add('onerror');
        UIManager.pinError.innerHTML = _('pinErrorMsg');
        UIManager.pinError.classList.remove('hidden');
        UIManager.pinLabel.innerHTML = _('pinAttemptMsg2', {n: data.retryCount});
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
    return (this.mobConn.cardState == 'ready');
  },

 /**
  * Possible values:
  *   null,
  *   'absent',
  *   'pinRequired',
  *   'pukRequired',
  *   'networkLocked',
  *   'ready'.
  */
  handleCardState: function sm_handleCardState(callback) {
    if (callback)
      this.accessCallback = callback;
    switch (this.mobConn.cardState) {
      case 'pinRequired':
        this.showPinScreen();
        break;
      case 'pukRequired':
        this.showPukScreen();
        break;
      case 'ready':
        if (this.accessCallback) {
          this.accessCallback(true);
        }
        break;
    }
  },
  accessCallback: null,

  showPinScreen: function sm_showScreen() {
    UIManager.activationScreen.classList.remove('show');
    UIManager.unlockSimScreen.classList.add('show');
    UIManager.pincodeScreen.classList.add('show');
    UIManager.fakePinInput.focus();
  },

  showPukScreen: function sm_showPukScreen() {
    UIManager.unlockSimScreen.classList.add('show');
    UIManager.activationScreen.classList.remove('show');
    UIManager.pincodeScreen.classList.remove('show');
    UIManager.pukcodeScreen.classList.add('show');
    UIManager.unlockSimHeader.innerHTML = _('pukcode');
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
    this.accessCallback(false);
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
    req.onsuccess = function sm_unlockSuccess() {
      this.hideScreen();
    }.bind(this);
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
    req.onsuccess = function sm_unlockSuccess() {
      this.hideScreen();
    }.bind(this);
  },

  importContacts: function sm_importContacts() {
    var feedback = UIManager.simImportFeedback;
    feedback.innerHTML = _('simContacts-importing');
    UIManager.navBar.setAttribute('aria-disabled', 'true');
    UIManager.loadingHeader.innerHTML = _('simContacts-importing');
    UIManager.loadingOverlay.classList.add('show-overlay');
    var importButton = UIManager.simImportButton;
    importButton.classList.add('disabled');

    importSIMContacts(
      function() {
        feedback.innerHTML = _('simContacts-reading');
      }, function(n) {
        feedback.innerHTML = _('simContacts-imported3', {n: n});
        UIManager.navBar.removeAttribute('aria-disabled');
        UIManager.loadingOverlay.classList.remove('show-overlay');
      }, function() {
        feedback.innerHTML = _('simContacts-error');
        UIManager.navBar.removeAttribute('aria-disabled');
        UIManager.loadingOverlay.classList.remove('show-overlay');
        importButton.classList.remove('disabled');
    }.bind(this));
  }
};

