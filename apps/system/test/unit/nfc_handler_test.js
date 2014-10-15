'use strict';

/* globals NfcUtils, MockAppWindowManager, MockNfc, MocksHelper */
require('/shared/js/utilities.js');
require('/shared/js/nfc_utils.js');
require('/shared/test/unit/mocks/mock_system.js');
require('/shared/test/unit/mocks/mock_moz_ndefrecord.js');
requireApp('system/test/unit/mock_nfc.js');
requireApp('system/test/unit/mock_app_window_manager.js');

var mocksForNfcManager = new MocksHelper([
  'AppWindowManager',
  'System',
  'MozNDEFRecord'
]).init();

suite('System Browser Nfc Handler tests', function() {
  var nfcHandler;
  var realMozNfc;
  var nfcUtils;

  mocksForNfcManager.attachTestHelpers();

  setup(function(done) {
    nfcUtils = new NfcUtils();
    realMozNfc = window.navigator.mozNfc;
    window.navigator.mozNfc = MockNfc;
    window.appWindowManager = new MockAppWindowManager();
    requireApp('system/js/nfc_handler.js', function() {
      nfcHandler = new window.NfcHandler(window.appWindowManager);
      nfcHandler.start();
      done();
    });
  });

  teardown(function() {
    window.navigator.mozNfc = realMozNfc;
  });

  test('on peer ready', function() {
    window.appWindowManager.mActiveApp = {
      config: { url: 'www.test.com' },
      isBrowser: function() {
        return true;
      }
    };
    var stubSendNDEFMessageToNFCPeer =
      this.sinon.stub(nfcHandler, 'sendNDEFMessageToNFCPeer');
    var nfcEvent = {
      type: 'peerready'
    };
    MockNfc.mTriggerOnpeerready(nfcEvent);
    assert.deepEqual(stubSendNDEFMessageToNFCPeer.getCall(0).args[0],
      nfcUtils.parseURIString('www.test.com'));
    assert.deepEqual(stubSendNDEFMessageToNFCPeer.getCall(0).args[1],
      nfcEvent);
  });

  test('send NDEF request to peer', function() {
    var sentRequest = {'testkey': 'testvalue'};
    nfcHandler.sendNDEFMessageToNFCPeer(sentRequest,
                                        {peer: MockNfc.getNFCPeer()});
    assert.deepEqual(MockNfc.mSentRequest, sentRequest);
  });
});
