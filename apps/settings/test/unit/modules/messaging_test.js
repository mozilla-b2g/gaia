/* global MockNavigatorSettings, MocksHelper, MockIccHelper */
'use strict';

requireApp('settings/shared/test/unit/mocks/mock_icc_helper.js');
requireApp('settings/shared/test/unit/mocks/mock_navigator_moz_settings.js');

var mocksForMessaging = new MocksHelper([
  'IccHelper'
]).init();

suite('messaging', function() {

  var map = {
    '*': {
      'shared/async_storage': 'unit/mock_async_storage',
      'modules/settings_utils': 'unit/mock_settings_utils',
      'shared/settings_listener': 'shared_mocks/mock_settings_listener'
    }
  };

  var realSettings;
  var messaging;
  var mockSettingsUtils;

  mocksForMessaging.attachTestHelpers();

  suiteSetup(function() {
    realSettings = window.navigator.mozSettings;
    window.navigator.mozSettings = MockNavigatorSettings;
  });

  suiteTeardown(function() {
    window.navigator.mozSettings = realSettings;
  });

  setup(function(done) {
    testRequire([
      'modules/messaging',
      'unit/mock_settings_utils'
    ], map, function(Messaging, MockSettingsUtils) {
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
      MockIccHelper.mProps.cardState = 'ready';
      messaging.disableItems(fakePanel);
      assert.isTrue(messaging._disableItems.calledWith(fakePanel, false));
    });

    test('card state: non-ready would disable items', function() {
      MockIccHelper.mProps.cardState = 'unknown';
      messaging.disableItems(fakePanel);
      assert.isTrue(messaging._disableItems.calledWith(fakePanel, true));
    });
  });
});
