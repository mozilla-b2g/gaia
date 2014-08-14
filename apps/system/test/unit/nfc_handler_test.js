'use strict';

/* globals NfcUtils, AppWindowManager, MockNfc, MocksHelper */
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

suite('Nfc Manager Functions', function() {
  var nfcHandler;
  var realMozNfc;

  mocksForNfcManager.attachTestHelpers();

  setup(function(done) {
    realMozNfc = window.navigator.mozNfc;
    window.navigator.mozNfc = MockNfc;
    requireApp('system/js/nfc_handler.js', function() {
      nfcHandler = new window.NfcHandler(AppWindowManager);
      nfcHandler.start();
      done();
    });
  });

  teardown(function() {
    window.navigator.mozNfc = realMozNfc;
  });

  test('on peer ready', function() {
    AppWindowManager.mActiveApp = {
      url: 'www.test.com',
      isBrowser: function() {
        return true;
      }
    };
    var stubSendNDEFRequestToNFCPeer =
      this.sinon.stub(nfcHandler, 'sendNDEFRequestToNFCPeer');
    var nfcEvent = {
      type: 'peerready'
    };
    MockNfc.mTriggerOnpeerready(nfcEvent);
    assert.deepEqual(stubSendNDEFRequestToNFCPeer.getCall(0).args[0],
      NfcUtils.parseURIString('www.test.com'));
    assert.deepEqual(stubSendNDEFRequestToNFCPeer.getCall(0).args[1],
      nfcEvent);
  });

  test('send NDEF request to peer', function() {
    var sentRequest = {'testkey': 'testvalue'};
    nfcHandler.sendNDEFRequestToNFCPeer(sentRequest,
                                        {peer: MockNfc.getNFCPeer()});
    assert.deepEqual(MockNfc.mSentRequest, sentRequest);
  });
});
