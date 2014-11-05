/*global Components, Services */
'use strict';

Components.utils.import('resource://gre/modules/Services.jsm');

Services.obs.addObserver(function(document) {
  if (!document || !document.location) {
    return;
  }

  var window = document.defaultView.wrappedJSObject;
  Object.defineProperty(window.navigator, 'mozTelephony', {
    configurable: false,
    get: function() {
      return {};
    }
  });

}, 'document-element-inserted', false);
