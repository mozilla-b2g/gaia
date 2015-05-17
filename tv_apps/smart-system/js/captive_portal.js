/* -*Mode: js; js-indent-level: 2; indent-tabs-mode: nil -**/
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global BrowserFrame,
   EntrySheet,
   FtuLauncher,
   Notification,
   MozActivity,
   NotificationHelper,
   focusManager
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
    var settings = window.navigator.mozSettings;
    var icon = window.location.protocol + '//' + window.location.hostname +
      '/style/icons/captivePortal.png';

    //captive portal login needed
    this.eventId = id;
    var currentNetwork = wifiManager.connection.network;
    var networkName = (currentNetwork && currentNetwork.ssid) ?
        currentNetwork.ssid : '';
    var message = { 'id': 'captive-wifi-available',
      'args': { networkName: networkName }
    };

    if (FtuLauncher.isFtuRunning()) {
      settings.createLock().set({'wifi.connect_via_settings': false});

      this.entrySheet = new EntrySheet(
        document.getElementById('screen'),
        url,
        new BrowserFrame({url: url}),
        function() {
          this.entrySheet = null;
          focusManager.focus();
        }.bind(this)
      );
      this.entrySheet.open();
      focusManager.focus();
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
      'bodyL10n': message,
      'icon': icon,
      'tag': this.notificationPrefix + networkName
    };

    NotificationHelper.send('', options).then(function(notification){
      this.notification = notification;

      notification.addEventListener('click',
        this.captiveNotification_onClick);
      notification.addEventListener('close', (function() {
        this.notification = null;
      }).bind(this));
    });
    focusManager.focus();
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
        focusManager.focus();
      }

      if (this.entrySheet) {
        this.entrySheet.close();
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
    focusManager.addUI(this);
    return promise;
  },

  isFocusable: function cp_isFocusable() {
    return !!this.entrySheet;
  },

  getElement: function cp_getElement() {
    if (this.isFocusable()){
      return this.entrySheet.element;
    }
  },

  focus: function cp_focus() {
    if (this.isFocusable()){
      var element = this.entrySheet.element.querySelector('iframe') ||
                    this.entrySheet.header.els.actionButton;
      document.activeElement.blur();
      element.focus();
    }
  }
};

// unit tests call init() manually
if (navigator.mozL10n) {
  navigator.mozL10n.once(CaptivePortal.init.bind(CaptivePortal));
}
