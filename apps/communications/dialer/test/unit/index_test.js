/* globals onLoadDialer, MockKeypadManager, MockL10n, MocksHelper */

'use strict';

require('/shared/test/unit/mocks/dialer/mock_keypad.js');
require('/shared/test/unit/mocks/dialer/mock_lazy_l10n.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_l10n.js');

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
  var realL10n;

  mocksHelperForIndex.attachTestHelpers();

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
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
