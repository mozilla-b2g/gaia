/*global Components, Services */
'use strict';

Components.utils.import('resource://gre/modules/Services.jsm');

Services.obs.addObserver(function(document) {
  if (!document || !document.location) {
    return;
  }

  var window = document.defaultView.wrappedJSObject;
  var _mobileConnections = [{}];

  Object.defineProperty(window.navigator, 'mozMobileConnections', {
    configurable: false,
    get: function() {
      return _mobileConnections;
    }
  });

}, 'document-element-inserted', false);
