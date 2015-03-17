'use strict';

/* global DefaultActivityHelper, MockSettingsHelper, SettingsHelper */

require('/shared/js/default_activity_helper.js');
require('/shared/test/unit/mocks/mock_settings_helper.js');

suite('Default Activity Helper', function() {
  var realSettingsHelper;

  suiteSetup(function() {
    realSettingsHelper = window.SettingsHelper;
    window.SettingsHelper = MockSettingsHelper;
  });

  suiteTeardown(function() {
    window.SettingsHelper = realSettingsHelper;
  });

  suite('getDefaultConfig', function() {
    test('returns config if supported', function() {
      var config = DefaultActivityHelper.getDefaultConfig('view', 'url');
      assert.ok(config);
      assert.equal(config.settingsId, 'activity.default.viewurl');
    });

    test('returns undefined if not supported', function() {
      var config = DefaultActivityHelper.getDefaultConfig('aaa', 'bbbb');
      assert.equal(config, undefined);
    });
  });

  suite('getDefaultAction', function(done) {
    test('setting is recovered for supported activity', function(done) {
      var settingsHelper = SettingsHelper('activity.default.viewurl', null);
      settingsHelper.set('manifest');
      DefaultActivityHelper.getDefaultAction('view', 'url').then((action) => {
        assert.equal(action, 'manifest');
        done();
      });
    });

    test('cb is called with null if not supported', function(done) {
      DefaultActivityHelper.getDefaultAction('aaaa', 'bbb').then((action) => {
        assert.equal(action, null);
        done();
      });
    });
  });

  suite('setDefaultAction', function(done) {
    test('setting is set for supported action', function(done) {
      var settingsHelper = SettingsHelper('activity.default.viewurl', null);
      DefaultActivityHelper.setDefaultAction('view', 'url', 'testmanifest');
      settingsHelper.get(function(value) {
        assert.equal(value, 'testmanifest');
        done();
      });
    });
  });
});
