/* -*Mode: js; js-indent-level: 2; indent-tabs-mode: nil -**/
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';

var CaptivePortalLogin = (function() {
  var eventId;
  var isManualConnect = false;
  var settings = window.navigator.mozSettings;
  var notification = null;
  var wifiManager = window.navigator.mozWifiManager;
  var _ = window.navigator.mozL10n.get;
  var captiveNotification_onTap = null;

  function handleLogin(id, url) {
    //captive portal login needed
    eventId = id;
    var currentNetwork = wifiManager.connection.network;
    var networkName = (currentNetwork && currentNetwork.ssid) ?
        currentNetwork.ssid : '';
    var message = _('captive-wifi-available', { networkName: networkName});
    if (!isManualConnect) {
      notification = NotificationScreen.addNotification({
        id: id, title: '', text: message, icon: null
      });
      captiveNotification_onTap = function() {
        notification.removeEventListener('tap', captiveNotification_onTap);
        captiveNotification_onTap = null;
        NotificationScreen.removeNotification(id);
        new MozActivity({
          name: 'view',
          data: { type: 'url', url: url }
        });
      };
      notification.addEventListener('tap', captiveNotification_onTap);
    } else {
      settings.createLock().set({'wifi.connect_via_settings': false});
      new MozActivity({
        name: 'view',
        data: { type: 'url', url: url }
      });
    }
  }

  function handleLoginAbort(id) {
    if (id === eventId && notification) {
      if (notification.parentNode) {
        if (captiveNotification_onTap) {
          notification.removeEventListener('tap', captiveNotification_onTap);
          captiveNotification_onTap = null;
        }
        NotificationScreen.removeNotification(id);
        notification = null;
      }
    }
  }

  window.addEventListener('mozChromeEvent', function handleChromeEvent(e) {
    switch (e.detail.type) {
      case 'captive-portal-login':
        handleLogin(e.detail.id, e.detail.url);
        break;
      case 'captive-portal-login-abort':
        handleLoginAbort(e.detail.id);
        break;
    }
  });

  // Using settings API to know whether user is manually selecting
  // wifi AP from settings app.
  SettingsListener.observe('wifi.connect_via_settings', true, function(value) {
    isManualConnect = value;
  });
})();
