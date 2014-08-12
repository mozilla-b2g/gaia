'use strict';

(function(exports) {
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

  var EmergencyCallbackManager = function(mobileConnections) {
    this._conn = mobileConnections[0];
  };
  System.create(EmergencyCallbackManager, {
    timerString: {
      configurable: false,
      get: function(){
        var totalSec = this.timer / 1000;
        var min = Math.floor(totalSec / 60);
        var secString = (totalSec % 60).toString();
        var sec = secString.length > 1 ? secString : '0' + secString;
        return (min + ':' + sec);
      }
    }
  }, {
    timer: 0,
    timeoutController: null,
    TOASTER_TIMEOUT: 2000,

    notification: null,
    message: null,
    toaster: null,
    toasterMessage: null,
    warningDialog: null,
    okButton: null,
    cancelButton: null,
    view: function() {
      return
      '<form id="emergency-callback-dialog" role="dialog" data-type="confirm" ' +
           ' data-z-index-level="emergency-callback-dialog" class="generic-dialog" hidden>' +
        '<section>' +
          '<h1 data-l10n-id="confirm">Confirm</h1>' +
          '<p id="emergency-callback-dialog-wrapper">' +
            '<img id="emergency-callback-icon"/>' +
            '<strong data-l10n-id="emergency-callback-mode">Emergency call back mode</strong>' +
            '<small id="emergency-callback-timer"></small>' +
          '</p>' +
          '<p data-l10n-id="emergency-callback-message">You can not make calls, send messages or go online because emergency callback mode is enabled. Would you like to turn it off?</p>' +
        '</section>' +
        '<menu data-items="2">' +
          '<button type="reset" id="emergency-callback-stay-button" data-l10n-id="cancel">Cancel</button>' +
          '<button class="recommend" type="button" id="emergency-callback-exit-button" data-l10n-id="ok">OK</button>' +
        '</menu>' +
      '</form>' +
              '<div id="emergency-callback-toaster" ' +
              'data-z-index-level="notification-toaster" hidden role="link" ' +
              'aria-live="assertive" aria-atomic="true">' +
                '<div class="icon">' +
                '</div>' +
                '<div class="message" data-l10n-id="emergency-callback-mode">' +
                '</div>' +
                '<div class="timer">' +
                '</div>' +
              '</div>';
    },

    _start: function ecm_init() {
      // Dom elements
      this.notification =
        document.getElementById('emergency-callback-notification');
      this.message = this.notification.querySelector('.message');
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

    displayNotificationAndToaster: function ecm_displayNotificationAndToaster() {
      this.displayNotificationIfHidden();
      this.toasterTimer.textContent = this.timerString;
      this.toaster.classList.add('displayed');
      this.toaster.hidden = false;
      setTimeout(function waitToHide() {
        this.toaster.classList.remove('displayed');
        this.toaster.hidden = true;
      }.bind(this), this.TOASTER_TIMEOUT);
    },

    hideNotificationIfDisplayed: function ecm_hideNotificationIfDisplayed() {
      if (this.notification.classList.contains('displayed')) {
        this.notification.classList.remove('displayed');
        this.notification.hidden = true;
        StatusBar.updateEmergencyCbNotification();
      }
    },

    displayNotificationIfHidden: function ecm_displayNotificationIfHidden() {
      if (!this.notification.classList.contains('displayed')) {
        this.notification.classList.add('displayed');
        this.notification.hidden = false;
        StatusBar.updateEmergencyCbNotification(true);
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

    onDataError: function ecm_onDataError(evt) {
      // TODO: We shold be able to confirm the error is caused by
      //       emergency callback mode before showing prompt.
      this.showEmergencyCbPrompt();
    },

    onEmergencyCbModeChange: function ecm_onEmergencyCbModeChange(evt) {
      var active = evt.active;
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
  });
  exports.EmergencyCallbackManager = EmergencyCallbackManager;
}(window));

