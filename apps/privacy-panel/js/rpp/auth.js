/**
 * Auth panels (login/register/change passphrase).
 * 
 * @module AuthPanel
 * @return {Object}
 */
define([
  'panels',
  'rpp/passphrase',
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
     * Initialize RPP panel and all its sections
     * 
     * @method init
     * @constructor
     */
    init: function() {
      this.mainPanel = document.getElementById('rpp-main');
      this.changePanel = document.getElementById('rpp-change-pass');
      this.loginForm = document.getElementById('rpp-login-form');
      this.registerForm = document.getElementById('rpp-register-form');
      this.changeForm = document.getElementById('rpp-change-pass-form');

      this.passphrase = new PassPhrase('rppmac', 'rppsalt');

      // Define first time use to eventualy show register page
      this.defineFTU();
      this.getSIMCards();
      this.fillChangeOptions();

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
          this.lsPasscodeEnabled = value;

          // Each time user decides to disable passcode, show him that he can't
          // use rpp features.
          this.toggleAlertBox();
          this.fillChangeOptions();
        }.bind(this)
      );
    },

    /**
     * Defines whenever we can login to rpp setting or do we need to register
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
          select.appendChild(element);
        }
      }

      if (this.lsPasscodeEnabled) {
        element = document.createElement('option');
        element.value = 'passcode';
        element.setAttribute('data-l10n-id', 'rpp-passcode-type');
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
      var rgx = /^([0-9]{1,4})$/i;

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
     * Register new user so he can use all rpp features.
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
        panels.show({ id: 'rpp-features' });
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
     * Login user to rpp panel
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

        panels.show({ id: 'rpp-features' });
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
      var form    = this.changeForm;
      var pin     = form.querySelector('.pin').value;
      var pass1   = form.querySelector('.pass1').value;
      var pass2   = form.querySelector('.pass2').value;
      var type    = form.querySelector('.pin-type').value;
      var passmsg = form.querySelector('.validation-message');
      var pinmsg  = form.querySelector('.pin-validation-message');
      var passError;

      event.preventDefault();

      passmsg.textContent = '';
      pinmsg.textContent = '';

      var resultCallback = function(pinError) {
        if (pinError) {
          pinmsg.setAttribute('data-l10n-id', pinError);
          return;
        }

        passError = this.comparePasswords(pass1, pass2);
        if (passError) {
          passmsg.setAttribute('data-l10n-id', passError);
          return;
        }

        this.passphrase.change(pass1).then(function() {
          panels.show({ id: 'rpp-features' });
        });
      }.bind(this);

      if (type === 'passcode') {
        this.verifyPassCode(pin, resultCallback);
      } else {
        this.verifySIMPIN(this.simcards[type], pin, resultCallback);
      }
    },

    verifySIMPIN: function(simcard, pin, callback) {
      var unlock = simcard.unlockCardLock({ lockType : 'pin', pin: pin });
      unlock.onsuccess = callback.bind(this, '');
      unlock.onerror = callback.bind(this, 'sim-invalid');
    },

    verifyPassCode: function(pin, callback) {
      var status = this.comparePINs(pin, this.lsPasscode);
      callback = callback || function() {};

      callback(status);
    },

    /**
     * Clear form and validation messages
     * 
     * @method clearChangeForm
     */
    clearChangeForm: function() {
      var form    = this.changeForm;
      var passmsg = form.querySelector('.validation-message');
      var pinmsg  = form.querySelector('.pin-validation-message');

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
      var modal = document.querySelector('#rpp-features .overlay');

      if (this.lsPasscodeEnabled) {
        modal.setAttribute('hidden', 'hidden');
      } else {
        modal.removeAttribute('hidden');
      }
    }

  };

  return new AuthPanel();

});
