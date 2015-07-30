/* global ModalDialog, BaseModule, SIMSlotManager */
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
      var _ = window.navigator.mozL10n.get;
      var title = status.returnMessage;
      var showCount = status.hasMessages && status.messageCount > 0;

      if (!title) {
        title = showCount ? _('newVoicemails', { n: status.messageCount }) :
                            _('newVoicemailsUnknown');
      }

      var text = title;
      var numbers = this._settings['ril.iccInfo.mbdn'];
      var voicemail = navigator.mozVoicemail;
      var number = numbers && numbers[status.serviceId];

      if (!number && voicemail) {
       number = voicemail.getNumber(status.serviceId);
      }

      if (number) {
        // To prevent '+' sign for displaying on the wrong side of
        // international numbers in RTL mode we add the LRM character.
        // We can remove this when bug 1154438 is fixed.
        number = '\u200E' + number;
        text = _('dialNumber', { number: number });
      }

      if (status.hasMessages) {
        this.showNotification(title, text, number, status.serviceId);
      } else {
        this.hideNotification(status.serviceId);
      }
    },

    showNotification:
    function vm_showNotification(title, text, voicemailNumber, serviceId) {
      if (!('Notification' in window)) {
        return;
      }

      serviceId = serviceId || 0;

      if (!SIMSlotManager.hasOnlyOneSIMCardDetected()) {
        var _ = window.navigator.mozL10n.get;
        title =
          _('voicemailNotificationMultiSim',
            { n: serviceId + 1, title: title });
      }

      var notifOptions = {
        body: text,
        icon: this.icon,
        tag: this.tagPrefix + serviceId,
        mozbehavior: {
          showOnlyOnce: true
        }
      };

      var notification = new Notification(title, notifOptions);

      var callVoicemail = function vmNotificationCall_onClick(event) {
        var telephony = window.navigator.mozTelephony;
        if (!telephony) {
          return;
        }

        var openLines = telephony.calls.length +
            ((telephony.conferenceGroup &&
              telephony.conferenceGroup.calls.length) ? 1 : 0);

        // User can make call only when there are less than 2 calls by spec.
        // If the limit reached, return early to prevent holding active call.
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
