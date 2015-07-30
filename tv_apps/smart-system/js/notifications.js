/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global interactiveNotifications, InteractiveNotifications, SettingsCache */
'use strict';


var NotificationScreen = {

  silent: false,
  isResending: false,
  resendReceived: 0,
  resendExpecting: 0,

  /* These applications' notifications will be added in the "priority"
   * notification group
   */
  PRIORITY_APPLICATIONS: [
    window.location.origin.replace('system.', 'network-alerts.') +
      '/manifest.webapp'
  ],

  /* These applications' notifications will not be notified, it means we won't
   * have:
   * - the banner
   * - the vibration
   * - the sound
   */
  SILENT_APPLICATIONS: [
    window.location.origin.replace('system.', 'network-alerts.') +
      '/manifest.webapp'
  ],

  init: function ns_init() {
    window.addEventListener('mozChromeNotificationEvent', this);
    window.addEventListener('ftuopen', this);
    window.addEventListener('ftudone', this);
    window.addEventListener('desktop-notification-resend', this);
  },

  handleEvent: function ns_handleEvent(evt) {
    switch (evt.type) {
      case 'mozChromeNotificationEvent':
        var detail = evt.detail;
        switch (detail.type) {
          case 'desktop-notification':
            this.addNotification(detail);
            if (this.isResending) {
              this.resendReceived++;
              this.isResending = (this.resendReceived < this.resendExpecting);
            }
            break;
          case 'desktop-notification-close':
            this.removeNotification(detail.id);
            break;
        }

        // Send event for notification connector.
        this._sendEvent('notification-message', detail.type);
        break;
      case 'ftuopen':
        this.toaster.removeEventListener('click', this);
        break;
      case 'ftudone':
        this.toaster.addEventListener('click', this);
        break;
      case 'desktop-notification-resend':
        this.resendExpecting = evt.detail.number;
        if (this.resendExpecting) {
          this.isResending = true;
        }
        break;
    }
  },

  clickNotification: function ns_clickNotification(id) {
    // event for gecko
    this._sendEvent('mozContentNotificationEvent', {
      type: 'desktop-notification-click',
      id: id
    });
    // event for gaia
    this._sendEvent('notification-clicked', {
      id: id
    });
  },

  showToast: function ns_showToast(notification) {
    var self = this;
    var msg = {
      'detail': notification,
      'title': notification.title,
      'text': notification.text,
      'icon': notification.icon,
      'buttons': [{
        'id': 'open',
        'label': 'Open'
      }],
      'onClosed': function notifiationOnClosed(button) {
        if (button === 'open') {
          self.clickNotification(notification.id);
          // Desktop notifications are removed when they are clicked
          // (see bug 890440)
          if (notification.type === 'desktop-notification' &&
              notification.obsoleteAPI === 'true') {
            self.removeNotification(notification.id);
          }
        } else {
          self.removeNotification(notification.id);
        }
      }
    };
    interactiveNotifications.showNotification(
      InteractiveNotifications.TYPE.NORMAL, msg);
  },

  addNotification: function ns_addNotification(detail) {
    var behavior = detail.mozbehavior;
    // keep the notification structure for future implementation.
    var notification = {
      'id': detail.id,
      'manifestURL': detail.manifestURL,
      'behavior': {
        'noclear': behavior.noclear,
        'noscreen': behavior.noscreen,
        'soundFile': behavior.soundFile,
        'vibrationPattern': behavior.vibrationPattern,
        'silent': behavior.silent
      },
      'noNotify': detail.noNotify,
      'priority': this.PRIORITY_APPLICATIONS.indexOf(detail.manifestURL) !== -1,
      'obsoleteAPI': typeof detail.id === 'string' &&
                     detail.id.indexOf('app-notif-') === 0,
      'type': detail.type || 'desktop-notification',
      'icon': detail.icon,
      'dir': (detail.bidi === 'ltr' || detail.bidi === 'rtl') ?
             detail.bidi : 'auto',
      'lang': detail.lang,
      'title': detail.title,
      'timestamp': detail.timestamp ? new Date(detail.timestamp) : new Date(),
      'text': detail.text
    };

    // Tell gecko that we already show the notification.
    this._sendEvent('mozContentNotificationEvent', {
      type: 'desktop-notification-show',
      id: notification.id
    });

    // XXX: we still need to know if the notification is silent in the future.
    // We turn the screen on if needed in order to let
    // the user see the notification toaster
    // if (!behavior.noscreen && typeof(ScreenManager) !== 'undefined' &&
    //     !ScreenManager.screenEnabled) {
    //   ScreenManager.turnScreenOn();
    // }

    // var notify = !(notification.noNotify) &&
    //   // don't notify for network-alerts notifications
    //   (this.SILENT_APPLICATIONS.indexOf(notification.manifestURL) === -1);

    // We don't need to show toast, play sould or vibrate when no need to
    // notify.
    // if (!notify) {
    //   return;
    // }

    // Notification toaster
    this.showToast(notification);
  },

  removeNotification: function ns_removeNotification(notificationId) {
    this._sendEvent('mozContentNotificationEvent', {
      type: 'desktop-notification-close',
      id: notificationId
    });
  },

  _sendEvent: function ns_sendEvent(name, detail) {
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent(name, true, true, detail);
    window.dispatchEvent(event);
  }
};

window.addEventListener('load', function() {
  window.removeEventListener('load', this);
  if (window.SettingsCache) {
    SettingsCache.get('notifications.resend', function onsuccess(value) {
      var resendEnabled = value || false;
      if (!resendEnabled) {
        return;
      }

      var resendCallback = (function(number) {
        window.dispatchEvent(
          new CustomEvent('desktop-notification-resend',
            { detail: { number: number } }));
      }).bind(this);

      if ('mozChromeNotifications' in navigator) {
        navigator.mozChromeNotifications.
          mozResendAllNotifications(resendCallback);
      }
    });
  }
});

NotificationScreen.init();
