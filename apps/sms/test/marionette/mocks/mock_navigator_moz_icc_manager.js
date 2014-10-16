/* global Components, Services */
'use strict';

Components.utils.import('resource://gre/modules/Services.jsm');

Services.obs.addObserver(function(document) {
  if (!document || !document.location) {
    return;
  }

  var window = document.defaultView;

  Object.defineProperty(window.wrappedJSObject.navigator, 'mozIccManager', {
    configurable: false,
    writable: false,
    value: Components.utils.cloneInto({iccIds: []}, window)
  });
}, 'document-element-inserted', false);
