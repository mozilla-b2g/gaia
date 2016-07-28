/* global Components, Services */
'use strict';

const Cu = Components.utils;
Cu.import('resource://gre/modules/Services.jsm');

Services.obs.addObserver(function(document) {
  if (!document || !document.location) {
    return;
  }

  var window = document.defaultView;

  Object.defineProperty(window.wrappedJSObject, 'MockIccInfo', {
    writable: true,
    value: Components.utils.cloneInto({
      mcc: '724',
      mnc: '6'
    }, window)
  });
}, 'document-element-inserted', false);

