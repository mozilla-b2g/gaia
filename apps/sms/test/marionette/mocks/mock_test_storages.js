/* global Components, Services, PromiseUtils */
'use strict';

const Cu = Components.utils;
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/PromiseUtils.jsm');

Services.obs.addObserver(function(document) {
  if (!document || !document.location) {
    return;
  }

  var window = document.defaultView;
  var storages = new Map();

  function getStorage(key) {
    var storage = storages.get(key);

    if (!storage) {
      storage = {
        deferred: PromiseUtils.defer(),
        data: null
      };

      storages.set(key, storage);
    }

    return storage;
  }


  var TestStorages = {
    getStorage: function(key) {
      return getStorage(key).deferred.promise;
    },

    setStorage: function(key, value) {
      getStorage(key).data = value;
    },

    setStorageReady: function(key) {
      var storage = getStorage(key);

      // We need waiveXrays here because of the fact that Map/Set passed from
      // less privileged code isn't visible with XRay vision currently (see
      // Gecko bug 1155700). Also follow the link below to get more info on
      // XRay vision:
      // https://developer.mozilla.org/en-US/docs/Xray_vision.
      storage.deferred.resolve(Cu.waiveXrays(storage.data));
    }
  };

  Object.defineProperty(window.wrappedJSObject, 'TestStorages', {
    // The property should be writable since mock is inserted/rewritten in
    // setup function that is called for every test in the suite.
    writable: true,
    value: Cu.cloneInto(TestStorages, window, { cloneFunctions: true })
  });
}, 'document-element-inserted', false);
