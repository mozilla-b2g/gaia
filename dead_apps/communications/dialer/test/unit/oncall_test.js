/* globals onLoadCallScreen, MockKeypadManager, MockTonePlayer,
           MocksHelper, unloadCallScreen */

'use strict';

require('/shared/test/unit/mocks/dialer/mock_calls_handler.js');
require('/shared/test/unit/mocks/dialer/mock_keypad.js');
require('/shared/test/unit/mocks/dialer/mock_tone_player.js');

require('/dialer/test/unit/mock_call_screen.js');

var mocksHelperForIndex = new MocksHelper([
  'CallScreen',
  'CallsHandler',
  'KeypadManager',
  'TonePlayer'
]).init();

suite('oncall.js', function() {
  mocksHelperForIndex.attachTestHelpers();

  setup(function(done) {
    this.sinon.spy(window, 'addEventListener');

    require('/dialer/js/oncall.js', done);
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
      this.sinon.spy(MockTonePlayer, 'init');
      this.sinon.spy(MockKeypadManager, 'init');

      onLoadCallScreen();
    });

    test('all components are initialized with the proper parameters',
    function() {
      sinon.assert.calledWith(MockTonePlayer.init, 'telephony');
      sinon.assert.calledWith(MockKeypadManager.init, /* oncall */ true);
      assert.isTrue(MockTonePlayer.init.calledBefore(MockKeypadManager.init));
    });
  });
});
