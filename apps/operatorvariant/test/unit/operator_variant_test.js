/* global require, requireApp, suite, suiteSetup, suiteTeardown, setup,
   teardown, test, assert, OperatorVariantManager
 */

'use strict';

requireApp('operatorvariant/test/unit/mock_xmlhttprequest.js');
requireApp('operatorvariant/test/unit/mock_navigator_moz_settings.js');
requireApp('operatorvariant/shared/test/unit/mocks/' +
           'mock_navigator_moz_set_message_handler.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');

requireApp('operatorvariant/js/resources.js');
requireApp('operatorvariant/js/operator_variant.js');

suite(' OperatorVariantManager > ', function() {
  const TEST_NETWORK_MCC = '214';
  const TEST_NETWORK_MNC = '7';
  const TEST_MCC_MNC = '214-007';
  var realSettings;
  var realSetMessageHandler;
  var realLazyLoader;
  var realXHR;

  var customizationList = {
    '214-007': {
        'support_contacts': '/resources/support_contacts.json',
        'wallpaper': '/resources/wallpaper.jpg',
        'default_contacts': '/resources/contacts.json',
        'ringtone': '/resources/ringtone.ogg'
    }
  };
  const MSG_NAME = 'first-run-with-sim';
  var message = {
    mcc: '214',
    mnc: '007'
  };

  suiteSetup(function() {
    realXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = window.MockXMLHttpRequest;

    realSettings = navigator.mozSettings;
    navigator.mozSettings = window.MockNavigatorSettings;

    realSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = window.MockNavigatormozSetMessageHandler;

    realLazyLoader = window.LazyLoader;
    window.LazyLoader = window.MockLazyLoader;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realSettings;
    navigator.mozSetMessageHandler = realSetMessageHandler;
    window.LazyLoader = realLazyLoader;
    window.XMLHttpRequest = realXHR;
  });

  setup(function() {
    navigator.mozSetMessageHandler.mSetup();
    OperatorVariantManager.init();
  });

  teardown(function() {
    navigator.mozSettings.mTeardown();
    navigator.mozSetMessageHandler.mTeardown();
    window.XMLHttpRequest.mTeardown();
  });

  test(' normalize ', function() {
    assert.equal(OperatorVariantManager.normalizeCode('7'), '007');
    assert.equal(OperatorVariantManager.normalizeCode('07'), '007');
    assert.equal(OperatorVariantManager.normalizeCode('007'), '007');
  });

  test(' getMccMnc ', function() {
    assert.equal(
      OperatorVariantManager.getMccMnc(TEST_NETWORK_MCC, TEST_NETWORK_MNC),
                                       TEST_MCC_MNC
    );
  });

  test(' dispatchCustomizationEvents ', function(done) {
    var eventsDispatched = {};
    var eventsToDispatch = customizationList[TEST_MCC_MNC];

    navigator.mozSetMessageHandler.mTrigger(MSG_NAME, message);
    window.addEventListener('customization', function customizer(event) {
      var setting = event.detail.setting;
      var value = event.detail.value;
      // Check that the value is the expected
      assert.equal(value, eventsToDispatch[setting]);
      // Check that we have only one event dispatched per setting
      if (eventsDispatched[setting]) {
        assert.ok(false, 'The settting ' + setting +
          ' was dispatched several times.');
        done();
        return;
      }
      eventsDispatched[setting] = true;
      // Check that the number of events dispatched is the expected
      if (Object.keys(eventsToDispatch).length ==
          Object.keys(eventsDispatched).length) {
        window.removeEventListener('customization', customizer);
        done();
      }
    });
    OperatorVariantManager.dispatchCustomizationEvents(customizationList);
  });
});
