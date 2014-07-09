/* -*Mode: js; js-indent-level: 2; indent-tabs-mode: nil -**/
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
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
    var self = this;
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

    window.dispatchEvent(new window.CustomEvent('notification-add', { detail:
      { id: id, title: '',
        text: message,
        icon: icon,
        onsuccess: (function onsuccess(notification) {
          this.notification = notification;
          this.notification.addEventListener('tap',
            this.captiveNotification_onTap);
        }).bind(this)
      }})
    );

    this.captiveNotification_onTap = (function() {
      this.notification.removeEventListener('tap',
        this.captiveNotification_onTap);
      this.captiveNotification_onTap = null;
      window.dispatchEvent(new window.CustomEvent('notification-remove',
      { detail: id }));
      new MozActivity({
        name: 'view',
        data: { type: 'url', url: url }
      });
    }).bind(this);

  },

  dismissNotification: function dismissNotification(id) {
    if (id === this.eventId) {
      if (this.notification && this.notification.parentNode) {
        if (this.captiveNotification_onTap) {
          this.notification.removeEventListener('tap',
                                                this.captiveNotification_onTap);
          this.captiveNotification_onTap = null;
        }

        window.dispatchEvent(new window.CustomEvent('notification-remove',
        { detail: id }));

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
      case 'captive-portal-login-success':
        this.handleLoginSuccess(evt.detail.id);
        break;
    }
  },

  init: function cp_init() {
    var self = this;
    window.addEventListener('mozChromeEvent', this);
  }
};

// unit tests call init() manually
if (navigator.mozL10n) {
  navigator.mozL10n.once(CaptivePortal.init.bind(CaptivePortal));
}
