/* globals onLoadCallScreen, MockKeypadManager,
           MocksHelper, unloadCallScreen */

'use strict';

require('/shared/test/unit/mocks/dialer/mock_calls_handler.js');
require('/shared/test/unit/mocks/dialer/mock_keypad.js');

require('/test/unit/mock_call_screen.js');

var mocksHelperForIndex = new MocksHelper([
  'CallScreen',
  'CallsHandler',
  'KeypadManager'
]).init();

suite('index.js', function() {
  mocksHelperForIndex.attachTestHelpers();

  setup(function(done) {
    this.sinon.spy(window, 'addEventListener');

    require('/js/index.js', done);
  });

  teardown(function() {
    window.removeEventListener('load', onLoadCallScreen);
    window.removeEventListener('unload', unloadCallScreen);
  });

  suite('loading', function() {
    test('onload/onunload handlers are properly registered', function() {
      sinon.assert.calledWith(window.addEventListener, 'load',
                              onLoadCallScreen);
      sinon.assert.calledWith(window.addEventListener, 'unload',
                              unloadCallScreen);
    });
  });

  suite('initialization', function() {
    setup(function() {
      this.sinon.spy(MockKeypadManager, 'init');

      onLoadCallScreen();
    });

    test('all components are initialized with the proper parameters',
    function() {
      sinon.assert.calledWith(MockKeypadManager.init, /* oncall */ true);
    });
  });
});
