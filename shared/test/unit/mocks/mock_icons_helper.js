'use strict';

/* exported MockIconsHelper */

var _defaultIconSize = 0;

var MockIconsHelper = {
  set _defaultIconSize(size) {
    _defaultIconSize = size;
  },

  getIcon: function(url, placeObject, siteObject) {
    return new Promise(resolve => {
      resolve();
    });
  },
  getIconBlob: function(uri, iconTargetSize, placeObj = {}, siteObj = {}) {
    return Promise.resolve({
      blob: 'abc',
      originalUrl: 'http://example.com/icons/16.png',
      timestamp: Date.now()
    });
  },

  setElementIcon: Promise.resolve,

  getBestIconFromWebManifest: function() {},
  getBestIconFromMetaTags: function() {},

  fetchIcon: function() {},
  fetchIconBlob: function() {},

  get defaultIconSize() {
    return _defaultIconSize;
  },

  clear: function() {}
};
