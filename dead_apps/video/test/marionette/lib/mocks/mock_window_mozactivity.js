/* global Components,Services */
'use strict';

Components.utils.import('resource://gre/modules/Services.jsm');
 
Services.obs.addObserver(function(document) {
  if (!document || !document.location) {
    return;
  }

  var window = document.defaultView.wrappedJSObject;
  var mozActivityData = {};

  window.__defineGetter__('MozActivity', function() {
    return function fakeMozActivity(data) {
      mozActivityData = data;
    };
  });

  window.__defineGetter__('getMozActivityData', function() {
    return function getMozActivityData() {
      return mozActivityData;
    };
  });
}, 'document-element-inserted', false);
