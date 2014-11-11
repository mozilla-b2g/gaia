/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* globals SettingsHelper, SIMSlotManager, Notification, ModalDialog */

'use strict';

function debug(msg) {
  console.debug('Voicemail: ' + msg);
}

// Custom voicemail notification -- This can be removed once DesktopNotification
// supports removing notifications via API
var Voicemail = {

  icon: null,
  notifications: {},
  tagPrefix: 'voicemailNotification:',

  init: function vm_init() {
    debug('init: E');
    var voicemail = window.navigator.mozVoicemail;
    if (!voicemail) {
    debug('init: X: no voicemail');
      return;
    }

    this.icon = window.location.protocol + '//' +
      window.location.hostname + '/style/icons/voicemail.png';

    this.voiceMailNumberHelper = SettingsHelper('ril.iccInfo.mbdn', null);

    // Cleanup any pending notification and prepare event handler
    debug('init: X');
    return this.setupNotifications();
  },

  handleEvent: function vm_handleEvent(evt) {
    debug('handleEvent: E');
    var voicemailStatus = evt.status;
    if (voicemailStatus) {
      this.updateNotification(voicemailStatus);
    }
    debug('handleEvent: X');
  },

  updateNotification: function vm_updateNotification(status) {
    debug('updateNotification: E');
    debug('updateNotification: status: ' + status);
    var _ = window.navigator.mozL10n.get;
    var title = status.returnMessage;
    var showCount = status.hasMessages && status.messageCount > 0;
    debug('updateNotification: title: ' + title);
    debug('updateNotification: showCount: ' + showCount);

    if (!title) {
      title = showCount ? _('newVoicemails', { n: status.messageCount }) :
                          _('newVoicemailsUnknown');
    debug('updateNotification: forced title: ' + title);
    }

    var text = title;

    var settings = navigator.mozSettings;
    if (!settings) {
      debug('updateNotification: no settings');
      return;
    }

    // Fetch voicemail number from 'ril.iccInfo.mbdn' settings before
    // looking up |navigator.mozVoicemail.number|.
    // Some SIM card may not provide MBDN info
    // but we could still use settings to overload that.
    debug('updateNotification: calling setting helper');
    this.voiceMailNumberHelper.get(function gotVMNumbers(numbers) {
    debug('updateNotification: gotVMNumbers: ' + JSON.stringify(numbers));
      var voicemail = navigator.mozVoicemail;
    debug('updateNotification: gotVMNumbers: voicemail: ' + voicemail);
      var number = numbers && numbers[status.serviceId];
    debug('updateNotification: gotVMNumbers: number: ' + number);

      if (!number && voicemail) {
       number = voicemail.getNumber(status.serviceId);
    debug('updateNotification: gotVMNumbers: forced number: ' + number);
      }

      if (number) {
        text = _('dialNumber', { number: number });
    debug('updateNotification: gotVMNumbers: text: ' + text);
      }

      if (status.hasMessages) {
    debug('updateNotification: gotVMNumbers: showing');
        Voicemail.showNotification(title, text, number, status.serviceId);
      } else {
    debug('updateNotification: gotVMNumbers: hiding');
        Voicemail.hideNotification(status.serviceId);
      }
    });
    debug('updateNotification: X');
  },

  showNotification:
  function vm_showNotification(title, text, voicemailNumber, serviceId) {
    debug('showNotification: E');
    if (!('Notification' in window)) {
    debug('showNotification: no Notification API');
      return;
    }
    debug('showNotification: title: ' + title);
    debug('showNotification: text: ' + text);
    debug('showNotification: voicemailNumber: ' + voicemailNumber);
    debug('showNotification: serviceId: ' + serviceId);

    serviceId = serviceId || 0;

    if (SIMSlotManager.isMultiSIM()) {
    debug('showNotification: multisim');
      var _ = window.navigator.mozL10n.get;
      title =
        _('voicemailNotificationMultiSim', { n: serviceId + 1, title: title });
    debug('showNotification: multisim title: ' + title);
    }

    var notifOptions = {
      body: text,
      icon: this.icon,
      tag: this.tagPrefix + serviceId
    };
    debug('showNotification: notification options: ' +
          JSON.stringify(notifOptions));

    var notification = new Notification('[!LEGIT!]' + title, notifOptions);
    debug('showNotification: new Notification done');

    var callVoicemail = function vmNotificationCall_onClick(event) {
    debug('showNotification: callVoicemail: E');
      var telephony = window.navigator.mozTelephony;
      if (!telephony) {
    debug('showNotification: callVoicemail: no telephony');
        return;
      }

      var openLines = telephony.calls.length +
          ((telephony.conferenceGroup &&
            telephony.conferenceGroup.calls.length) ? 1 : 0);

      // User can make call only when there are less than 2 calls by spec.
      // If the limit reached, return early to prevent holding active call.
      if (openLines >= 2) {
    debug('showNotification: callVoicemail: more than 2 open lines');
        return;
      }

    debug('showNotification: callVoicemail: placing call to ' +
          voicemailNumber + ' on SIM ' + serviceId);
      telephony.dial(voicemailNumber, serviceId);
    };

    var showNoVoicemail = (function vmNotificationNoCall_onClick(event) {
    debug('showNotification: showNoVoicemail: E');
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

    debug('showNotification: showNoVoicemail: showing dialog');
      ModalDialog.confirm(
        voicemailDialog.title, voicemailDialog.text,
        voicemailDialog.confirm, voicemailDialog.cancel
      );
    debug('showNotification: showNoVoicemail: X');
    }).bind(this);

    debug('showNotification: adding click handler');
    notification.addEventListener('click',
      voicemailNumber ? callVoicemail : showNoVoicemail);

    debug('showNotification: adding close handler');
    notification.addEventListener('close', (function vm_closeNotification(evt) {
    debug('showNotification: vm_closeNotification');
      this.notifications[serviceId] = null;
    }).bind(this));

    this.notifications[serviceId] = notification;
    debug('showNotification: X');
  },

  hideNotification: function vm_hideNotification(serviceId) {
    if (!this.notifications[serviceId]) {
      return;
    }

    this.notifications[serviceId].close();
  },

  setupNotifications: function vm_setupNotifications() {
    debug('setupNotification: E');
    // Always make sure the initial state is known
    this.notifications = {};
    var prefix = this.tagPrefix;
    var promise = Notification.get();
    debug('setupNotification: getting notifications');
    promise.then(function(notifications) {
    debug('setupNotification: got notifications');
      notifications.forEach(function(notification) {
    debug('setupNotification: notification: E');
        if (!notification) {
    debug('setupNotification: notification: no notification');
          return;
        }

        // We cannot search for 'tag=voicemailNotification:*'
        // so we do it by ourselves.
        // Bail out if the notification does not match our tag.
        if (!notification.tag || !notification.tag.startsWith(prefix)) {
    debug('setupNotification: notification: not our notification');
          return;
        }

        // Let's remove voicemail notification.
    debug('setupNotification: notification: closing notification');
        notification.close();
      });
    debug('setupNotification: notification: X');
    }).then((function() {
    debug('setupNotification: then: E');
      var voicemail = window.navigator.mozVoicemail;
    debug('setupNotification: then: adding voicemail event');
      voicemail.addEventListener('statuschanged', this);
    debug('setupNotification: then: X');
    }).bind(this));
    debug('setupNotification: X');
    return promise;
  },

  showVoicemailSettings: function vm_showVoicemailSettings() {
    debug('showVoicemailSettings: E');
    var activity = new window.MozActivity({
      name: 'configure',
      data: {
        target: 'device',
        section: 'call'
      }
    });

    debug('showVoicemailSettings: activity sent');
    activity.onerror = function() {
      console.warn('Configure activity error:', activity.error.name);
    };
    debug('showVoicemailSettings: X');
  }
};

Voicemail.init();
