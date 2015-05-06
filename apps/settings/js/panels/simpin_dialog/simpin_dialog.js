/**
 * SimPinDialog is a constructor function that can help us process
 * any simpin related works like enable/disable lock, change pins ... etc.
 *
 * @module @SimPinDialog
 */
define(function(require) {
  'use strict';

  var SimSecurity = require('modules/sim_security');
  var DialogService = require('modules/dialog_service');
  var l10n = window.navigator.mozL10n;

  function SimPinDialog(elements) {
    this._localize = l10n.setAttributes;
    this._elements = elements;
    this._method = '';
    this._cardIndex = 0;
    this._pinOptions = {};
    this._allowedRetryCounts = {
      pin: 3,
      pin2: 3,
      puk: 10,
      puk2: 10
    };
  }

  SimPinDialog.prototype = {
    /**
     * init function
     *
     * @memberOf SimPinDialog
     * @access public
     * @param {Object} options
     * @param {String} options.method - lock, unlock ... etc
     * @param {Number} options.cardIndex - which simcard
     * @param {Object} options.pinOptions - extra arguments for icc operations
     */
    init: function(options) {
      this._method = options.method;
      this._cardIndex = options.cardIndex;
      this._pinOptions = options.pinOptions;
      this._bindInputClickEvent();
      this._initUI();
    },

    /**
     * We will call this function when users click on submit button to make sure
     * DialogService can do the right thing.
     *
     * @memberOf SimPinDialog
     * @access public
     * @return {Promise}
     */
    verify: function() {
      switch (this._method) {
        // unlock SIM
        case 'unlock_pin':
          return this._unlockPin();
        case 'unlock_puk':
          return this._unlockPuk('puk');
        case 'unlock_puk2':
          return this._unlockPuk('puk2');

        // PIN lock
        case 'enable_lock':
          return this._enableLock(true);
        case 'disable_lock':
          return this._enableLock(false);
        case 'change_pin':
          return this._changePin('pin');

        // get PIN2 code (FDN contact list)
        case 'get_pin2':
          return this._updateFdnContact();

        // PIN2 lock (FDN)
        case 'enable_fdn':
          return this._enableFdn(true);
        case 'disable_fdn':
          return this._enableFdn(false);
        case 'change_pin2':
          return this._changePin('pin2');

        default:
          return Promise.reject();
      }
    },

    /**
     * We will clear all pre-set values when the dialog is hidden.
     *
     * @memberOf SimPinDialog
     * @access public
     */
    clear: function() {
      this._elements.errorMsg.hidden = true;
      this._elements.pinInput.value = '';
      this._elements.pukInput.value = '';
      this._elements.newPinInput.value = '';
      this._elements.confirmPinInput.value = '';
    },

    /**
     * Unlock pin
     *
     * @memberOf SimPinDialog
     * @access private
     * @return {Promise}
     */
    _unlockPin: function() {
      var pin = this._elements.pinInput.value;
      if (pin === '') {
        return Promise.reject();
      }
      return this._unlockCardLock({
        lockType: 'pin',
        pin: pin
      });
    },

    /**
     * Unlock puk1 or puk2
     *
     * @memberOf SimPinDialog
     * @param {String} lockType
     * @access private
     * @return {Promise}
     */
    _unlockPuk: function(lockType) {
      lockType = lockType || 'puk';
      var puk = this._elements.pukInput.value;
      var newPin = this._elements.newPinInput.value;
      var confirmPin = this._elements.confirmPinInput.value;

      if (puk === '' || newPin === '' || confirmPin === '') {
        return Promise.reject();
      }

      if (newPin !== confirmPin) {
        this._showMessage('newPinErrorMsg');
        this._elements.newPinInput.value = '';
        this._elements.confirmPinInput.value = '';
        this._elements.pukInput.value = '';
        this._elements.pukInput.focus();
        return Promise.reject();
      }

      return this._unlockCardLock({
        lockType: lockType,
        puk: puk,
        newPin: newPin
      });
    },

    /**
     * This is an internal function to pass all arguments to icc and waiting
     * for returned results.
     *
     * @memberOf SimPinDialog
     * @param {Object} options
     * @param {String} options.pin
     * @param {String} options.puk
     * @param {String} options.newPin
     * @access private
     * @return {Promise}
     */
    _unlockCardLock: function(options) {
      return SimSecurity.unlockCardLock(this._cardIndex, options).then(() => {
        // do nothing
      }, (error) => {
        var needToCloseDialog = this._handleCardLockError({
          lockType: options.lockType,
          error: error
        });
        if (!needToCloseDialog) {
          return Promise.reject();
        }
      });
    },

    /**
     * Lock pin
     *
     * @memberOf SimPinDialog
     * @param {Boolean} enabled
     * @access private
     * @return {Promise}
     */
    _enableLock: function(enabled) {
      var pin = this._elements.pinInput.value;
      if (pin === '') {
        return Promise.reject();
      }
      return this._setCardLock({
        lockType: 'pin',
        pin: pin,
        enabled: enabled
      });
    },

    /**
     * Enable FDN on Simcards and related Call functions under its own panel.
     *
     * @memberOf SimPinDialog
     * @param {Boolean} enabled
     * @access private
     * @return {Promise}
     */
    _enableFdn: function(enabled) {
      var pin = this._elements.pinInput.value;
      if (pin === '') {
        return Promise.reject();
      }
      return this._setCardLock({
        lockType: 'fdn',
        pin2: pin,
        enabled: enabled
      });
    },

    /**
     * Change the pre-defined codes in the simcard.
     *
     * @memberOf SimPinDialog
     * @param {String} lockType
     * @access private
     * @return {Promise}
     */
    _changePin: function(lockType) {
      // lockType = `pin' or `pin2'
      lockType = lockType || 'pin';
      var pin = this._elements.pinInput.value;
      var newPin = this._elements.newPinInput.value;
      var confirmPin = this._elements.confirmPinInput.value;

      if (pin === '' || newPin === '' || confirmPin === '') {
        return Promise.reject();
      }

      if (newPin !== confirmPin) {
        this._showMessage('newPinErrorMsg');
        this._elements.newPinInput.value = '';
        this._elements.confirmPinInput.value = '';
        this._elements.pinInput.value = '';
        this._elements.pinInput.focus();
        return Promise.reject();
      }

      return this._setCardLock({
        lockType: lockType,
        pin: pin,
        newPin: newPin
      });
    },

    /**
     * This is an internal function to pass all arguments to icc and waiting
     * for returned results.
     *
     * @memberOf SimPinDialog
     * @param {Object} options
     * @param {String} options.lockType
     * @param {String} options.pin
     * @param {String} options.newPin
     * @param {String} options.pin2
     * @param {Boolean} options.enabled
     * @access private
     * @return {Promise}
     */
    _setCardLock: function(options) {
      return SimSecurity.setCardLock(this._cardIndex, options).then(() => {
        // do nothing
      }, (error) => {
        var needToCloseDialog = this._handleCardLockError({
          lockType: options.lockType,
          error: error
        });
        if (!needToCloseDialog) {
          return Promise.reject();
        }
      });
    },

    /**
     * this function is used when we are going to update fdn contacts under
     * call panel.
     *
     * @memberOf SimPinDialog
     * @access private
     * @return {Promise}
     */
    _updateFdnContact: function() {
      //  Updates a FDN contact. For some reason, `icc.updateContact` requires
      //  the  pin input value instead of delegating to `icc.setCardLock`.
      //  That means that, in case of failure, the error is different that the
      //  one that `icc.setCardLock` gives. This means that we have to handle
      //  it separatedly instead of being able to use the existing
      //  `handleCardLockError` above.
      //
      //  Among other things, it doesn't include the retryCount, so we can't
      //  tell the user how many remaining tries she has. What a mess.
      //  This should be solved when bug 1070941 is fixed.

      var fdnContact = this._pinOptions.fdnContact;
      return SimSecurity.updateContact(this._cardIndex, 'fdn', fdnContact,
        this._elements.pinInput.value).then(() => {
          return fdnContact;
      }, (error) => {
        switch (error.name) {
          case 'IncorrectPassword':
          case 'SimPin2':
            // TODO: count retries (not supported by the platform) ->
            // Bug 1070941
            this._initUI('get_pin2');
            this._showMessage('fdnErrorMsg');
            this._elements.pinInput.value = '';
            this._elements.pinInput.focus();
            return Promise.reject();

          case 'SimPuk2':
            this._initUI('unlock_puk2');
            this._elements.pukInput.focus();
            return Promise.reject();

          case 'NoFreeRecordFound':
            DialogService.alert('fdnNoFDNFreeRecord');
            return fdnContact;

          default:
            console.error('Could not edit FDN contact on SIM card - ', error);
            return fdnContact;
        }
      });
    },

    /**
     * We will try to handle all returned errors here when requests are
     * returned from icc.
     *
     * @memberOf SimPinDialog
     * @param {Object} options
     * @param {String} options.lockType
     * @param {Object} options.error
     * @param {Number} options.error.retryCount
     * @param {String} options.error.name
     * @access private
     * @return {Boolean} - true means close dialog, others mean not
     */
    _handleCardLockError: function(options) {
      var error = options.error;
      var lockType = options.lockType;
      var retryCount = error.retryCount;
      var errorName = error.name;

      // expected: 'pin', 'fdn', 'puk'
      if (!lockType) {
        // we don't know what's going on here, we have close the dialog.
        console.error('`handleCardLockError` called without a lockType. ' +
          'This should never even happen.', error);
        return true;
      }

      switch (errorName) {
        case 'SimPuk2':
        case 'IncorrectPassword':
          return this._handleRetryPassword(lockType, retryCount);

        default:
          DialogService.alert('genericLockError');
          console.error('Error of type ' + errorName +
            ' happened coming from an IccCardLockError event', error);
          return true;
      }
    },

    /**
     * We will handle all retry cases here to make sure we can change to
     * the right UI for users to continue.
     *
     * @memberOf SimPinDialog
     * @param {String} lockType
     * @param {Number} retryCount
     * @access private
     * @return {Boolean} - true means close dialog, others mean not
     */
    _handleRetryPassword: function(lockType, retryCount) {
      // after three strikes, ask for PUK/PUK2
      if (retryCount <= 0) {
        if (lockType === 'pin') {
          // we leave this for system app, so let's close the dialog
          return true;
        } else if (lockType === 'fdn' || lockType === 'pin2') {
          this._initUI('unlock_puk2');
          this._elements.pukInput.focus();
          return false;
        } else {
          // out of PUK/PUK2: we're doomed
          DialogService.alert('genericLockError');
          return true;
        }
      } else {
        // We still have retryCount, let users input values again
        var msgId = (retryCount > 1) ? 'AttemptMsg3' : 'LastChanceMsg';
        this._showMessage(lockType + 'ErrorMsg', lockType + msgId, {
          n: retryCount
        });
        this._showRetryCount(retryCount);

        if (lockType === 'pin' || lockType === 'fdn') {
          this._elements.pinInput.value = '';
          this._elements.pinInput.focus();
        } else if (lockType === 'puk') {
          this._elements.pukInput.value = '';
          this._elements.pukInput.focus();
        } else if (lockType === 'puk2') {
          this._elements.pinInput.value = '';
          this._elements.pukInput.value = '';
          this._elements.pukInput.focus();
        }

        return false;
      }
    },

    /**
     * we will use `mode` to decide what kind of UI should be shown/hidden.
     *
     * @memberOf SimPinDialog
     * @param {String} mode
     * @access private
     */
    _setMode: function(mode) {
      this._elements.pinArea.hidden = (mode === 'puk');
      this._elements.pukArea.hidden = (mode !== 'puk');
      this._elements.newPinArea.hidden =
        this._elements.confirmPinArea.hidden = (mode === 'pin');
    },

    /**
     * We can show any message on the screen.
     *
     * @memberOf SimPinDialog
     * @param {String} headerL10nId
     * @param {String} bodyL10nId
     * @param {Object} args
     * @access private
     */
    _showMessage: function(headerL10nId, bodyL10nId, args) {
      if (!headerL10nId) {
        this._elements.errorMsg.hidden = true;
        return;
      }

      this._elements.errorMsgHeader.setAttribute('data-l10n-id', headerL10nId);
      this._localize(this._elements.errorMsgBody, bodyL10nId, args);
      this._elements.errorMsg.hidden = false;
    },

    /**
     * To hint users about how many times they can retry before the simcard
     * got locked.
     *
     * @memberOf SimPinDialog
     * @param {Number} retryCount
     * @access private
     */
    _showRetryCount: function(retryCount) {
      if (!retryCount) {
        this._elements.triesLeftMsg.hidden = true;
      } else {
        this._localize(this._elements.triesLeftMsg, 'inputCodeRetriesLeft', {
          n: retryCount
        });
        this._elements.triesLeftMsg.hidden = false;
      }
    },

    /**
     * bind onclick event on all inputs
     *
     * @memberOf SimPinDialog
     * @access private
     */
    _bindInputClickEvent: function() {
      var elements = this._elements;
      var inputs = [
        'pinInput',
        'pukInput',
        'newPinInput',
        'confirmPinInput'
      ];

      inputs.forEach((inputName) => {
        var input = elements[inputName];
        input.oninput = function() {
          elements.dialogDone.disabled = (this.value.length < 4);
        };
      });
    },

    /**
     * We will change the UI based on current lockType.
     *
     * @memberOf SimPinDialog
     * @access private
     */
    _initUI: function(method) {
      if (method) {
        this._method = method;
      }

      this._showMessage();
      this._showRetryCount(); // Clear the retry count at first
      this._elements.dialogDone.disabled = true;

      var lockType = 'pin'; // used to query the number of retries left
      switch (this._method) {
        // get PIN code
        case 'get_pin2':
          lockType = 'pin2';
          this._setMode('pin');
          this._localize(this._elements.pinArea.querySelector('div'),
            'simPin2');
          this._localize(this._elements.dialogTitle, lockType + 'Title');
          break;

        // unlock SIM
        case 'unlock_pin':
          this._setMode('pin');
          this._localize(this._elements.pinArea.querySelector('div'),
            'simPin');
          this._localize(this._elements.dialogTitle, 'pinTitle');
          break;

        case 'unlock_puk':
          lockType = 'puk';
          this._setMode('puk');
          this._showMessage('simCardLockedMsg', 'enterPukMsg');
          this._localize(this._elements.pukArea.querySelector('div'),
            'pukCode');
          this._localize(this._elements.dialogTitle, 'pukTitle');
          break;

        case 'unlock_puk2':
          lockType = 'puk2';
          this._setMode('puk');
          this._showMessage('simCardLockedMsg', 'enterPuk2Msg');
          this._localize(this._elements.pukArea.querySelector('div'),
            'puk2Code');
          this._localize(this._elements.dialogTitle, 'puk2Title');
          this._localize(this._elements.newPinArea.querySelector('div'),
            'newSimPin2Msg');
          this._localize(this._elements.confirmPinArea.querySelector('div'),
            'confirmNewSimPin2Msg');
          break;

        // PIN lock
        case 'enable_lock':
          this._setMode('pin');
          this._localize(this._elements.pinArea.querySelector('div'),
            'simPin');
          this._localize(this._elements.dialogTitle, 'pinTitle');
          break;

        case 'disable_lock':
          this._setMode('pin');
          this._localize(this._elements.pinArea.querySelector('div'),
            'simPin');
          this._localize(this._elements.dialogTitle, 'pinTitle');
          break;

        case 'change_pin':
          this._setMode('new');
          this._localize(this._elements.pinArea.querySelector('div'),
            'simPin');
          this._localize(this._elements.newPinArea.querySelector('div'),
            'newSimPinMsg');
          this._localize(this._elements.confirmPinArea.querySelector('div'),
            'confirmNewSimPinMsg');
          this._localize(this._elements.dialogTitle, 'newpinTitle');
          break;

        // FDN lock (PIN2)
        case 'enable_fdn':
          lockType = 'pin2';
          this._setMode('pin');
          this._localize(this._elements.pinArea.querySelector('div'),
            'simPin2');
          this._localize(this._elements.dialogTitle, 'fdnEnable');
          break;

        case 'disable_fdn':
          lockType = 'pin2';
          this._setMode('pin');
          this._localize(this._elements.pinArea.querySelector('div'),
            'simPin2');
          this._localize(this._elements.dialogTitle, 'fdnDisable');
          break;

        case 'change_pin2':
          lockType = 'pin2';
          this._setMode('new');
          this._localize(this._elements.pinArea.querySelector('div'),
            'simPin2');
          this._localize(this._elements.newPinArea.querySelector('div'),
            'newSimPin2Msg');
          this._localize(this._elements.confirmPinArea.querySelector('div'),
            'confirmNewSimPin2Msg');
          this._localize(this._elements.dialogTitle, 'fdnReset');
          break;

        // unsupported
        default:
          console.error('unsupported "' + this._method + '" method');
          break;
      }

      // display the number of remaining retries if necessary
      // XXX this only works with the emulator
      // (and some commercial RIL stacks...)
      // https://bugzilla.mozilla.org/show_bug.cgi?id=905173
      SimSecurity.getCardLockRetryCount(this._cardIndex, lockType)
        .then((result) => {
          var retryCount = result.retryCount;
          if (retryCount === this._allowedRetryCounts[lockType]) {
            // hide the retry count if users had not input incorrect codes
            retryCount = null;
          }
          this._showRetryCount(retryCount);
      });
    }
  };

  return function ctor_simPinDialog(elements) {
    return new SimPinDialog(elements);
  };
});
