'use strict';

/* globals NfcUtils, MockNfc, MocksHelper, MockService, BaseModule */
require('/shared/js/utilities.js');
require('/shared/js/nfc_utils.js');
require('/shared/test/unit/mocks/mock_service.js');
require('/shared/test/unit/mocks/mock_moz_ndefrecord.js');
requireApp('system/test/unit/mock_nfc.js');
requireApp('system/js/base_module.js');
requireApp('system/js/nfc_handler.js');

var mocksForNfcManager = new MocksHelper([
  'Service',
  'MozNDEFRecord'
]).init();

suite('System Browser Nfc Handler tests', function() {
  var nfcHandler;
  var nfcUtils;

  mocksForNfcManager.attachTestHelpers();

  setup(function() {
    nfcUtils = new NfcUtils();
    nfcHandler = BaseModule.instantiate('NfcHandler', {nfc: MockNfc});
    nfcHandler.start();
  });

  test('on peer ready', function() {
    MockService.mTopMostWindow = {
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
                                        {peer: MockNfc.MockNFCPeer});
    assert.deepEqual(MockNfc.mSentRequest, sentRequest);
  });
});
