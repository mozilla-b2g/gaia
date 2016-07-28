/* globals onLoadDialer, MockKeypadManager, MockL10n, MockTonePlayer,
           MocksHelper */

'use strict';

require('/shared/test/unit/mocks/dialer/mock_keypad.js');
require('/shared/test/unit/mocks/dialer/mock_tone_player.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/dialer/test/unit/mock_call_handler.js');
require('/dialer/test/unit/mock_navbar_manager.js');

var mocksHelperForIndex = new MocksHelper([
  'CallHandler',
  'KeypadManager',
  'LazyLoader',
  'NavbarManager',
  'TonePlayer'
]).init();

suite('index.js', function() {
  var realMozL10n;

  mocksHelperForIndex.attachTestHelpers();

  suiteSetup(function() {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
  });

  setup(function(done) {
    require('/dialer/js/index.js', done);
  });

  teardown(function() {
    window.removeEventListener('load', onLoadDialer);
  });

  suite('initialization', function() {
    var realMozAudioChannelManager;

    setup(function() {
      this.sinon.spy(MockKeypadManager, 'init');
      this.sinon.spy(MockTonePlayer, 'init');
      realMozAudioChannelManager = navigator.mozAudioChannelManager;
      navigator.mozAudioChannelManager = { volumeControlChannel: null };

      onLoadDialer();
    });

    teardown(function() {
      navigator.mozAudioChannelManager = realMozAudioChannelManager;
    });

    test('the KeypadManager is setup for use outside of a call',
    function() {
      sinon.assert.calledWith(MockTonePlayer.init, 'system');
      sinon.assert.calledWith(MockKeypadManager.init, /* oncall */ false);
      assert.isTrue(MockTonePlayer.init.calledBefore(MockKeypadManager.init));
    });
  });
});
