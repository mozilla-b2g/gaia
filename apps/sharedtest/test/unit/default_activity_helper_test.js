'use strict';

/* global DefaultActivityHelper, MockNavigatorSettings */

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/js/default_activity_helper.js');

suite('Default Activity Helper', function() {
  var realMozSettings;

  suiteSetup(function() {
    realMozSettings = window.navigator.mozSettings;
    window.navigator.mozSettings = MockNavigatorSettings;
  });

  suiteTeardown(function() {
    window.mozSettings = realMozSettings;
  });

  suite('getDefaultConfig', function() {
    test('returns config if supported', function() {
      var config = DefaultActivityHelper.getDefaultConfig('view', 'url');
      assert.ok(config);
      assert.equal(config.settingsId, 'default.activity.openurl');
    });

    test('returns undefined if not supported', function() {
      var config = DefaultActivityHelper.getDefaultConfig('aaa', 'bbbb');
      assert.equal(config, undefined);
    });
  });

  suite('getDefaultAction', function(done) {
    test('setting is recovered for supported activity', function(done) {
      MockNavigatorSettings.mSettings['default.activity.openurl'] = 'manifest';
      DefaultActivityHelper.getDefaultAction('view', 'url').then((action) => {
        assert.equal(action, 'manifest');
        done();
      });
    });

    test('Returns \'null\' action if not supported', function(done) {
      DefaultActivityHelper.getDefaultAction('aaaa', 'bbb').then((action) => {
        assert.equal(action, null);
        done();
      });
    });
  });

  suite('setDefaultAction', function() {
    test('setting is set for supported action', function() {
      DefaultActivityHelper.setDefaultAction('view', 'url', 'testmanifest');

      var value = MockNavigatorSettings.mSettings['default.activity.openurl'];
      assert.equal(value, 'testmanifest');
    });
  });
});
