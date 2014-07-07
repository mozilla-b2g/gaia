/* global Components, Services */
'use strict';

Components.utils.import('resource://gre/modules/Services.jsm');

Services.obs.addObserver(function(document) {
  if (!document || !document.location) {
    return;
  }

  var window = document.defaultView.wrappedJSObject;
  var fakeTelephony = {};

  window.navigator.__defineGetter__('mozTelephony', function() {
    return fakeTelephony;
  });

}, 'document-element-inserted', false);
