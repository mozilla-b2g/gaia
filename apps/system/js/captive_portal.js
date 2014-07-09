/* -*Mode: js; js-indent-level: 2; indent-tabs-mode: nil -**/
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global
   BrowserFrame,
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
  captiveNotification_onTap: null,

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

      this.entrySheet = new EntrySheet(document.getElementById('screen'),
                                      url,
                                      new BrowserFrame({url: url}));
      this.entrySheet.open();
      return;
    }

    var options = {
      body: message,
      icon: icon,
      tag: 'captivePortal:' + networkName
    };

    this.notification = new Notification('', options);
    this.captiveNotification_onTap = (function captiveNotification_onTap() {
      this.notification.removeEventListener('tap',
                                            this.captiveNotification_onTap);
      this.captiveNotification_onTap = null;
      var activity = new MozActivity({
        name: 'view',
        data: { type: 'url', url: url }
      });
      activity.onsuccess = function() {
        this.notification.close();
        this.notification = null;
      };
      activity.onerror = function(e) {
        console.error('CaptivePortal MozActivity error: ' + e);
      };
    }).bind(this);
    this.notification.addEventListener('tap', this.captiveNotification_onTap);
  },

  dismissNotification: function dismissNotification(id) {
    if (id === this.eventId) {
      if (this.notification) {
        if (this.captiveNotification_onTap) {
          this.notification.removeEventListener('tap',
                                                this.captiveNotification_onTap);
          this.captiveNotification_onTap = null;
        }
        this.notification.close();
        this.notification = null;
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
    window.addEventListener('mozChromeEvent', this);
  }
};

// unit tests call init() manually
if (navigator.mozL10n) {
  navigator.mozL10n.once(CaptivePortal.init.bind(CaptivePortal));
}
