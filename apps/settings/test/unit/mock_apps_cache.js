define(function() {
  'use strict';

  var AppsCache = {
    _apps: [],
    apps: function() {
      return Promise.resolve(this._apps);
    },
    _installListeners: [],
    _uninstallListeners: [],
    addEventListener: function(type, listener) {
      if (type === 'oninstall') {
        this._installListeners.push(listener);
      }
      else if (type === 'onuninstall') {
        this._uninstallListeners.push(listener);
      }
    },
    removeEventListener: function() {},

    _triggerInstallListeners: function(app) {
      var event = new Event('oninstall');
      event.application = app;
      this._installListeners.forEach((listener) => listener(event));
    },

    _triggerUninstallListeners: function(app) {
      var event = new Event('onuninstall');
      event.application = app;
      this._uninstallListeners.forEach((listener) => listener(event));
    },
  };

  return AppsCache;
});
