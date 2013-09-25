var MockApplications = (function() {
  var mockApps = {};
  var mReady = false;

  function getByManifestURL(url) {
    return mockApps[url];
  }

  function mRegisterMockApp(mockApp) {
    mockApps[mockApp.manifestURL] = mockApp;
  }

  function mUnregisterMockApp(mockApp) {
    mockApps[mockApp.manifestURL] = null;
  }

  function mTeardown() {
    mockApps = {};
    mReady = false;
  }

  return {
    getByManifestURL: getByManifestURL,
    mRegisterMockApp: mRegisterMockApp,
    mUnregisterMockApp: mUnregisterMockApp,
    mTeardown: mTeardown,
    ready: mReady
  };
})();
