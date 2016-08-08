/* global BaseModule, Service, ModalDialog, ScreenManager, NotificationHelper */
'use strict';

(function() {
  var SuplHandler = function() {};

  SuplHandler.EVENTS = [
    'mozChromeEvent'
  ];

  BaseModule.create(SuplHandler, {
    DEBUG: false,
    name: 'SuplHandler',

    notify: function(detail) {
      this.debug('Notify: ' + detail.id);

      NotificationHelper.send('supl-notification-title', {
        bodyL10n: 'supl-notification-message',
        icon: 'path/to/some/icon',
        tag: 'supl-notification',
        closeOnClick: true
      });
    },

    verify: function(detail) {
      this.debug('Verify: ' + detail.id);

      if (this._pendingVerification) {
        this.debug('Cancelled due to previous verification is pending.');
        return;
      }

      this._pendingVerification = detail.id;

      var showDialog = () => {
        ScreenManager.turnScreenOn();
        ModalDialog.confirm(
          'supl-verification-title',
          'supl-verification-message',
          {
            title: 'supl-verification-confirm',
            callback: this.sendChoice.bind(this, detail.id, true)
          },
          {
            title: 'supl-verification-cancel',
            callback: this.sendChoice.bind(this, detail.id, false)
          }
        );
      };

      if (Service.locked) {
        NotificationHelper.send('supl-verification-title', {
          bodyL10n: 'supl-verification-message-for-notification',
          icon: 'path/to/some/icon',
          tag: 'supl-verification'
        }).then((notification) => {
          notification.addEventListener('click', () => {
            this._pendingNotification = undefined;
            notification.close();
            showDialog();
          });
          this._pendingNotification = notification;
        });
      } else {
        showDialog();
      }
    },

    sendChoice: function(id, value) {
      if (this._pendingVerification != id) {
        return;
      }

      this.debug('Choice: ' + id + ', ' + value);

      navigator.mozSettings.createLock().set({
        'supl.verification.choice': id * (value ? 1 : -1)
      });

      this._pendingVerification = undefined;
    },

    _stop: function() {
      this._pendingNotification = undefined;
      this._pendingVerification = undefined;
    },

    _handle_mozChromeEvent: function(evt) {
      var detail = evt.detail;

      switch(detail.type) {
        case 'supl-notification':
          this.notify(detail);
          break;
        case 'supl-verification':
          this.verify(detail);
          break;
        case 'supl-verification-timeout':
          if (this._pendingVerification) {
            this._pendingVerification = undefined;
            if (this._pendingNotification) {
              this._pendingNotification.close();
              this._pendingNotification = undefined;
            } else {
              ModalDialog.cancelHandler();
            }
          }
          break;
      }
    }
  });
}());
