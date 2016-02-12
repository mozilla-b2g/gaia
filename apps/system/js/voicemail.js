/* global ModalDialog, BaseModule, SIMSlotManager, NotificationHelper */
'use strict';
(function() {
  // Custom voicemail notification --
  // This can be removed once DesktopNotification
  // supports removing notifications via API
  var Voicemail = function() {};
  Voicemail.SETTINGS = [
    'ril.iccInfo.mbdn'
  ];
  BaseModule.create(Voicemail, {
    name: 'Voicemail',
    icon: null,
    notifications: {},
    tagPrefix: 'voicemailNotification:',

    _start: function vm_init() {
      var voicemail = window.navigator.mozVoicemail;
      if (!voicemail) {
        return;
      }

      this.icon = window.location.protocol + '//' +
        window.location.hostname + '/style/icons/voicemail.png';

      // Cleanup any pending notification and prepare event handler
      return this.setupNotifications();
    },

    handleEvent: function vm_handleEvent(evt) {
      var voicemailStatus = evt.status;
      if (voicemailStatus) {
        this.updateNotification(voicemailStatus);
      }
    },

    updateNotification: function vm_updateNotification(status) {
      var title = status.returnMessage;
      var showCount = status.hasMessages && status.messageCount > 0;
      var titleL10n;

      if (title) {
        titleL10n = { raw: status.returnMessage };
      }

      if (!titleL10n) {
        titleL10n = showCount ? {
          id: 'newVoicemails',
          args: { n: status.messageCount }
        } : 'newVoicemailsUnknown';
      }

      var bodyL10n = titleL10n;

      var numbers = this._settings['ril.iccInfo.mbdn'];
      var voicemail = navigator.mozVoicemail;
      var number = numbers && numbers[status.serviceId];

      if (!number && voicemail) {
       number = voicemail.getNumber(status.serviceId);
      }

      if (number) {
        bodyL10n = {
          id: 'dialNumber',
          args: { number: number }
        };
      }

      if (status.hasMessages) {
        this.showNotification(titleL10n, bodyL10n, number, status.serviceId);
      } else {
        this.hideNotification(status.serviceId);
      }
    },

    showNotification: function
      vm_showNotification(titleL10n, bodyL10n, voicemailNumber, serviceId) {
      if (!('Notification' in window)) {
        return;
      }

      serviceId = serviceId || 0;
      var titlePromise, subTitlePromise;

      if (!SIMSlotManager.hasOnlyOneSIMCardDetected()) {
        if (typeof titleL10n === 'string') {
          subTitlePromise = document.l10n.formatValue(titleL10n);
        } else if (titleL10n.raw) {
          subTitlePromise = Promise.resolve(titleL10n.raw);
        } else {
          subTitlePromise =
            document.l10n.formatValue(titleL10n.id, titleL10n.args);
        }
        titlePromise = subTitlePromise.then(subtitle => {
          return {
            id: 'voicemailNotificationMultiSim',
            args: { n: serviceId + 1, title: subtitle }
          };
        });
      } else {
        titlePromise = Promise.resolve(titleL10n);
      }

      var notifOptions = {
        bodyL10n: bodyL10n,
        icon: this.icon,
        tag: this.tagPrefix + serviceId,
        mozbehavior: {
          showOnlyOnce: true
        }
      };

      return titlePromise.then(titleL10n => {
        NotificationHelper.send(titleL10n, notifOptions).then(notification => {
          var callVoicemail = function vmNotificationCall_onClick(event) {
            var telephony = window.navigator.mozTelephony;
            if (!telephony) {
              return;
            }

            var openLines = telephony.calls.length +
                ((telephony.conferenceGroup &&
                  telephony.conferenceGroup.calls.length) ? 1 : 0);

            // User can make call only
            // when there are less than 2 calls by spec. If the limit reached,
            // return early to prevent holding active call.
            if (openLines >= 2) {
              return;
            }

            telephony.dial(voicemailNumber, serviceId);
          };

          var showNoVoicemail = (function vmNotificationNoCall_onClick(event) {
            var voicemailDialog = {
              title: 'voicemailNoNumberTitle',
              text: 'voicemailNoNumberText',
              confirm: {
                title: 'voicemailNoNumberSettings',
                callback: this.showVoicemailSettings
              },
              cancel: {
                title: 'voicemailNoNumberCancel',
                callback: function() {}
              }
            };

            ModalDialog.confirm(
              voicemailDialog.title, voicemailDialog.text,
              voicemailDialog.confirm, voicemailDialog.cancel
            );
          }).bind(this);

          notification.addEventListener('click',
            voicemailNumber ? callVoicemail : showNoVoicemail);

          notification.addEventListener('close',
            (function vm_closeNotification(evt) {
            this.notifications[serviceId] = null;
          }).bind(this));

          this.notifications[serviceId] = notification;
        });
      });
    },

    hideNotification: function vm_hideNotification(serviceId) {
      if (!this.notifications[serviceId]) {
        return;
      }

      this.notifications[serviceId].close();
    },

    setupNotifications: function vm_setupNotifications() {
      // Always make sure the initial state is known
      this.notifications = {};
      var prefix = this.tagPrefix;
      var promise = Notification.get();
      return promise.then(function(notifications) {
        notifications.forEach(function(notification) {
          if (!notification) {
            return;
          }

          // We cannot search for 'tag=voicemailNotification:*'
          // so we do it by ourselves.
          // Bail out if the notification does not match our tag.
          if (!notification.tag || !notification.tag.startsWith(prefix)) {
            return;
          }

          // Let's remove voicemail notification.
          notification.close();
        });
      }).then((function() {
        var voicemail = window.navigator.mozVoicemail;
        voicemail.addEventListener('statuschanged', this);
      }).bind(this));
    },

    showVoicemailSettings: function vm_showVoicemailSettings() {
      var activity = new window.MozActivity({
        name: 'configure',
        data: {
          target: 'device',
          section: 'call'
        }
      });

      activity.onerror = function() {
        console.warn('Configure activity error:', activity.error.name);
      };
    }
  });
}());
