'use strict'

var SimManager = {
  unlocked: false,

  showScreen: function sm_showScreen() {
    UIManager.pincodeScreen.classList.add('show');
    UIManager.activationScreen.classList.remove('show');
    UIManager.fakeSimPin.focus();
  },

  hideScreen: function sm_hideScreen() {
    UIManager.pincodeScreen.classList.remove('show');
    UIManager.activationScreen.classList.add('show');
    window.location.hash = '#languages';
    Navigation.currentStep = 1;
    Navigation.manageStep();
  },

  skip: function sm_skip() {
    this.hideScreen();
  },

  importContacts: function sm_importContacts() {
    var feedback = UIManager.simImportFeedback;
    feedback.innerHTML = _('simContacts-importing');
    UIManager.navBar.setAttribute('aria-disabled', 'true');
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
  },

  unlock: function sm_unlock() {
    var pin = UIManager.pinInput.value;
    if (pin.length < 4 || pin.length > 8) {
      UIManager.pinError.innerHTML = _('pinValidation');
      return;
    }

    // Unlock SIM
    var options = {lockType: 'pin', pin: pin };
    var conn = window.navigator.mozMobileConnection;

    conn.addEventListener('icccardlockerror', function(data) {
      UIManager.pinInput.value = '';
      UIManager.fakeSimPin.value = '';
      UIManager.pinInput.classList.add('onerror');
      UIManager.pinError.innerHTML = _('pinErrorMsg') + ' ' +
        _('pinAttemptMsg', {n: data.retryCount});
    });

    var req = conn.unlockCardLock(options);

    req.onsuccess = function sm_unlockSuccess() {
      this.unlocked = true;
      UIManager.pincodeScreen.classList.remove('show');
      UIManager.activationScreen.classList.add('show');
      window.location.hash = '#languages';
    }.bind(this);
  }

};
