/* global MockNavigatorSettings */
'use strict';

requireApp('settings/shared/test/unit/mocks/mock_navigator_moz_settings.js');

suite('messaging', function() {

  var map = {
    '*': {
      'shared/icc_helper': 'IccHelper',
      'shared/async_storage': 'unit/mock_async_storage',
      'modules/settings_utils': 'unit/mock_settings_utils',
      'shared/settings_listener': 'shared_mocks/mock_settings_listener'
    }
  };

  var realSettings;
  var messaging;
  var mockSettingsUtils;
  var mockIccHelper;

  suiteSetup(function() {
    realSettings = window.navigator.mozSettings;
    window.navigator.mozSettings = MockNavigatorSettings;
  });

  suiteTeardown(function() {
    window.navigator.mozSettings = realSettings;
  });

  setup(function(done) {
    var requireCtx = testRequire([], map, function() {});

    mockIccHelper = {
      addEventListener: function() {},
      cardState: null
    };
    define('IccHelper', function() {
      return mockIccHelper;
    });

    requireCtx([
      'modules/messaging',
      'unit/mock_settings_utils'
    ], function(Messaging, MockSettingsUtils) {
      messaging = Messaging;
      mockSettingsUtils = MockSettingsUtils;
      done();
    });
  });

  suite('disable items based on card states', function() {
    var fakePanel = {};

    setup(function() {
      this.sinon.stub(messaging, '_disableItems');
    });

    test('card state: ready would enable items', function() {
      mockIccHelper.cardState = 'ready';
      messaging.disableItems(fakePanel);
      assert.isTrue(messaging._disableItems.calledWith(fakePanel, false));
    });

    test('card state: non-ready would disable items', function() {
      mockIccHelper.cardState = 'unknown';
      messaging.disableItems(fakePanel);
      assert.isTrue(messaging._disableItems.calledWith(fakePanel, true));
    });
  });
});
