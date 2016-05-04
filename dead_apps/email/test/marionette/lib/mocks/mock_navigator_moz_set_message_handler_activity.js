/*global Components, Services */
'use strict';

Components.utils.import('resource://gre/modules/Services.jsm');

Services.obs.addObserver(function(document) {
  if (!document || !document.location) {
    return;
  }

  var window = document.defaultView.wrappedJSObject;
  var messageHandler;

  window.navigator.__defineGetter__('mozHasPendingMessage', function() {
    return function(type) {
      return type === 'activity';
    };
  });

  window.navigator.__defineGetter__('mozSetMessageHandler', function() {
    return function(type, callback) {
      if (type === 'activity') {
        messageHandler = callback;
      }
    };
  });

  window.__defineGetter__('fireMessageHandler', function() {
    return function(data) {
      if (messageHandler && typeof(messageHandler) === 'function') {
        messageHandler(data);
        return true;
      }
      return false;
    };
  });
}, 'document-element-inserted', false);
