/*
  Settings Tests
*/

/*global Settings, MockNavigatorSettings */

'use strict';

requireApp('sms/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('sms/js/settings.js');


suite('Message App settings Unit-Test', function() {
  var nativeSettings = navigator.mozSettings;
  teardown(function() {
    navigator.mozSettings = nativeSettings;
    Settings.mmsSizeLimitation = 300 * 1024;
  });

  suite('Init fetches settings', function() {
    suite('Without mozSettings', function() {
      setup(function() {
        navigator.mozSettings = null;
        Settings.mmsSizeLimitation = 'whatever is default';
      });
      test('Query size limitation without settings', function() {
        Settings.init();
        assert.equal(Settings.mmsSizeLimitation, 'whatever is default');
      });
    });
    suite('With mozSettings', function() {
      setup(function() {
        navigator.mozSettings = MockNavigatorSettings;
        Settings.mmsSizeLimitation = 'whatever is default';
        this.sinon.stub(navigator.mozSettings, 'createLock', function() {
          var api = {
            get: function() {
              return {};
            },
            set: function() {}
          };
          sinon.spy(api, 'get');
          return api;
        });
      });

      test('Query size limitation with settings exist(500KB)', function() {
        Settings.init();
        assert.equal(Settings.mmsSizeLimitation, 'whatever is default');

        // only made one call to get settings
        assert.equal(navigator.mozSettings.createLock.returnValues.length, 1);
        var lock = navigator.mozSettings.createLock.returnValues[0];
        assert.equal(lock.get.returnValues.length, 1);

        var req = lock.get.returnValues[0];
        req.result = {
          'dom.mms.operatorSizeLimitation': 512000
        };
        req.onsuccess();

        assert.equal(Settings.mmsSizeLimitation, 500 * 1024);
      });

    });
  });
});
