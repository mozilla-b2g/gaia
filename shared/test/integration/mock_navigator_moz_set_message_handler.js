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
  var messageHandlers = {};

  window.navigator.__defineGetter__('mozSetMessageHandler', function() {
    return function(type, callback) {
      messageHandlers[type] = callback;
    };
  });

  window.__defineGetter__('fireMessageHandler', function() {
    return function(data, type) {
      // For historical purposes, this only supported alarm callbacks. To avoid
      // force updating code that still assumes that, still assume that as a
      // default.
      type = type || 'alarm';
      var messageHandler = messageHandlers[type];
      if (messageHandler && typeof(messageHandler) === 'function') {
        messageHandler(data);
        return true;
      }
      return false;
    };
  });
}, 'document-element-inserted', false);
