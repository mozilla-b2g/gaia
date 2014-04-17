/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

// Custom voicemail notification -- This can be removed once DesktopNotification
// supports removing notifications via API
var Voicemail = {

  icon: null,
  notifications: {},

  init: function vm_init() {
    var voicemail = window.navigator.mozVoicemail;
    if (!voicemail)
      return;

    voicemail.addEventListener('statuschanged', this);

    this.icon = window.location.protocol + '//' +
      window.location.hostname + '/style/icons/voicemail.png';
    this.voiceMailNumberHelper = SettingsHelper('ril.iccInfo.mbdn', null);
  },

  handleEvent: function vm_handleEvent(evt) {
    var voicemail = window.navigator.mozVoicemail;
    var status = evt.status;

    if (!status)
      return;

    this.updateNotification(status);
  },

  updateNotification: function vm_updateNotification(status) {
    var _ = window.navigator.mozL10n.get;
    var title = status.returnMessage;
    var showCount = status.hasMessages && status.messageCount > 0;
    var simIndex = status.serviceId + 1;

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
        if (SIMSlotManager.isMultiSIM()) {
          title = 'SIM ' + simIndex + ' - ' + title;
        }
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

    var notifOptions = {
      body: text,
      icon: this.icon,
      tag: 'voicemailNotification:' + serviceId
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
          callback: this.showVoicemailSettings
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

    this.notifications[serviceId] = notification;
  },

  hideNotification: function vm_hideNotification(serviceId) {
    if (!this.notifications[serviceId]) {
      return;
    }

    this.notifications[serviceId].close();
    this.notifications[serviceId] = null;
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
};

Voicemail.init();
