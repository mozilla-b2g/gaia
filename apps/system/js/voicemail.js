/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

// Custom voicemail notification -- This can be removed once DesktopNotification
// supports removing notifications via API
var Voicemail = {

  icon: null,
  notification: null,
  // A random starting point that is unlikely to be used by other notifications
  notificationId: 3000 + Math.floor(Math.random() * 999),

  init: function vm_init() {
    var voicemail = window.navigator.mozVoicemail;
    if (!voicemail)
      return;

    voicemail.addEventListener('statuschanged', this);

    this.icon = window.location.protocol + '//' +
      window.location.hostname + '/style/icons/voicemail.png';
  },

  handleEvent: function vm_handleEvent(evt) {
    var voicemail = window.navigator.mozVoicemail;
    if (!voicemail.status)
      return;

    this.updateNotification(voicemail.status);
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
    var transaction = settings.createLock();
    var request = transaction.get('ril.iccInfo.mbdn');
    request.onsuccess = function() {
      var number = request.result['ril.iccInfo.mbdn'];
      var voicemail = navigator.mozVoicemail;
      if (!number && voicemail && voicemail.number) {
        number = voicemail.number;
      }
      if (number) {
        text = _('dialNumber', { number: number });
      }

      Voicemail.hideNotification();
      if (status.hasMessages) {
        Voicemail.showNotification(title, text, number);
      }
    };
    request.onerror = function() {};
  },

  showNotification: function vm_showNotification(title, text, voicemailNumber) {
    this.notificationId++;
    this.notification = NotificationScreen.addNotification({
      id: this.notificationId, title: title, text: text, icon: this.icon
    });

    if (!voicemailNumber) {
      return;
    }

    var self = this;
    function vmNotification_onTap(event) {
      self.notification.removeEventListener('tap', vmNotification_onTap);

      var telephony = window.navigator.mozTelephony;
      if (!telephony) {
        return;
      }
      telephony.dial(voicemailNumber);
    }

    this.notification.addEventListener('tap', vmNotification_onTap);
  },

  hideNotification: function vm_hideNotification() {
    if (!this.notification) {
      return;
    }

    if (this.notification.parentNode) {
      NotificationScreen.removeNotification(this.notificationId);
    }

    this.notification = null;
    this.notificationId = 0;
  }
};

Voicemail.init();
