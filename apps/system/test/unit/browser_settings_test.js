'use strict';
/* global BrowserSettings, MockNavigatormozApps,
   MockNavigatorSettings, MockPlaces */

requireApp('system/shared/test/unit/mocks/mock_navigator_moz_apps.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/test/unit/mock_places.js');

suite('system/BrowserSettings', function() {
  var realNavigatorSettings;
  var realNavigatormozApps;
  var realPlaces;
  var browserSettings;

  suiteSetup(function(done) {
    realNavigatormozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;

    realNavigatorSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realPlaces = window.places;
    window.places = new MockPlaces();

    requireApp('system/js/browser_settings.js', function() {
      browserSettings = new BrowserSettings();
      browserSettings.start();
      done();
    });
  });

  suiteTeardown(function() {
    navigator.mozApps = realNavigatormozApps;
    realNavigatormozApps = null;

    navigator.mozSettings = realNavigatorSettings;
    realNavigatorSettings = null;

    window.places = realPlaces;
    realPlaces = null;
  });

  suite('check for settings-based procedure handlers', function() {
    test('setting clear.browser.history should clear places database',
      function() {
        var clearPlacesStub = sinon.stub(window.places, 'clear');

        navigator.mozSettings.createLock().set({'clear.browser.history': true});
        assert.isTrue(clearPlacesStub.called,
                      'Places database clear should be requested');
        clearPlacesStub.restore();
      }
    );

    test('setting clear.browser.private-data should call clearBrowserData',
      function() {
        navigator.mozSettings.createLock().set({
          'clear.browser.private-data': true
        });

        var called = false;
        // Resolve DOMRequest to a fake app object
        MockNavigatormozApps.mLastRequest.result = {
          clearBrowserData: function() {
            called = true;
          }
        };
        MockNavigatormozApps.mLastRequest.onsuccess();

        assert.isTrue(called,
                      'Browser data clear should be requested');
      }
    );
  });
});

