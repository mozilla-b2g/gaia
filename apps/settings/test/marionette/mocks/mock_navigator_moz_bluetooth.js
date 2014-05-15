/*global Components, Services */
'use strict';

Components.utils.import('resource://gre/modules/Services.jsm');

Services.obs.addObserver(function(document) {
  if (!document || !document.location) {
    return;
  }

  var window = document.defaultView.wrappedJSObject;
  var _bluetooth = {
    // We need to list all properties and functions used in the scripts of the
    // tested app. It causes hidden exceptions if not doing so.
    __exposedProps__: {
      isConnected: 'r',
      getDefaultAdapter: 'r',
      addEventListener: 'r',
      enabled: 'r',
      onenabled: 'wr',
      ondisabled: 'wr',
      onadapteradded: 'wr'
    },
    isConnected: function() { return false; },
    getDefaultAdapter: function() {},
    addEventListener: function() {},
    enabled: false,
    onenabled: null,
    ondisabled: null,
    onadapteradded: null
  };

  Object.defineProperty(window.navigator, 'mozBluetooth', {
    configurable: false,
    get: function() {
      return _bluetooth;
    }
  });

}, 'document-element-inserted', false);
