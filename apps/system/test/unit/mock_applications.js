'use strict';

var MockApplications = (function() {
  var mockApps = {};

  function getByManifestURL(url) {
    return mockApps[url];
  }

  function getByOrigin(origin) {
    var result = Object.keys(mockApps)
      .filter(function(key) {
        return (mockApps[key].origin === origin);
      })
      .map(function(key) {
        return mockApps[key];
      });

    return result;
  }

  function mRegisterMockApp(mockApp) {
    mockApps[mockApp.manifestURL] = mockApp;
  }

  function mUnregisterMockApp(mockApp) {
    mockApps[mockApp.manifestURL] = null;
  }

  function mTeardown() {
    mockApps = {};
  }

  return {
    getByManifestURL: getByManifestURL,
    getByOrigin: getByOrigin,
    mRegisterMockApp: mRegisterMockApp,
    mUnregisterMockApp: mUnregisterMockApp,
    mTeardown: mTeardown
  };
})();
