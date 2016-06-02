/* global Components, Services */
'use strict';

Components.utils.import('resource://gre/modules/Services.jsm');

Services.obs.addObserver(function(document) {
  if (!document || !document.location) {
    return;
  }

  var window = document.defaultView;
  var navigator = window.wrappedJSObject.navigator;

  Object.defineProperty(navigator, 'mozMobileConnections', {
    configurable: false,
    writable: true,
    value: Components.utils.cloneInto(
      navigator.mozIccManager.iccIds.map(function(id) {
        return { iccId: id };
      }),
      window
    )
  });
}, 'document-element-inserted', false);

