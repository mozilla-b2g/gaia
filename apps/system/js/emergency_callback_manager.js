/* global LazyLoader, EmergencyCallbackIcon, BaseModule, UtilityTray */
'use strict';

(function() {
/*
 * This emergency callback mode manager is for:
 * - Initialize the manager if network type is cdma and regist an event handler
 *   for emergency callback mode change.
 * - Display a notification to showing the system is entered the callback
 *    mode with count down timer.
 * - Popup a dialog for user to notify the mode will block data network and
 *   let user decide callback mode should exit or not.
 *
 */

  var EmergencyCallbackManager = function(core) {
    if (core && core.mobileConnections) {
      this._conn = core.mobileConnections[0];
    }
  };
  BaseModule.create(EmergencyCallbackManager, {
    name: 'EmergencyCallbackManager',
    timer: 0,
    timeoutController: null,
    TOASTER_TIMEOUT: 2000,
    EVENT_PREFIX: 'emergencycallback',

    notification: null,
    message: null,
    toaster: null,
    toasterMessage: null,
    warningDialog: null,
    okButton: null,
    cancelButton: null,
    /**
     * Indicates the emergency callback state
     * @type {Boolean}
     */
    active: false,

    _start: function ecm_init() {
      // Dom elements
      this.notification =
        document.getElementById('emergency-callback-notification');
      this.message = this.notification.querySelector('.title-container');
      this.notificationTimer = this.notification.querySelector('.timer');

      this.toaster = document.getElementById('emergency-callback-toaster');
      this.toasterMessage = this.toaster.querySelector('.message');
      this.toasterTimer = this.toaster.querySelector('.timer');

      this.warningDialog = document.getElementById('emergency-callback-dialog');
      this.dialogTimer = this.warningDialog.querySelector('small');
      this.okButton = document.getElementById('emergency-callback-exit-button');
      this.cancelButton =
        document.getElementById('emergency-callback-stay-button');
      this.warningTimer = this.warningDialog.querySelector('p');

      LazyLoader.load(['js/emergency_callback_icon.js']).then(function() {
        this.icon = new EmergencyCallbackIcon(this);
        this.icon.start();
      }.bind(this))['catch'](function(err) { // XXX: workaround gjslint
        console.error(err);
      });

      // Event handler
      this._conn.addEventListener('emergencycbmodechange',
        this.onEmergencyCbModeChange.bind(this));
      this.notification.addEventListener('click',
        this.notificationClicked.bind(this));
      this.toaster.addEventListener('click', this.toasterClicked.bind(this));
      this.okButton.addEventListener('click',
        this.exitEmergencyCbMode.bind(this));
      this.cancelButton.addEventListener('click', this.cancelPrompt.bind(this));
    },

    exitEmergencyCbMode: function ecm_exitEmergencyCbMode() {
      this.warningDialog.classList.remove('visible');
      this.warningDialog.hidden = true;
      this._conn.exitEmergencyCbMode();
    },

    notificationClicked: function ecm_notificationClicker() {
      this.showEmergencyCbPrompt();
      UtilityTray.hide();
    },

    toasterClicked: function ecm_toasterClicker() {
      this.showEmergencyCbPrompt();
      this.toaster.classList.remove('displayed');
      this.toaster.hidden = true;
    },

    showEmergencyCbPrompt: function ecm_showEmergencyCbPrompt() {
      // Add home key event handler to dismiss the prompt if home is pressed
      // while prompt displayed.
      var self = this;
      window.addEventListener('home', function hidePrompt() {
        window.removeEventListener('home', hidePrompt);
        self.cancelPrompt();
      });
      this.warningDialog.classList.add('visible');
      this.warningDialog.hidden = false;
    },

    cancelPrompt: function ecm_cancelPrompt() {
      this.warningDialog.classList.remove('visible');
      this.warningDialog.hidden = true;
    },

    displayNotificationAndToaster: function() {
      this.displayNotificationIfHidden();
      this.toasterTimer.textContent = this.timerString;
      this.toaster.classList.add('displayed');
      this.toaster.hidden = false;
      setTimeout(function waitToHide() {
        this.toaster.classList.remove('displayed');
        this.toaster.hidden = true;
      }.bind(this), this.TOASTER_TIMEOUT);
    },

    hideNotificationIfDisplayed: function() {
      if (this.notification.classList.contains('displayed')) {
        this.notification.classList.remove('displayed');
        this.notification.hidden = true;
        this.publish('statechanged', false);
      }
    },

    displayNotificationIfHidden: function() {
      if (!this.notification.classList.contains('displayed')) {
        this.notification.classList.add('displayed');
        this.notification.hidden = false;
        this.publish('statechanged', true);
      }
    },

    updateTimer: function ecm_updateTimer() {
      this.timer -= 1000;
      if (this.timer < 0) {
        window.clearInterval(this.timeoutController);
        this.timeoutController = null;
        return;
      }

      this.notificationTimer.textContent = this.dialogTimer.textContent =
        this.timerString;
    },

    onDataError: function(evt) {
      // TODO: We shold be able to confirm the error is caused by
      //       emergency callback mode before showing prompt.
      this.showEmergencyCbPrompt();
    },

    onEmergencyCbModeChange: function(evt) {
      var active = evt.active;
      this.active = active;
      this.icon && this.icon.update();
      if (active) {
        if (this.timeoutController) {
          window.clearInterval(this.timeoutController);
        }
        this.timer = evt.timeoutMs;
        this.displayNotificationAndToaster();
        this.timeoutController =
          window.setInterval(this.updateTimer.bind(this), 1000);
        this._conn.ondataerror = this.onDataError.bind(this);
      } else {
        this.hideNotificationIfDisplayed();
        this.warningDialog.classList.remove('visible');
        this.warningDialog.hidden = true;
        window.clearInterval(this.timeoutController);
        this.timeoutController = null;
        this._conn.ondataerror = null;
      }
    }
  }, {
    timerString: {
      configurable: false,
      get: function() {
        var totalSec = this.timer / 1000;
        var min = Math.floor(totalSec / 60);
        var secString = (totalSec % 60).toString();
        var sec = secString.length > 1 ? secString : '0' + secString;
        return (min + ':' + sec);
      }
    }
  });
}());
