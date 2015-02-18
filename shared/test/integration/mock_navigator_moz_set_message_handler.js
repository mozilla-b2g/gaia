/*global Components, Services*/
/**
 * @fileoverview This script mocks the mozSetMessageHandler API
 *    (developer.mozilla.org/docs/Web/API/Navigator.mozSetMessageHandler)
 *    for app integration tests. You should use and improve this if you
 *    want to write a marionette test for app functionality which gets
 *    triggered by a system message (activities, alarms, etc.).
 */
'use strict';

Components.utils.import('resource://gre/modules/Services.jsm');

Services.obs.addObserver(function(document) {
  if (!document || !document.location) {
    return;
  }

  var window = document.defaultView.wrappedJSObject;
  var messageHandler;

  window.navigator.__defineGetter__('mozSetMessageHandler', function() {
    return function(type, callback) {
      if (type === 'alarm') {
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
