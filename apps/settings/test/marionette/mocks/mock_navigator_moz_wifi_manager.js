/*global Components, Services */
'use strict';

var Cu = Components.utils;
Cu.import('resource://gre/modules/Services.jsm');

Services.obs.addObserver(function(document) {
  if (!document || !document.location) {
    return;
  }

  var window = document.defaultView;
  Object.defineProperty(window.wrappedJSObject.navigator, 'mozWifiManager', {
    configurable: false,
    writable: false,
    value: Cu.cloneInto(
      {enabled: false},
      window,
      {cloneFunctions: true}
    )
  });

}, 'document-element-inserted', false);
