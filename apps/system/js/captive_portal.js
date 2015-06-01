/* -*Mode: js; js-indent-level: 2; indent-tabs-mode: nil -**/
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global BrowserFrame,
   EntrySheet,
   FtuLauncher,
   Notification,
   MozActivity
*/

'use strict';

var CaptivePortal = {
  eventId: null,
  settings: null,
  notification: null,
  notificationPrefix: 'captivePortal:',
  captiveNotification_onClick: null,

  handleLogin: function cp_handleLogin(id, url) {
    var wifiManager = window.navigator.mozWifiManager;
    var _ = window.navigator.mozL10n.get;
    var settings = window.navigator.mozSettings;
    var icon = window.location.protocol + '//' + window.location.hostname +
      '/style/icons/captivePortal.png';

    //captive portal login needed
    this.eventId = id;
    var currentNetwork = wifiManager.connection.network;
    var networkName = (currentNetwork && currentNetwork.ssid) ?
        currentNetwork.ssid : '';
    var message = _('captive-wifi-available', { networkName: networkName });

    if (FtuLauncher.isFtuRunning()) {
      settings.createLock().set({'wifi.connect_via_settings': false});
      this.entrySheet = new EntrySheet(
        document.getElementById('screen'),
        // Prefix url with LRM character
        // This ensures truncation occurs correctly in an RTL document
        // We can remove this when bug 1154438 is fixed.
        '\u200E' + url,
        new BrowserFrame({url: url})
      );
      this.entrySheet.open();
      return;
    }

    this.captiveNotification_onClick = (function() {
      this.notification.removeEventListener('click',
                                            this.captiveNotification_onClick);
      this.captiveNotification_onClick = null;
      var activity = new MozActivity({
        name: 'view',
        data: { type: 'url', url: url }
      });
      this.notification.close();
      activity.onerror = function() {
        console.error('CaptivePortal Activity error: ' + this.error);
      };
    }).bind(this);

    var options = {
      body: message,
      icon: icon,
      tag: this.notificationPrefix + networkName,
      mozbehavior: {
        showOnlyOnce: true
      }
    };

    this.notification = new Notification('', options);
    this.notification.addEventListener('click',
      this.captiveNotification_onClick);
    this.notification.addEventListener('close', (function() {
      this.notification = null;
    }).bind(this));
  },

  dismissNotification: function dismissNotification(id) {
    if (id === this.eventId) {
      if (this.notification) {
        if (this.captiveNotification_onClick) {
          this.notification.removeEventListener('click',
                                              this.captiveNotification_onClick);
          this.captiveNotification_onClick = null;
        }

        this.notification.close();
      }

      if (this.entrySheet) {
        this.entrySheet.close();
        this.entrySheet = null;
      }
    }
  },

  handleLoginAbort: function handleLoginAbort(id) {
    this.dismissNotification(id);
  },

  handleLoginSuccess: function handleLoginSuccess(id) {
    this.dismissNotification(id);
  },

  handleEvent: function cp_handleEvent(evt) {
    switch (evt.detail.type) {
      case 'captive-portal-login':
        this.handleLogin(evt.detail.id, evt.detail.url);
        break;
      case 'captive-portal-login-abort':
        this.handleLoginAbort(evt.detail.id);
        break;
      case 'captive-portal-login-success':
        this.handleLoginSuccess(evt.detail.id);
        break;
    }
  },

  init: function cp_init() {
    var promise = Notification.get();
    var prefix = this.notificationPrefix;
    promise.then(function(notifications) {
      notifications.forEach(function(notification) {
        if (!notification) {
          return;
        }

        // We just care about notification with tag 'captivePortal:'
        if (!notification.tag || !notification.tag.startsWith(prefix)) {
          return;
        }

        notification.close();
      });
    }).then((function() {
      window.addEventListener('mozChromeEvent', this);
    }).bind(this));
    return promise;
  }
};

// unit tests call init() manually
if (navigator.mozL10n) {
  navigator.mozL10n.once(CaptivePortal.init.bind(CaptivePortal));
}
