'use strict';

requireApp('system/shared/js/url_helper.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_app_window_manager.js');
mocha.globals(['Places']);

var mocksForPlaces = new MocksHelper([
    'AppWindowManager',
    'SettingsListener',
]).init();

suite('system/Places', function() {
  mocksForPlaces.attachTestHelpers();
  setup(function(done) {
    requireApp('system/js/places.js', done);
  });

  suite('handleEvent', function() {
    test('setPlaceIcon test with a single icon', function(done) {
      /*
      var event = new CustomEvent('appiconchange', {
        'detail': {
          config: {
            url: 'http://www.mozilla.org/en-US/',
            favicon: {
              href: "windows.ico",
              sizes: "32x32 48x48",
              msg_name: "iconchange"
            }
          }
        }
      });
      */

      Places.init(function() {
        Places.clear().then(function() {
          return Places.setPlaceIcon('http://www.mozilla.org/en-US/', {
            href: "windows.ico",
            sizes: "32x32 48x48",
            msg_name: "iconchange"
          }).then(function(url) {
            assert.equal(url, 'http://www.mozilla.org/en-US/');

            Places.dataStore.get(url).then(function(place) {
              assert.equal(place.url, 'http://www.mozilla.org/en-US/');
              assert.equal(place.icons.length, 1);
              assert.equal(place.icons[0].url, 'windows.ico');
              assert.equal(place.icons[0].sizes.length, 2);
              assert.ok(place.icons[0].sizes.indexOf(32) > -1);
              assert.ok(place.icons[0].sizes.indexOf(48) > -1);
              done();
            });
          })
        })
      });
    });
  });
});
