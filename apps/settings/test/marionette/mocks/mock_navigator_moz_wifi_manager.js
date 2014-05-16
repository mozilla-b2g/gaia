/*global Components, Services */
'use strict';

Components.utils.import('resource://gre/modules/Services.jsm');

Services.obs.addObserver(function(document) {
  if (!document || !document.location) {
    return;
  }

  var window = document.defaultView.wrappedJSObject;
  var _wifiManager = {
    // We need to list all properties and functions used in the scripts of the
    // tested app. It causes hidden exceptions if not doing so.
    __exposedProps__: {
      getNetworks: 'r',
      getKnownNetworks: 'r',
      associate: 'r',
      forget: 'r',
      wps: 'r',
      setPowerSavingMode: 'r',
      setStaticIpMode: 'r',
      enabled: 'r',
      macAddress: 'r',
      connection: 'r',
      connectionInformation: 'r',
      onenabled: 'wr',
      ondisabled: 'wr',
      onstatuschange: 'wr',
      connectionInfoUpdate: 'wr'
    },
    enabled: false
  };

  Object.defineProperty(window.navigator, 'mozWifiManager', {
    configurable: false,
    get: function() {
      return _wifiManager;
    }
  });

}, 'document-element-inserted', false);
