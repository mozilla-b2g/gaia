/* global Components, Services */
'use strict';

const Cu = Components.utils;
Cu.import('resource://gre/modules/Services.jsm');

Services.obs.addObserver(function(document) {
  if (!document || !document.location) {
    return;
  }

  var window = document.defaultView;

  Object.defineProperty(window.wrappedJSObject.navigator, 'mozIccManager', {
    configurable: false,
    writable: true,
    value: Components.utils.cloneInto({
      iccIds: ['1234575100210522938'],

      getIccById: function(id) {
        return Cu.waiveXrays(Cu.cloneInto({
          cardState: 'ready',
          iccInfo: window.wrappedJSObject.MockIccInfo || {
            mcc: '0',
            mnc: '0'
          },
          addEventListener: function() {}
        }, window, { cloneFunctions: true }));
      }
    }, window, { cloneFunctions: true })
  });
}, 'document-element-inserted', false);

