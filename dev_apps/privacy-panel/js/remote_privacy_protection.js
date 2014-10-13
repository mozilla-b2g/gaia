/* global Crypto */
/* global LoadHelper */
  'use strict';

var RemotePrivacyProtection = (function() {

  var RPP = function() {};

  RPP.prototype = {
    isInitialized: false,
    settings: window.navigator.mozSettings,

    init: function() {
      if (this.isInitialized) {
        this.showRPPBox();
        return;
      }

      if ( ! this.settings) {
        return;
      }

      this.$RPP = document.getElementById('remote-privacy-protection');

      this.elements = {
        $boxes:       this.$RPP.querySelectorAll('.rpp-box'),
        $content:     document.getElementById('rpp-content'),
        $newPass:     document.getElementById('rpp-new-password'),
        $login:       document.getElementById('rpp-login'),
        $changePass:  document.getElementById('rpp-change-password'),
        RemoteLocate: {
          $box:       this.$RPP.querySelector('.remote-locate'),
          $input:     this.$RPP.querySelector('.remote-locate input')
        },
        RemoteRing: {
          $box:       this.$RPP.querySelector('.remote-ring'),
          $input:     this.$RPP.querySelector('.remote-ring input')
        },
        RemoteLock: {
          $box:       this.$RPP.querySelector('.remote-lock'),
          $input:     this.$RPP.querySelector('.remote-lock input')
        },
        $backToRootLink: this.$RPP.querySelector('.back-to-root'),
        $backToLoginLink: this.$RPP.querySelector('.back-to-login')
      };

      this.constants = {
        minPassLength: 1,
        maxPassLength: 10
      };

      // get settings
      window.SettingsListener.observe('lockscreen.enabled', false,
        function(value) {
          this.lockScreenEnabled = value;
          this.toggleModalBox();
        }.bind(this)
      );

      window.SettingsListener.observe('lockscreen.passcode-lock.enabled', false,
        function(value) {
          this.lockScreenPasswordEnabled = value;
          this.toggleModalBox();
        }.bind(this)
      );

      window.SettingsListener.observe('lockscreen.passcode-lock.code', false,
        function(value) {
          this.lockScreenPassword = value;
        }.bind(this)
      );


      // event listeners
      this.elements.$newPass.querySelector('button.rpp-new-password-ok')
        .addEventListener('click', this.savePassword.bind(this));
      this.elements.$login.querySelector('button.rpp-login-ok')
        .addEventListener('click', this.login.bind(this));
      this.elements.$login.querySelector('a.change-password-link')
        .addEventListener('click', this.showChangePassBox.bind(this));
      this.elements.$changePass.querySelector('button.rpp-change-password-ok')
        .addEventListener('click', this.changePassword.bind(this));
      this.elements.RemoteLocate.$input.addEventListener('change',
        function(event) { this.toggleRemoteLocate(event.target.checked); }
          .bind(this));
      this.elements.RemoteRing.$input.addEventListener('change',
        function(event) { this.toggleRemoteRing(event.target.checked); }
          .bind(this));
      this.elements.RemoteLock.$input.addEventListener('change',
        function(event) { this.toggleRemoteLock(event.target.checked); }
          .bind(this));
      this.elements.$backToLoginLink.addEventListener('click',
        this.backToLogin.bind(this));

      document.getElementById('launch-settings').addEventListener('click',
        function() {
          window.SettingApp.launchSettings();
        }
      );

      this.isInitialized = true;

      // show initial view
      this.showRPPBox();
    },


    /**
     * Show RPP box (new password or login form)
     */
    showRPPBox: function() {
      // Get current passphrase and display proper screen
      var status = this.settings.createLock().get('rpp.password');
      status.onsuccess = function() {
        var password = status.result['rpp.password'];

        this.hideRPPBoxes();
        if (password) {
          this.resetLogindForm();
          this.elements.$login.classList.add('active-box');
        } else {
          this.resetNewPasswordForm();
          this.elements.$newPass.classList.add('active-box');
        }
      }.bind(this);
    },

    toggleModalBox: function(value) {
      var modal = this.elements.$content.querySelector('.overlay');;

      if ( ! this.lockScreenEnabled || ! this.lockScreenPasswordEnabled) {
        modal.removeAttribute('hidden');

        // this.elements.RemoteLocate.$input.checked = false;
        // this.elements.RemoteRing.$input.checked = false;
        // this.elements.RemoteLock.$input.checked = false;

        this.elements.RemoteLocate.$box.style.display = 'block';
        this.elements.RemoteRing.$box.style.display = 'block';
        this.elements.RemoteLock.$box.style.display = 'block';
      } else {
        modal.setAttribute('hidden', 'hidden');
      }
    },

    /**
     * Show RPP content
     */
    showRPPContent: function() {
      

      this.hideRPPBoxes();
      this.elements.$content.classList.add('active-box');

      this.showBackToRootButton();

      // get Remote Locate value from settings
      var status1 = this.settings.createLock().get('rpp.locate.enabled');
      status1.onsuccess = function() {
        this.elements.RemoteLocate.$input.checked =
          (status1.result['rpp.locate.enabled'] === true);
        this.elements.RemoteLocate.$box.style.display = 'block';
      }.bind(this);

      // get Remote Ring value from settings
      var status2 = this.settings.createLock().get('rpp.ring.enabled');
      status2.onsuccess = function() {
        this.elements.RemoteRing.$input.checked =
          (status2.result['rpp.ring.enabled'] === true);
        this.elements.RemoteRing.$box.style.display = 'block';
      }.bind(this);

      // get Remote Lock value from settings
      var status3 = this.settings.createLock().get('rpp.lock.enabled');
      status3.onsuccess = function() {
        this.elements.RemoteLock.$input.checked =
          (status3.result['rpp.lock.enabled'] === true);
        this.elements.RemoteLock.$box.style.display = 'block';
      }.bind(this);
    },

    /**
     * Show change password box
     */
    showChangePassBox: function () {
      this.hideRPPBoxes();
      this.elements.$changePass.classList.add('active-box');

      this.resetChangePasswordForm();

      // show back-to-login button
      this.elements.$backToRootLink.style.display = 'none';
      this.elements.$backToLoginLink.style.display = 'block';
    },

    /**
     * Go back to login page
     */
    backToLogin: function() {
      // show back-to-root button
      this.showBackToRootButton();

      this.showRPPBox();
    },

    /**
     * Show back-to-root button
     */
    showBackToRootButton: function() {
      this.elements.$backToRootLink.style.display = 'block';
      this.elements.$backToLoginLink.style.display = 'none';
    },

    /**
     * Reset new password form
     */
    resetNewPasswordForm: function() {
      this.elements.$newPass.querySelector('.pass1').value = '';
      this.elements.$newPass.querySelector('.pass2').value = '';

      var $validationMessage =
        this.elements.$newPass.querySelector('.validation-message');
      $validationMessage.textContent = '';
      $validationMessage.style.display = 'none';
    },

    /**
     * Reset login form
     */
    resetLogindForm: function() {
      this.elements.$login.querySelector('.pass1').value = '';

      var $validationMessage =
        this.elements.$login.querySelector('.validation-message');
      $validationMessage.textContent = '';
      $validationMessage.style.display = 'none';
    },

    /**
     * Reset change password form
     */
    resetChangePasswordForm: function() {
      this.elements.$changePass.querySelector('.pin').value = '';
      this.elements.$changePass.querySelector('.pass1').value = '';
      this.elements.$changePass.querySelector('.pass2').value = '';

      var $validationMessage =
        this.elements.$changePass.querySelector('.validation-message');
      $validationMessage.textContent = '';
      $validationMessage.style.display = 'none';

      var $pinValidationMessage =
        this.elements.$changePass.querySelector('.pin-validation-message');
      $pinValidationMessage.textContent = '';
      $pinValidationMessage.style.display = 'none';
    },

    /**
     * Hide RPP boxes
     */
    hideRPPBoxes: function() {
      for (var $el of this.elements.$boxes) {
        $el.classList.remove('active-box');
      }
    },

    /**
     * Save new password
     */
    savePassword: function() {
      var pass1 = this.elements.$newPass.querySelector('.pass1').value,
          pass2 = this.elements.$newPass.querySelector('.pass2').value,
          passHash = Crypto.MD5(pass1).toString(),
          $validationMessage =
            this.elements.$newPass.querySelector('.validation-message');

      if ( ! pass1) {
        $validationMessage.textContent = 'Passphrase is empty!';
        $validationMessage.style.display = 'block';
      } else if (pass1.length > this.constants.maxPassLength) {
        $validationMessage.textContent = 'Passphrase is too long!';
        $validationMessage.style.display = 'block';
      } else if (pass1.length < this.constants.minPassLength) {
        $validationMessage.textContent = 'Passphrase is too short!';
        $validationMessage.style.display = 'block';
      } else if (pass1 !== pass2) {
        $validationMessage.textContent = 'Confirmation must match passphrase!';
        $validationMessage.style.display = 'block';
      } else {
        this.resetNewPasswordForm();

        this.savePasswordToSettings(passHash).bind(this);
      }
    },

    /**
     * Login to RPP
     */
    login: function() {
      var pass = this.elements.$login.querySelector('.pass1').value,
        passHash = Crypto.MD5(pass).toString(),
        $validationMessage =
          this.elements.$login.querySelector('.validation-message'),
        password,
        status = this.settings.createLock().get('rpp.password');

      status.onsuccess = function() {
        password = status.result['rpp.password'];

        if (password === passHash) {
          this.resetLogindForm();

          this.showRPPContent();
        } else {
          // passwords are valid
          $validationMessage.textContent = 'Passphrase is wrong!';
          $validationMessage.style.display = 'block';
        }
      }.bind(this);
    },

    /**
     * Change password
     */
    changePassword: function () {
      var pin = this.elements.$changePass.querySelector('.pin').value,
        pass1 = this.elements.$changePass.querySelector('.pass1').value,
        pass2 = this.elements.$changePass.querySelector('.pass2').value,
        passHash = Crypto.MD5(pass1).toString();

      // reset validation messages
      var $validationMessage =
        this.elements.$changePass.querySelector('.validation-message');
      $validationMessage.textContent = '';
      $validationMessage.style.display = 'none';

      var $pinValidationMessage =
        this.elements.$changePass.querySelector('.pin-validation-message');
      $pinValidationMessage.textContent = '';
      $pinValidationMessage.style.display = 'none';

      // validate
      if ( ! pass1) {
        $validationMessage.textContent = 'Passphrase is empty!';
        $validationMessage.style.display = 'block';
      }
      else if (pass1.length > this.constants.maxPassLength) {
        $validationMessage.textContent = 'Passphrase is too long!';
        $validationMessage.style.display = 'block';
      } else if (pass1.length < this.constants.minPassLength) {
        $validationMessage.textContent = 'Passphrase is too short!';
        $validationMessage.style.display = 'block';
      } else if (pass1 !== pass2) {
        $validationMessage.textContent = 'Confirmation must match passphrase!';
        $validationMessage.style.display = 'block';
      } else if ( ! pin) {
        $pinValidationMessage.textContent = 'Passcode lock/SIM PIN is empty!';
        $pinValidationMessage.style.display = 'block';
      } else if (pin.length !== 4) {
        $pinValidationMessage.textContent = 'Wrong Passcode lock/SIM PIN!';
        $pinValidationMessage.style.display = 'block';
      } else {

        if (this.lockScreenEnabled && this.lockScreenPasswordEnabled &&
          pin === this.lockScreenPassword) {

          this.savePasswordToSettings(passHash);
          return;
        } else {

          var mobileConnections = navigator.mozMobileConnections;
          for (var i in mobileConnections) {

            var mobileConnection = mobileConnections[i];

            if (mobileConnection) {
              var icc =
                navigator.mozIccManager.getIccById(mobileConnection.iccId);

              if (icc) {
                var unlockOptions = {};
                unlockOptions.lockType = 'pin';
                unlockOptions.pin = pin;

                var unlock = icc.unlockCardLock(unlockOptions);
                unlock.onsuccess =
                  this.savePasswordToSettings.bind(this, passHash);
              }
            }
          }
        }

        $pinValidationMessage.textContent = 'Wrong Passcode lock/SIM PIN!';
        $pinValidationMessage.style.display = 'block';
      }
    },

    /**
     * Save password to settings
     * @param passHash
     */
    savePasswordToSettings: function(passHash) {
      // saving password
      this.settings.createLock().set({ 'rpp.password': passHash });

      // show RPP content
      this.showRPPContent();
    },

    /**
     * Save Remote Locate value
     * @param {Boolean} value
     */
    toggleRemoteLocate: function(value) {
      this.settings.createLock().set({ 'rpp.locate.enabled': value });
    },

    /**
     * Save Remote Ring value
     * @param {Boolean} value
     */
    toggleRemoteRing: function(value) {
      this.settings.createLock().set({ 'rpp.ring.enabled': value });
    },

    /**
     * Save Remote Lock value
     * @param {Boolean} value
     */
    toggleRemoteLock: function(value) {
      this.settings.createLock().set({ 'rpp.lock.enabled': value });
    }
  };


  // main event listner on menu option
  document.getElementById('menu-item-rpp').addEventListener('click', function(){
    window.LazyLoader.load(
      [
        document.getElementById('remote-privacy-protection')
      ],
      function() {
        document.getElementById('root').style.display = 'none';
        document
          .getElementById('remote-privacy-protection').style.display = 'block';

        var sections = document.querySelectorAll('section[data-section="rpp"]');
        LoadHelper.registerEvents(sections);

        RemotePrivacyProtection.init();
      }
    );
  });


  return new RPP();
})();
