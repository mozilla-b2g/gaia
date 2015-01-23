/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* globals SettingsHelper, SIMSlotManager, Notification, ModalDialog */

'use strict';

// Custom voicemail notification -- This can be removed once DesktopNotification
// supports removing notifications via API
var Voicemail = {

  icon: null,
  notifications: {},
  tagPrefix: 'voicemailNotification:',

  init: function vm_init() {
    var voicemail = window.navigator.mozVoicemail;
    if (!voicemail) {
      return;
    }

    this.icon = window.location.protocol + '//' +
      window.location.hostname + '/style/icons/voicemail.png';

    this.voiceMailNumberHelper = SettingsHelper('ril.iccInfo.mbdn', null);

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

    var settings = navigator.mozSettings;
    if (!settings) {
      return;
    }

    // Fetch voicemail number from 'ril.iccInfo.mbdn' settings before
    // looking up |navigator.mozVoicemail.number|.
    // Some SIM card may not provide MBDN info
    // but we could still use settings to overload that.
    this.voiceMailNumberHelper.get(function gotVMNumbers(numbers) {
      var voicemail = navigator.mozVoicemail;
      var number = numbers && numbers[status.serviceId];

      if (!number && voicemail) {
       number = voicemail.getNumber(status.serviceId);
      }

      if (number) {
        text = _('dialNumber', { number: number });
      }

      if (status.hasMessages) {
        Voicemail.showNotification(title, text, number, status.serviceId);
      } else {
        Voicemail.hideNotification(status.serviceId);
      }
    });
  },

  showNotification:
  function vm_showNotification(title, text, voicemailNumber, serviceId) {
    if (!('Notification' in window)) {
      return;
    }

    serviceId = serviceId || 0;

    if (SIMSlotManager.isMultiSIM()) {
      var _ = window.navigator.mozL10n.get;
      title =
        _('voicemailNotificationMultiSim', { n: serviceId + 1, title: title });
    }

    var notifOptions = {
      body: text,
      icon: this.icon,
      tag: this.tagPrefix + serviceId
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
      var _ = window.navigator.mozL10n.get;

      var voicemailDialog = {
        title: _('voicemailNoNumberTitle'),
        text: _('voicemailNoNumberText'),
        confirm: {
          title: _('voicemailNoNumberSettings'),
          callback: this.showVoicemailSettings.bind(this, serviceId)
        },
        cancel: {
          title: _('voicemailNoNumberCancel'),
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

    notification.addEventListener('close', (function vm_closeNotification(evt) {
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
    promise.then(function(notifications) {
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
    return promise;
  },

  showVoicemailSettings: function vm_showVoicemailSettings(serviceId) {
    var activity = new window.MozActivity({
      name: 'configure',
      data: {
        target: 'device',
        section: 'call',
        serviceId: serviceId
      }
    });

    activity.onerror = function() {
      console.warn('Configure activity error:', activity.error.name);
    };
  }
};

Voicemail.init();
