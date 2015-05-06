/**
 * Auth panels (login/register/change passphrase).
 *
 * @module AuthPanel
 * @return {Object}
 */
define([
  'panels',
  'rp/passphrase',
  'shared/settings_listener'
],

function(panels, PassPhrase, SettingsListener) {
  'use strict';

  function AuthPanel() {
    this.passphrase;
    this.lsPasscode = false;
    this.lsPasscodeEnabled = false;
    this.simcards = null;
  }

  AuthPanel.prototype = {

    /**
     * Initialize RP panel and all its sections
     *
     * @method init
     * @constructor
     */
    init: function() {
      this.mainPanel = document.getElementById('rp-main');
      this.changePanel = document.getElementById('rp-change-pass');
      this.loginForm = document.getElementById('rp-login-form');
      this.registerForm = document.getElementById('rp-register-form');
      this.changeForm = document.getElementById('rp-change-pass-form');

      this.passphrase = new PassPhrase('rpmac', 'rpsalt');

      // Define first time use to eventualy show register page
      this.defineFTU();
      this.getSIMCards();

      this.observers();
      this.events();
    },

    events: function() {
      // Submit events
      this.loginForm.addEventListener('submit',
        this.loginUser.bind(this));
      this.registerForm.addEventListener('submit',
        this.registerUser.bind(this));
      this.changeForm.addEventListener('submit',
        this.changePassphrase.bind(this));

      // On show events
      this.mainPanel.addEventListener('pagerendered', function() {
        this.clearLoginForm();
        this.clearRegisterForm();
      }.bind(this));
      this.changePanel.addEventListener('pagerendered', function() {
        this.clearChangeForm();
      }.bind(this));

      this.changeForm.querySelector('.pin-type').addEventListener('change',
        this.onPinTypeChange.bind(this));
    },

    observers: function() {
      SettingsListener.observe('lockscreen.passcode-lock.code', false,
        function(value) {
          this.lsPasscode = value;
        }.bind(this)
      );

      SettingsListener.observe('lockscreen.passcode-lock.enabled', false,
        function(value) {
          /* global Event */
          this.lsPasscodeEnabled = value;

          // Each time user decides to disable passcode, show him that he can't
          // use rp features.
          this.toggleAlertBox();
          this.fillChangeOptions();
          this.changePanel.querySelector('.pin-type')
            .dispatchEvent(new Event('change'));
        }.bind(this)
      );
    },

    /**
     * Defines whenever we can login to rp setting or do we need to register
     * new passphrase.
     *
     * @method defineFTU
     */
    defineFTU: function() {
      this.passphrase.exists().then(function(status) {
        this.mainPanel.dataset.loginBox = status;
      }.bind(this));
    },

    /**
     * [getSIMStatus description]
     * @return {[type]} [description]
     */
    getSIMCards: function() {
      var mc = navigator.mozMobileConnections;

      if (!mc) {
        return;
      }

      [].forEach.call(mc, function(connection, key) {
        var icc, label;
        if (connection.iccId) {
          icc = navigator.mozIccManager.getIccById(connection.iccId);
          if (icc.cardState === 'ready') {
            label = 'SIM ' + (key + 1);
            this.simcards = this.simcards ? this.simcards : {};
            this.simcards[label] = icc;
          }
        }
      }.bind(this));
    },

    fillChangeOptions: function() {
      var element, select = this.changePanel.querySelector('.pin-type');
      select.innerHTML = '';

      for (var simcard in this.simcards) {
        if (this.simcards.hasOwnProperty(simcard)) {
          element = document.createElement('option');
          element.value = simcard;
          element.textContent = simcard;

          var simcardL10n = simcard.toLowerCase().replace(' ', '');
          element.setAttribute('data-l10n-id', simcardL10n);
          select.appendChild(element);
        }
      }

      if (this.lsPasscodeEnabled) {
        element = document.createElement('option');
        element.value = 'passcode';
        element.setAttribute('data-l10n-id', 'passcode');
        select.appendChild(element);
      }
    },

    onPinTypeChange: function(event) {
      var value = event.target.value.toString();
      var input = this.changeForm.querySelector('.pin');

      value = 'enter-' + value.toLowerCase().replace(' ', '');
      input.setAttribute('data-l10n-id', value);
    },

    /**
     * Compares and validates two strings. Returns error strings.
     *
     * @param  {String} pass1 First password
     * @param  {String} pass2 Second password
     * @return {String}       Empty string when success
     */
    comparePasswords: function(pass1, pass2) {
      var rgx = /^([a-z0-9]+)$/i;

      if (!pass1) {
        return 'passphrase-empty';
      }

      if (pass1.length > 100) {
        return 'passphrase-too-long';
      }

      if (!rgx.test(pass1)) {
        return 'passphrase-invalid';
      }

      if (pass1 !== pass2) {
        return 'passphrase-different';
      }

      return '';
    },

    /**
     * Compares and validates two strings. Returns error strings.
     *
     * @param  {String} pass1 First password
     * @param  {String} pass2 Second password
     * @return {String}       Empty string when success
     */
    comparePINs: function(pass1, pass2) {
      var rgx = /^([0-9]{1,8})$/i;

      if (!pass1) {
        return 'pin-empty';
      }

      if (!rgx.test(pass1)) {
        return 'pin-invalid';
      }

      if (pass1 !== pass2) {
        return 'pin-different';
      }

      return '';
    },

    /**
     * Register new user so he can use all rp features.
     *
     * @method registerUser
     * @param {Object} event JavaScript event
     */
    registerUser: function(event) {
      var form    = this.registerForm;
      var pass1   = form.querySelector('.pass1').value;
      var pass2   = form.querySelector('.pass2').value;
      var message = form.querySelector('.validation-message');
      var error;

      event.preventDefault();

      error = this.comparePasswords(pass1, pass2);
      if (error) {
        message.setAttribute('data-l10n-id', error);
        return;
      }

      this.passphrase.change(pass1).then(function() {
        panels.show({ id: 'rp-features' });
        this.defineFTU();
      }.bind(this));
    },

    /**
     * Clear form and validation messages
     *
     * @method clearRegisterForm
     */
    clearRegisterForm: function() {
      var form    = this.registerForm;
      var message = form.querySelector('.validation-message');

      form.reset();
      message.textContent = '';
    },

    /**
     * Login user to rp panel
     *
     * @method loginUser
     * @param {Object} event JavaScript event
     */
    loginUser: function(event) {
      var form    = this.loginForm;
      var pass    = form.querySelector('.pass1').value;
      var message = form.querySelector('.validation-message');

      event.preventDefault();

      this.passphrase.verify(pass).then(function(status) {
        if (!status) {
          message.setAttribute('data-l10n-id', 'passphrase-wrong');
          return;
        }

        panels.show({ id: 'rp-features' });
      }.bind(this));
    },

    /**
     * Clear form and validation messages
     *
     * @method clearLoginForm
     */
    clearLoginForm: function() {
      var form    = this.loginForm;
      var message = form.querySelector('.validation-message');

      form.reset();
      message.textContent = '';
    },

    /**
     * Change passphrase.
     *
     * @method changePassphrase
     * @param {Object} event JavaScript event
     */
    changePassphrase: function(event) {
      var form = this.changeForm;
      var pin  = form.querySelector('.pin').value;
      var type = form.querySelector('.pin-type').value;

      event.preventDefault();

      if (type === 'passcode') {
        this.verifyPassCode(pin);
      } else {
        this.verifySIMPIN(this.simcards[type], pin);
      }
    },

    changePIN: function(pinError, retryCount) {
      var form    = this.changeForm;
      var pass1   = form.querySelector('.pass1').value;
      var pass2   = form.querySelector('.pass2').value;
      var passmsg = form.querySelector('.validation-message');
      var pinmsg  = form.querySelector('.pin-error-message');
      var pintry  = form.querySelector('.pin-tries-left');
      var passError;

      passmsg.textContent = '';
      pinmsg.textContent = '';
      pintry.textContent = '';

      if (pinError) {
        pinmsg.setAttribute('data-l10n-id', pinError);
        if (pinError === 'sim-invalid') {
          navigator.mozL10n.setAttributes(pintry, 'pin-tries-left', {
            n: retryCount
          });
          pintry.hidden = !retryCount;
        }
        return;
      }

      pintry.hidden = true;

      passError = this.comparePasswords(pass1, pass2);
      if (passError) {
        passmsg.setAttribute('data-l10n-id', passError);
        return;
      }

      this.passphrase.change(pass1).then(function() {
        panels.show({ id: 'rp-features' });
      });
    },

    verifySIMPIN: function(simcard, pin) {
      var unlock = simcard.unlockCardLock({ lockType : 'pin', pin: pin });
      unlock.onsuccess = () => this.changePIN();
      unlock.onerror   = () => this.changePIN('sim-invalid',
                                              unlock.error.retryCount);
    },

    verifyPassCode: function(pin) {
      var status = (pin.length > 4) ? 'passcode-long' :
                                      this.comparePINs(pin, this.lsPasscode);
      this.changePIN(status);
    },

    /**
     * Clear form and validation messages
     *
     * @method clearChangeForm
     */
    clearChangeForm: function() {
      var form    = this.changeForm;
      var passmsg = form.querySelector('.validation-message');
      var pinmsg  = form.querySelector('.pin-error-message');

      form.reset();
      passmsg.textContent = '';
      pinmsg.textContent = '';
    },

    /**
     * Toggle alert box, show it when user doesn't have passcode enabled
     *
     * @method toggleAlertBox
     */
    toggleAlertBox: function() {
      var modal = document.querySelector('#rp-features .overlay');

      if (this.lsPasscodeEnabled) {
        modal.setAttribute('hidden', 'hidden');
      } else {
        modal.removeAttribute('hidden');
      }
    }

  };

  return new AuthPanel();

});
