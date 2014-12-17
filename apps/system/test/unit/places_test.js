/* global MocksHelper, MockNavigatorDatastore, MockDatastore, Places */
/* global asyncStorage, MockAppWindowManager */

'use strict';

requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_app_window_manager.js');
require('/shared/test/unit/mocks/mock_async_storage.js');
require('/shared/test/unit/mocks/mock_navigator_datastore.js');

requireApp('system/js/places.js');

var mocksHelperForPlaces = new MocksHelper([
  'AppWindowManager',
  'asyncStorage',
  'SettingsListener',
  'Datastore'
]).init();

suite('system/Places', function() {

  var realDatastores;
  var subject;

  mocksHelperForPlaces.attachTestHelpers();

  suiteSetup(function(done) {

    asyncStorage.getItem = function(key, callback) {
      callback(null);
    };

    realDatastores = navigator.getDataStores;
    navigator.getDataStores = MockNavigatorDatastore.getDataStores;

    subject = new Places();
    subject.start().then(done);
    window.appWindowManager = new MockAppWindowManager();
  });

  suiteTeardown(function() {
    window.appWindowManager = null;
    navigator.getDataStores = realDatastores;
  });

  setup(function() {
    this.sinon.useFakeTimers();
  });

  var url1 = 'http://example.org';

  var oneIcon = {
    'windows.ico': {
      sizes: ['32x32 48x48']
    },
  };

  suite('Private Browsing', function() {

    function sendPrivateBrowserEvent(event, url) {
      window.dispatchEvent(new CustomEvent(event, {
        detail: {
          isBrowser: function() { return true; },
          isPrivateBrowser: function() { return true; },
          config: {
            url: url
          }
        }
      }));
    }

    test('Does not process events for private browsers', function() {
      var locationStub = this.sinon.stub(subject, 'onLocationChange');
      var debounceStub = this.sinon.stub(subject, 'debouncePlaceChanges');

      sendPrivateBrowserEvent('applocationchange', url1);
      sendPrivateBrowserEvent('apploaded', url1);
      assert.isFalse(locationStub.called);
      assert.isFalse(debounceStub.called);
    });
  });

  suite('Test places event handling', function() {

    teardown(function() {
      MockDatastore.clear();
    });

    function sendEvent(event, url) {
      window.dispatchEvent(new CustomEvent(event, {
        detail: {
          isBrowser: function() { return true; },
          isPrivateBrowser: function() { return false; },
          config: {
            url: url
          }
        }
      }));
    }

    test('Test visit', function(done) {
      var screenshotStub = sinon.stub(subject, 'screenshotRequested');
      MockDatastore.addEventListener('change', function() {
        assert.ok(url1 in MockDatastore._records);
        assert.equal(MockDatastore._records[url1].frecency, 1);
        MockDatastore.removeEventListener();
        screenshotStub.restore();
        done();
      });
      sendEvent('applocationchange', url1);
      sendEvent('apploaded', url1);
    });

    test('Test title event', function(done) {
      var title = 'New Title!';

      MockDatastore.addEventListener('change', function() {
        assert.ok(url1 in MockDatastore._records);
        assert.equal(MockDatastore._records[url1].title, title);
        MockDatastore.removeEventListener();
        done();
      });

      sendEvent('applocationchange', url1);
      window.dispatchEvent(new CustomEvent('apptitlechange', {
        detail: {
          isBrowser: function() { return true; },
          isPrivateBrowser: function() { return false; },
          title: title,
          config: {
            url: url1
          }
        }
      }));
      sendEvent('apploaded', url1);
    });

    test('Test icon event', function(done) {

      MockDatastore.addEventListener('change', function() {
        assert.ok(url1 in MockDatastore._records);
        var icons = MockDatastore._records[url1].icons;
        assert.ok('windows.ico' in icons);
        assert.deepEqual(icons['windows.ico'].sizes, ['32x32 48x48']);
        MockDatastore.removeEventListener();
        done();
      });

      sendEvent('applocationchange', url1);
      window.dispatchEvent(new CustomEvent('appiconchange', {
        detail: {
          isBrowser: function() { return true; },
          isPrivateBrowser: function() { return false; },
          favicons: oneIcon,
          config: {
            url: url1
          }
        }
      }));
      sendEvent('apploaded', url1);
    });

    test('Test screenshots', function(done) {

      subject.topSites = [];
      var screenshotStub = sinon.stub(subject, 'screenshotRequested');
      var changes = 0;

      MockDatastore.addEventListener('change', function() {
        changes++;

        // First url should request a screenshot
        if (changes === 1) {
          assert.ok(screenshotStub.calledOnce);
          sendEvent('applocationchange', url1 + '/1');
          sendEvent('apploaded', url1 + '/1');
          return;
        }

        // We send 2 requests for /0 through /5 two times each
        if (changes > 1 && changes < 12) {
          sendEvent('applocationchange', url1 + '/' + (changes % 6));
          sendEvent('apploaded', url1 + '/' + (changes % 6));
          return;
        }

        // There are 6 urls so all are top sites
        if (changes === 12) {
          assert.equal(screenshotStub.callCount, 12);
          sendEvent('applocationchange', url1 + '/new');
          sendEvent('apploaded', url1 + '/new');
          return;
        }

        // The last url is only visited once (rest have 2) so it should
        // not request a screenshot
        if (changes === 13) {
          assert.equal(screenshotStub.callCount, 12);
          screenshotStub.restore();
          MockDatastore.removeEventListener();
          done();
        }
      });

      sendEvent('applocationchange', url1 + '/0');
      sendEvent('apploaded', url1 + '/0');
    });

    test('Test screenshots for loading sites', function() {
      var takeScreenshotStub = sinon.stub(subject, 'takeScreenshot');
      subject.screenshotRequested('http://example.org');
      assert.ok(takeScreenshotStub.notCalled);
      this.sinon.clock.tick(6000);
      assert.ok(takeScreenshotStub.calledOnce);
      takeScreenshotStub.restore();
    });

    test('Receive icon update after apploaded saves place', function(done) {
      sendEvent('applocationchange', url1);
      sendEvent('apploaded', url1);
      MockDatastore.addEventListener('change', function() {
        // Exit after we get a save event for the icon update.
        done();
      });
      sendEvent('appiconchange', url1);
      this.sinon.clock.tick(10000);
    });

    test('Receive title update after apploaded saves place', function(done) {
      sendEvent('applocationchange', url1);
      sendEvent('apploaded', url1);
      MockDatastore.addEventListener('change', function() {
        // Exit after we get a save event for the icon update.
        done();
      });
      sendEvent('apptitlechange', url1);
      this.sinon.clock.tick(10000);
    });

    test('Correctly set visits', function(done) {
      var url = 'http://example.org';
      MockDatastore.addEventListener('change', function() {
        assert.equal(MockDatastore._records[url].visits.length, 3);
        done();
      });
      subject.setVisits(url, [1, 2, 3]);
    });

    test('Ensure place without icon doesnt bail', function(done) {
      var url = 'http://example.org';

      MockDatastore.put({
        url: url,
        tile: 'a tile',
        frecency: 1
      }, url);

      MockDatastore.addEventListener('change', function() {
        assert.equal(MockDatastore._records[url].frecency, 2);
        done();
      });

      sendEvent('applocationchange', url);
      window.dispatchEvent(new CustomEvent('appiconchange', {
        detail: {
          isBrowser: function() { return true; },
          isPrivateBrowser: function() { return false; },
          favicons: oneIcon,
          config: {url: url }
        }
      }));
      this.sinon.clock.tick(10000);
    });

  });

});
