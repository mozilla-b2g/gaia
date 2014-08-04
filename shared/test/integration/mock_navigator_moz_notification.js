/*global Components, Services*/
/**
 * @fileoverview This script mocks the deprecated mozNotification API
 *    (developer.mozilla.org/docs/Web/API/window.navigator.mozNotification)
 *    for app integration tests.
 */
'use strict';

Components.utils.import('resource://gre/modules/Services.jsm');

Services.obs.addObserver(function(document) {
  if (!document || !document.location) {
    return;
  }

  var window = document.defaultView.wrappedJSObject;
  var fakeNotifications = [];

  function makeSafeObject(obj) {
    var exposedProps = {};
    Object.keys(obj).forEach(function(key) {
      exposedProps[key] = 'wr';
    });
    obj.__exposedProps__ = exposedProps;
    return obj;
  }

  function makeFakeRequest(obj) {
    var request = makeSafeObject({
      title: obj.title,
      dir: null,
      lang: null,
      body: null,
      tag: null,
      icon: obj.iconURL,

      show: function() {},

      onclick: null,
      onclose: null
    });

    window.setTimeout(function() {
      request.onclose && request.onclose();
    });

    return request;
  }

  window.navigator.__defineGetter__('mozNotification', function() {
    return {
      __exposedProps__: {
        createNotification: 'r'
      },

      createNotification: function(title, description, opt_iconURL) {
        var obj = { title: title, description: description };
        if (opt_iconURL) {
          obj.iconURL = opt_iconURL;
        }
        obj = makeSafeObject(obj);

        fakeNotifications.push(obj);
        return makeFakeRequest(obj);
      }
    };
  });


  window.navigator.__defineGetter__('__mozFakeNotifications', function() {
    return fakeNotifications;
  });

}, 'document-element-inserted', false);
