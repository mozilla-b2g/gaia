/* global Components, Services */
'use strict';

Components.utils.import('resource://gre/modules/Services.jsm');

Services.obs.addObserver(function(document) {
  if (!document || !document.location) {
    return;
  }

  var window = document.defaultView.wrappedJSObject;

  window.navigator.__defineGetter__('mozIccManager', function() {
    return {
      __exposedProps__: {
        iccIds: 'r'
      },
      iccIds: []
    };
  });
}, 'document-element-inserted', false);
