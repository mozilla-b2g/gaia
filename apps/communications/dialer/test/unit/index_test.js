/* globals onLoadDialer, MockKeypadManager, MocksHelper */

'use strict';

require('/shared/test/unit/mocks/dialer/mock_keypad.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_lazy_l10n.js');
require('/shared/js/usertiming.js');
require('/dialer/test/unit/mock_call_handler.js');
require('/dialer/test/unit/mock_navbar_manager.js');

var mocksHelperForIndex = new MocksHelper([
  'CallHandler',
  'KeypadManager',
  'LazyL10n',
  'LazyLoader',
  'NavbarManager'
]).init();

suite('index.js', function() {
  mocksHelperForIndex.attachTestHelpers();

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
      realMozAudioChannelManager = navigator.mozAudioChannelManager;
      navigator.mozAudioChannelManager = { volumeControlChannel: null };

      onLoadDialer();
    });

    teardown(function() {
      navigator.mozAudioChannelManager = realMozAudioChannelManager;
    });

    test('the KeypadManager is setup for use outside of a call',
    function() {
      sinon.assert.calledWith(MockKeypadManager.init, /* oncall */ false);
    });
  });
});
