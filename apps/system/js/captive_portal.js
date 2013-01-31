/* -*Mode: js; js-indent-level: 2; indent-tabs-mode: nil -**/
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';

var CaptivePortalLogin = (function (){
  var eventId;
  var isManualConnect = false;
  var settings = window.navigator.mozSettings;
  var mozNotification = window.navigator.mozNotification;
  var notification = null;
  var wifiManager = window.navigator.mozWifiManager;
	var _ = window.navigator.mozL10n.get;

  function handleLogin(id, url) {
    //captive portal login needed
    eventId = id;
		var currentNetwork = wifiManager.connection.network;
		var networkName = (currentNetwork && currentNetwork.ssid) ? currentNetwork.ssid : '';
    var message = _('captive-wifi-available', { networkName: networkName});
    if(!isManualConnect) {
      notification = mozNotification.createNotification(null,message);
      notification.show();
      notification.onclick = function () {
        new MozActivity({
          name: "view",
          data: { type: "url", url: url}
        });
      };
    } else {
      settings.createLock().set({'wifi.connect_via_settings': false});
      new MozActivity({
        name: "view",
        data: { type: "url", url: url}
      });
    }
  }

  function handleLoginAbort(id) {
    if (id === eventId) {
			//TODO Close notification bug-820288
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

  // Using settings API to know whether user is manually selecting wifi AP from settings app.
  SettingsListener.observe('wifi.connect_via_settings', true, function (value) {
    isManualConnect = value;
  });
})();
