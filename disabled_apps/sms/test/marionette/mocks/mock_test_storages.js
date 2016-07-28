/* global Services */
'use strict';

Services.obs.addObserver(function(document) {
  if (!document || !document.location) {
    return;
  }

  var window = document.defaultView;

  Object.defineProperty(window.wrappedJSObject, 'TestStorages', {
    value: new window.wrappedJSObject.Map()
  });

  Services.obs.notifyObservers(window, 'test-storage-ready', null);
}, 'document-element-inserted', false);
