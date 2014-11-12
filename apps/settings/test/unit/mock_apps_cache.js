define(function() {
  'use strict';

  var AppsCache = {
    _apps: [],
    apps: function() {
      return Promise.resolve(this._apps);
    },
    addEventListener: function() {},
    removeEventListener: function() {}
  };

  return AppsCache;
});
