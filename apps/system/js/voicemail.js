/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

// Custom voicemail notification -- This can be removed once DesktopNotification
// supports removing notifications via API
var Voicemail = {

  icon: null,
  notification: null,

  init: function vm_init() {
    var voicemail = window.navigator.mozVoicemail;
    if (!voicemail)
      return;

    voicemail.addEventListener('statuschanged', this);

    this.icon = window.location.protocol + '//' +
      window.location.hostname + '/style/icons/voicemail.png';
  },

  handleEvent: function vm_handleEvent(evt) {
    // TODO: remove this backward compatibility check
    // after bug-814634 is landed
    var voicemail = window.navigator.mozVoicemail;
    var status = voicemail.status ||
      voicemail.getStatus && voicemail.getStatus();

    if (!status)
      return;

    this.updateNotification(status);
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
      // TODO: remove this backward compatibility check
      // after bug-814634 is landed
      if (!number && voicemail) {
        number = voicemail.number ||
          voicemail.getNumber && voicemail.getNumber();
      }
      if (number) {
        text = _('dialNumber', { number: number });
      }

      if (status.hasMessages) {
        Voicemail.showNotification(title, text, number);
      } else {
        Voicemail.hideNotification();
      }
    };
    request.onerror = function() {};
  },

  showNotification: function vm_showNotification(title, text, voicemailNumber) {
    if (!('Notification' in window)) {
      return;
    }

    var notifOptions = {
      body: text,
      icon: this.icon,
      tag: 'voicemailNotification'
    };

    this.notification = new Notification(title, notifOptions);

    if (!voicemailNumber) {
      return;
    }

    this.notification.addEventListener('click',
      function vmNotification_onClick(event) {
        var telephony = window.navigator.mozTelephony;
        if (!telephony) {
          return;
        }
        telephony.dial(voicemailNumber);
      }
    );
  },

  hideNotification: function vm_hideNotification() {
    if (!this.notification) {
      return;
    }

    this.notification.close();
    this.notification = null;
  }
};

Voicemail.init();
