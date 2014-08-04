/* global MocksHelper, MockNavigatorDatastore, MockSettingsListener,
          MockDatastore, Places */

'use strict';

requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_navigator_datastore.js');

requireApp('system/js/places.js');

var mocksHelperForPlaces = new MocksHelper([
  'SettingsListener',
  'Datastore'
]).init();

suite('system/Places', function() {

  var realDatastores;
  var subject;

  mocksHelperForPlaces.attachTestHelpers();

  suiteSetup(function(done) {

    realDatastores = navigator.getDataStores;
    navigator.getDataStores = MockNavigatorDatastore.getDataStores;

    MockSettingsListener.mTriggerCallback('rocketbar.enabled', true);

    subject = new Places();
    subject.rocketBarEnabled = true;
    subject.start(done);
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

    test('Test visit', function(done) {
      MockDatastore.addEventListener('change', function() {
        assert.ok(url1 in MockDatastore._records);
        assert.equal(MockDatastore._records[url1].frecency, 1);
        MockDatastore.removeEventListener();
        done();
      });

      window.dispatchEvent(new CustomEvent('applocationchange', {
        detail: {
          config: {
            url: url1
          }
        }
      }));
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
          favicons: oneIcon,
          config: {
            url: url1
          }
        }
      }));
    });

  });

});
