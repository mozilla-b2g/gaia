/*global Components, Services */
'use strict';

var Cu = Components.utils;
Cu.import('resource://gre/modules/Services.jsm');

Services.obs.addObserver(function(document) {
  if (!document || !document.location) {
    return;
  }

  var window = document.defaultView;
  var _bluetooth = {
    isConnected: function() { return false; },
    getDefaultAdapter: function() { return new window.Object(); },
    addEventListener: function() {},
    enabled: false,
    onenabled: null,
    ondisabled: null,
    onadapteradded: null
  };

  Object.defineProperty(window.wrappedJSObject.navigator, 'mozBluetooth', {
    configurable: false,
    writable: false,
    value: Cu.cloneInto(
      _bluetooth,
      window,
      {cloneFunctions: true}
    )
  });

}, 'document-element-inserted', false);
