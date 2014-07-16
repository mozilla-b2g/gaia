/*global Components, Services*/
/**
 * @fileoverview This script mocks th notifications API
 *    for app integration tests.
 */
'use strict';

Components.utils.import('resource://gre/modules/Services.jsm');

Services.obs.addObserver((document) => {
  if (!document || !document.location) {
    return;
  }

  var fakeNotifications = [];

  var contentWindow = document.defaultView.wrappedJSObject;

  contentWindow.Notification = function Notification(title, options) {
    this.title = title;

    Object.keys(options).forEach((key) => {
      this[key] = options[key];
    });

    [
      'onshow',
      'onclick',
      'onclose',
      'onerror'
    ].forEach((method) => {
      this[method] = null;
    });

    fakeNotifications.push(this);

    contentWindow.setTimeout(() => {
      !!this.onshow && this.onshow();
    });

    exposeObject(this);
  };

  contentWindow.__defineGetter__('__fakeNotifications', function() {
    return fakeNotifications;
  });

  function exposeObject(obj) {
    obj.__exposedProps__ = {};
    Object.keys(obj).forEach(function(key) {
      obj.__exposedProps__[key] = 'wr';
    });

    return obj;
  }
}, 'document-element-inserted', false);
