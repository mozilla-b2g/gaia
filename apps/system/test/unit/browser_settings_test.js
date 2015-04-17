'use strict';
/* global BrowserSettings, MockNavigatormozApps,
   MockNavigatorSettings, MockService, MocksHelper */

requireApp('system/shared/test/unit/mocks/mock_navigator_moz_apps.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/shared/test/unit/mocks/mock_service.js');


var mocksForBrowserSettings = new MocksHelper([
  'Service'
]).init();

suite('system/BrowserSettings', function() {
  mocksForBrowserSettings.attachTestHelpers();
  var realNavigatorSettings;
  var realNavigatormozApps;
  var browserSettings;

  suiteSetup(function(done) {
    realNavigatormozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;

    realNavigatorSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

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
  });

  suite('check for settings-based procedure handlers', function() {
    test('setting clear.browser.history should clear places database',
      function() {
        this.sinon.spy(MockService, 'request');
        navigator.mozSettings.createLock().set({'clear.browser.history': true});
        assert.isTrue(MockService.request.calledWith('Places:clear'),
                      'Places database clear should be requested');
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

