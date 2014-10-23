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
        if (status) {
          this.displayLoginBox();
        } else {
          this.displayRegisterBox();
        }
      }.bind(this));
    },

    /**
     * Each time we enters rpp panel we need to login to be able to change rpp
     * settings.
     * 
     * @method displayLoginBox
     */
    displayLoginBox: function() {
      this.mainPanel.querySelector('#rpp-login').style.display = 'block';
      this.mainPanel.querySelector('#rpp-register').style.display = 'none';
    },

    /**
     * When user is using rpp for the first time, he needs to register to be
     * able to use all rpp functions.
     * 
     * @method displayRegisterBox
     */
    displayRegisterBox: function() {
      this.mainPanel.querySelector('#rpp-login').style.display = 'none';
      this.mainPanel.querySelector('#rpp-register').style.display = 'block';
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

      if ( ! pass1) {
        return 'passphrase-empty';
      }

      if (pass1.length > 100) {
        return 'passphrase-too-long';
      }

      if ( ! rgx.test(pass1)) {
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

      if ( ! pass1) {
        return 'pin-empty';
      }

      if ( ! rgx.test(pass1)) {
        return 'pin-invalid'; 
      }

      if (pass1 !== pass2) {
        return 'pin-different';
      }

      return '';
    },

    /**
     * Give translated error message.
     * 
     * @param  {String} key
     * @return {String} Error message
     */
    errorMessage: function(key) {
      return navigator.mozL10n.get(key) || key;
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
        message.textContent = this.errorMessage(error);
        return;
      }

      this.clearRegisterForm();
      this.passphrase.change(pass1).then(function() {
        panels.show({ id: 'rpp-features' });
      });
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
        if ( ! status) {
          message.textContent = this.errorMessage('passphrase-wrong');
          return;
        }

        this.clearLoginForm();

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
     * Validate lockscreen passcode or SIM PIN to be able to change passphrase.
     *
     * @method changePassphrase
     * @param {Object} event JavaScript event
     */
    validatePINs: function(pin, callback) {
      var error;

      // Start with trying to compare pin with passcode.
      error = this.comparePINs(pin, this.lsPasscode);
      if (error) {

        if (error !== 'pin-different') {
          callback(error);
          return;
        }

        // If passcode failed, try SIM PIN instead.
        this.validateSIMPIN(pin, error, callback);
      } else {
        callback();
      }
    },

    /**
     * Validate lockscreen passcode or SIM PIN to be able to change passphrase.
     *
     * @method changePassphrase
     * @param {Object} event JavaScript event
     */
    validateSIMPIN: function(pin, previous_error, callback) {
      var icc, unlock, mc = navigator.mozMobileConnections;

      if ( ! mc || mc.length === 0) {
        callback(previous_error);
        return;
      }

      for (var sim in mc) {
        if (mc.hasOwnProperty(sim) && mc[sim].iccId) {
          icc = navigator.mozIccManager.getIccById(mc[sim].iccId);
          unlock = icc.unlockCardLock({ lockType : 'pin', pin: pin });
          unlock.onsuccess = callback.bind(this, '');
          unlock.onerror = callback.bind(this, 'sim-invalid');
        }
      }
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
      var passmsg = form.querySelector('.validation-message');
      var pinmsg  = form.querySelector('.pin-validation-message');

      event.preventDefault();

      passmsg.textContent = '';
      pinmsg.textContent = '';

      // Start with trying to compare pin with passcode.
      this.validatePINs(pin, function(errkey) {
        var passError;

        if (errkey) {
          pinmsg.textContent = this.errorMessage(errkey);
          return;
        }

        passError = this.comparePasswords(pass1, pass2);
        if (passError) {
          passmsg.textContent = this.errorMessage(passError);
          return;
        }

        this.clearChangeForm();
        this.passphrase.change(pass1).then(function() {
          panels.show({ id: 'rpp-features' });
        });
      }.bind(this));
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
