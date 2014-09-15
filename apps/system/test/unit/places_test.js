/* global MocksHelper, MockNavigatorDatastore, MockDatastore, Places */
/* global asyncStorage */

'use strict';

requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_async_storage.js');
require('/shared/test/unit/mocks/mock_navigator_datastore.js');

requireApp('system/js/places.js');

var mocksHelperForPlaces = new MocksHelper([
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
  });

  suiteTeardown(function() {
    navigator.getDataStores = realDatastores;
  });

  var url1 = 'http://example.org';

  var oneIcon = {
    'windows.ico': {
      sizes: ['32x32 48x48']
    },
  };

  suite('Test places event handling', function() {

    teardown(function() {
      MockDatastore.clear();
    });

    function sendEvent(event, url) {
      window.dispatchEvent(new CustomEvent(event, {
        detail: {
          isBrowser: function() { return true; },
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
    });

    test('Test title event', function(done) {
      var title = 'New Title!';

      MockDatastore.addEventListener('change', function() {
        assert.ok(url1 in MockDatastore._records);
        assert.equal(MockDatastore._records[url1].title, title);
        MockDatastore.removeEventListener();
        done();
      });

      window.dispatchEvent(new CustomEvent('apptitlechange', {
        detail: {
          isBrowser: function() { return true; },
          title: title,
          config: {
            url: url1
          }
        }
      }));
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

      window.dispatchEvent(new CustomEvent('appiconchange', {
        detail: {
          isBrowser: function() { return true; },
          favicons: oneIcon,
          config: {
            url: url1
          }
        }
      }));
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
          return;
        }

        // We send 2 requests for /0 through /5 two times each
        if (changes > 1 && changes < 12) {
          sendEvent('applocationchange', url1 + '/' + (changes % 6));
          return;
        }

        // There are 6 urls so all are top sites
        if (changes === 12) {
          assert.equal(screenshotStub.callCount, 12);
          sendEvent('applocationchange', url1 + '/new');
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
    });

  });

});
