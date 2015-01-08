'use strict';

/* globals MockPromise, MockNfc, MocksHelper, NDEF, MockService,
           NfcUtils, NfcManager, MozActivity, NfcHandoverManager */

require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/js/nfc_utils.js');
require('/shared/test/unit/mocks/mock_event_target.js');
require('/shared/test/unit/mocks/mock_promise.js');
require('/test/unit/mock_screen_manager.js');
requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_activity.js');
requireApp('system/test/unit/mock_nfc.js');
requireApp('system/test/unit/mock_nfc_handover_manager.js');
requireApp('system/test/unit/mock_screen_manager.js');
requireApp('system/test/unit/mock_bluetooth.js');
require('/shared/test/unit/mocks/mock_service.js');

var mocksForNfcManager = new MocksHelper([
  'AppWindow',
  'MozActivity',
  'ScreenManager',
  'SettingsListener',
  'NfcHandoverManager',
  'Service'
]).init();

var MockMessageHandlers = {};
function MockMozSetMessageHandler(event, handler) {
  MockMessageHandlers[event] = handler;
}

suite('Nfc Manager Functions', function() {
  var fakeApp;
  var realMozSetMessageHandler;
  var realMozBluetooth;
  var nfcUtils;
  var nfcManager;

  mocksForNfcManager.attachTestHelpers();
  var fakeAppConfig = {
    url: 'app://www.fake/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake/ManifestURL',
    origin: 'app://www.fake',
    instanceID: 'instanceID'
  };
  setup(function(done) {
    fakeApp = new window.AppWindow(fakeAppConfig);
    realMozSetMessageHandler = window.navigator.mozSetMessageHandler;
    window.navigator.mozSetMessageHandler = MockMozSetMessageHandler;
    realMozBluetooth = window.navigator.mozBluetooth;
    window.navigator.mozBluetooth = window.MockBluetooth;
    nfcUtils = new NfcUtils();
    MockService.currentApp = fakeApp;
    requireApp('system/js/nfc_manager.js', function() {
      nfcManager = new NfcManager();
      nfcManager.start();
      done();
    });
  });

  teardown(function() {
    nfcManager.stop();
    window.navigator.mozSetMessageHandler = realMozSetMessageHandler;
    window.mozBluetooth = realMozBluetooth;
  });

  suite('start', function() {
    test('Message handleres for nfc-manager-tech-xxx set', function() {
      var stubHandleTechnologyDiscovered =
        this.sinon.stub(nfcManager, '_handleTechDiscovered');
      var stubHandleTechLost = this.sinon.stub(nfcManager, '_handleTechLost');

      MockMessageHandlers['nfc-manager-tech-discovered']();
      assert.isTrue(stubHandleTechnologyDiscovered.calledOnce);

      MockMessageHandlers['nfc-manager-tech-lost']();
      assert.isTrue(stubHandleTechLost.calledOnce);
    });

    test('nfcManager listens on screenchange, and the locking events',
    function() {
      var stubHandleEvent = this.sinon.stub(nfcManager, 'handleEvent');

      window.dispatchEvent(new CustomEvent('lockscreen-appopened'));
      assert.isTrue(stubHandleEvent.calledOnce);
      assert.equal(stubHandleEvent.getCall(0).args[0].type,
        'lockscreen-appopened');

      window.dispatchEvent(new CustomEvent('lockscreen-appclosed'));
      assert.isTrue(stubHandleEvent.calledTwice);
      assert.equal(stubHandleEvent.getCall(1).args[0].type,
        'lockscreen-appclosed');

      window.dispatchEvent(new CustomEvent('screenchange'));
      assert.isTrue(stubHandleEvent.calledThrice);
      assert.equal(stubHandleEvent.getCall(2).args[0].type, 'screenchange');
    });

    test('SettingsListner callback nfc.enabled fired', function() {
      var stubNfcSettingsChanged = this.sinon.stub(nfcManager,
                                                   '_nfcSettingsChanged');

      window.MockSettingsListener.mCallbacks['nfc.enabled'](true);
      assert.isTrue(stubNfcSettingsChanged.withArgs(true).calledOnce);

      window.MockSettingsListener.mCallbacks['nfc.enabled'](false);
      assert.isTrue(stubNfcSettingsChanged.withArgs(false).calledOnce);
    });

    test('Sets "nfc.status" setting to disabled', function() {
      var stubSettingsSet =
        this.sinon.stub(window.MockSettingsListener.getSettingsLock(),'set');

        nfcManager.start();
        assert.isTrue(stubSettingsSet.withArgs({'nfc.status': 'disabled'})
                                     .calledOnce);
    });
  });

  suite('stop', function() {
    test('removes message handlers', function() {
      var setHandlerStub = this.sinon.stub(window.navigator,
                                           'mozSetMessageHandler');

      nfcManager.stop();
      assert.isTrue(setHandlerStub.withArgs('nfc-manager-tech-discovered', null)
                                  .calledOnce);
      assert.isTrue(setHandlerStub.withArgs('nfc-manager-tech-lost', null)
                                  .calledOnce);
    });

    test('removes event listners', function() {
      var stubRemoveListener = this.sinon.stub(window, 'removeEventListener');

      nfcManager.stop();
      assert.isTrue(stubRemoveListener
                      .withArgs('screenchange', nfcManager).calledOnce);
      assert.isTrue(stubRemoveListener
                      .withArgs('lockscreen-appopened', nfcManager).calledOnce);
      assert.isTrue(stubRemoveListener
                      .withArgs('lockscreen-appclosed', nfcManager).calledOnce);
    });

    test('unobserve nfc settings', function() {
      var stubUnobserve = this.sinon.stub(window.MockSettingsListener,
                                          'unobserve');

      nfcManager.stop();
      assert.isTrue(stubUnobserve
                      .withArgs('nfc.enabled', nfcManager._onSettingsChanged)
                      .calledOnce);
    });
  });

  suite('isActive', function() {
    test('returns false if hardware state is OFF', function() {
      nfcManager._hwState = nfcManager.NFC_HW_STATE.OFF;
      assert.isFalse(nfcManager.isActive());
    });

    test('returns false if hardware state is a transition state', function() {
      nfcManager._hwState = nfcManager.NFC_HW_STATE.ENABLING;
      assert.isFalse(nfcManager.isActive());

      nfcManager._hwState = nfcManager.NFC_HW_STATE.DISABLING;
      assert.isFalse(nfcManager.isActive());
    });

    test('returns true if hardware state is ON', function() {
      nfcManager._hwState = nfcManager.NFC_HW_STATE.ON;
      assert.isTrue(nfcManager.isActive());
    });

    test('returns true if hardware state is ENABLE_DISCOVERY', function() {
      nfcManager._hwState = nfcManager.NFC_HW_STATE.ENABLE_DISCOVERY;
      assert.isTrue(nfcManager.isActive());
    });

    test('returns true if hardware state is DISABLE_DISCOVERY', function() {
      nfcManager._hwState = nfcManager.NFC_HW_STATE.DISABLE_DISCOVERY;
      assert.isTrue(nfcManager.isActive());
    });
  });

  suite('isInTransition', function() {
    test('returns true if hardware in transtion states', function() {
      nfcManager._hwState = nfcManager.NFC_HW_STATE.ENABLING;
      assert.isTrue(nfcManager.isInTransition(), 'enabling');

      nfcManager._hwState = nfcManager.NFC_HW_STATE.DISABLING;
      assert.isTrue(nfcManager.isInTransition(), 'disabling');
    });

    test('returns false if hardware not in transtion states', function() {
      nfcManager._hwState = nfcManager.NFC_HW_STATE.OFF;
      assert.isFalse(nfcManager.isInTransition(), 'off');

      nfcManager._hwState = nfcManager.NFC_HW_STATE.ON;
      assert.isFalse(nfcManager.isInTransition(), 'on');

      nfcManager._hwState = nfcManager.NFC_HW_STATE.ENABLE_DISCOVERY;
      assert.isFalse(nfcManager.isInTransition(), 'enable discover');

      nfcManager._hwState = nfcManager.NFC_HW_STATE.DISABLE_DISCOVERY;
      assert.isFalse(nfcManager.isInTransition(), 'disable discovery');
    });
  });

  suite('handleEvent', function() {
    test('proper handling of lock, unlock, screenchange', function() {
      var stubChangeHardwareState = this.sinon.stub(nfcManager,
                                                   '_changeHardwareState');

      // screen lock when NFC ON
      nfcManager._hwState = nfcManager.NFC_HW_STATE.ON;
      window.Service.locked = true;
      nfcManager.handleEvent(new CustomEvent('lockscreen-appopened'));
      assert.isTrue(stubChangeHardwareState.calledOnce);
      assert.equal(stubChangeHardwareState.getCall(0).args[0],
                   nfcManager.NFC_HW_STATE.DISABLE_DISCOVERY);

      // no change in nfcManager._hwState
      nfcManager._hwState = nfcManager.NFC_HW_STATE.DISABLE_DISCOVERY;
      nfcManager.handleEvent(new CustomEvent('screenchange'));
      assert.isTrue(stubChangeHardwareState.calledOnce);

      // screen unlock
      window.Service.locked = false;
      nfcManager.handleEvent(new CustomEvent('lockscreen-appclosed'));
      assert.isTrue(stubChangeHardwareState.calledTwice);
      assert.equal(stubChangeHardwareState.getCall(1).args[0],
                   nfcManager.NFC_HW_STATE.ENABLE_DISCOVERY);

      // NFC off
      nfcManager._hwState = nfcManager.NFC_HW_STATE.OFF;
      nfcManager.handleEvent(new CustomEvent('lockscreen-appopened'));
      nfcManager.handleEvent(new CustomEvent('lockscreen-appclosed'));
      nfcManager.handleEvent(new CustomEvent('screenchange'));
      assert.isTrue(stubChangeHardwareState.calledTwice);
    });

    test('proper handling of shrinking-sent', function() {
      var stubRemoveEventListner = this.sinon.stub(window,
                                                   'removeEventListener');
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
      var stubDispatchP2PUserResponse = this.sinon.stub(nfcManager,
        'dispatchP2PUserResponse');
      nfcManager.handleEvent(new CustomEvent('shrinking-sent'));

      assert.isTrue(stubRemoveEventListner.calledOnce);
      assert.equal(stubRemoveEventListner.getCall(0).args[0], 'shrinking-sent');
      assert.equal(stubRemoveEventListner.getCall(0).args[1], nfcManager);

      assert.isTrue(stubDispatchEvent.calledOnce);
      assert.isTrue(stubDispatchP2PUserResponse.calledOnce);
      assert.equal(stubDispatchEvent.getCall(0).args[0].type, 'shrinking-stop');
    });
  });

  suite('_handleTechDiscovered', function() {
    var sampleMsg;
    var sampleURIRecord;
    var sampleMimeRecord;

    setup(function() {

      sampleMsg = {
        type: 'techDiscovered',
        records: [],
        peer: MockNfc.MockNFCPeer
      };

      // NDEF TNF well know uri unabbreviated
      sampleURIRecord = {
        tnf: NDEF.TNF_WELL_KNOWN,
        type: NDEF.RTD_URI,
        id: new Uint8Array([1]),
        payload: nfcUtils.fromUTF8('\u0000http://mozilla.org')
      };

      sampleMimeRecord = {
        tnf: NDEF.TNF_MIME_MEDIA,
        type: nfcUtils.fromUTF8('text/vcard'),
        id: new Uint8Array([2]),
        payload: nfcUtils.fromUTF8('BEGIN:VCARD\nVERSION:2.1\nN:J;\nEND:VCARD')
      };

    });

    // Helper methods, can be called multiple times in testcase, stubs and spies
    // need to be restored here.
    // invalid message test helper
    var execInvalidMessageTest = function(msg) {
      var stubVibrate = this.sinon.stub(window.navigator, 'vibrate');
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
      var stubTryHandover = this.sinon.stub(NfcHandoverManager, 'tryHandover');
      var stubFireNDEF = this.sinon.stub(nfcManager, '_fireNDEFDiscovered');
      var stubCheckP2P = this.sinon.stub(nfcManager, 'checkP2PRegistration');

      nfcManager._handleTechDiscovered(msg);

      assert.isTrue(stubVibrate.withArgs([25, 50, 125]).calledOnce,
                    'wrong vibrate, when msg: ' + msg);
      assert.isTrue(stubDispatchEvent.calledOnce,
                    'dispatchEvent not called once, when msg: ' + msg);
      assert.equal(stubDispatchEvent.getCall(0).args[0].type,
                   'nfc-tech-discovered',
                   'when msg ' + msg);
      assert.isTrue(stubTryHandover.withArgs([], undefined)
                                   .calledOnce, 'handover, when msg: ' + msg);
      assert.isFalse(stubFireNDEF.called,
                     '_fireNDEFDiscovered should not be called');
      assert.isFalse(stubCheckP2P.called,
                     'checkP2PRegistration should not be called');

      stubVibrate.restore();
      stubDispatchEvent.restore();
      stubTryHandover.restore();
      stubFireNDEF.restore();
      stubCheckP2P.restore();
    };

    // _fireNDEFDiscovered test helper
    var execNDEFMessageTest = function(msg) {
      var stub = this.sinon.stub(nfcManager, '_fireNDEFDiscovered');

      nfcManager._handleTechDiscovered(msg);
      assert.isTrue(stub.withArgs(msg.records).calledOnce);

      stub.restore();
    };

    // checkP2PRegistration helper.
    var execCheckP2PRegistrationTest = function(msg) {
      var stub = this.sinon.stub(nfcManager, 'checkP2PRegistration');
      nfcManager._handleTechDiscovered(msg);
      assert.isTrue(stub.calledOnce);

      stub.restore();
    };

    test('valid message, proper methods called', function() {
      sampleMsg.records.push(sampleURIRecord);

      var stubVibrate = this.sinon.stub(window.navigator, 'vibrate');
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
      var stubTryHandover = this.sinon.stub(NfcHandoverManager, 'tryHandover');

      nfcManager._handleTechDiscovered(sampleMsg);
      assert.isTrue(stubVibrate.withArgs([25, 50, 125]).calledOnce, 'vibrate');
      assert.equal(stubDispatchEvent.firstCall.args[0].type,
                   'nfc-tech-discovered');
      assert.isTrue(stubTryHandover
                    .withArgs(sampleMsg.records, sampleMsg.peer)
                    .calledOnce, 'tryHandover');
    });

    test('invalid message handling', function() {
      execInvalidMessageTest.call(this, null);
      execInvalidMessageTest.call(this, {});
    });

    test('message with one NDEF URI record', function() {
      sampleMsg.records.push(sampleURIRecord);

      execNDEFMessageTest.call(this, sampleMsg);
    });

    test('message with NfcPeer, but no NDEF records', function() {
      execCheckP2PRegistrationTest.call(this, sampleMsg);
    });

    test('massage with no NDEF records, no action', function() {
      delete sampleMsg.peer;
      execInvalidMessageTest.call(this, sampleMsg);
    });

    test('activities triggering end 2 end', function() {
      // empty record
      var empty = { tnf: NDEF.TNF_EMPTY };

      sampleMsg.records.push(sampleURIRecord);
      sampleMsg.records.push(empty);
      sampleMsg.records.push(sampleMimeRecord);

      this.sinon.stub(window, 'MozActivity');

      nfcManager._handleTechDiscovered(sampleMsg);

      assert.deepEqual(MozActivity.firstCall.args[0], {
        name: 'view',
        data: {
                type: 'url',
                url: 'http://mozilla.org',
                src: 'nfc',
                records: sampleMsg.records
        }
      }, 'Uri record');

      sampleMsg.records.shift();
      nfcManager._handleTechDiscovered(sampleMsg);
      assert.deepEqual(MozActivity.secondCall.args[0], {
        name: 'nfc-ndef-discovered',
        data: {
          type: 'empty',
          records: sampleMsg.records
        }
      },'TNF empty');

      sampleMsg.records.shift();
      nfcManager._handleTechDiscovered(sampleMsg);
      assert.deepEqual(MozActivity.thirdCall.args[0], {
        name: 'import',
        data: {
          type: 'text/vcard',
          blob: new Blob([nfcUtils.toUTF8(sampleMimeRecord.payload)],
                         {'type': 'text/vcard'}),
          src: 'nfc',
          records: sampleMsg.records
        }
      },'mime record');
    });
  });

  suite('_handleTechLost', function() {
    test('vibrates and dispatches nfc-tech-lost event', function() {
      var stubVibrate = this.sinon.stub(window.navigator, 'vibrate');
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');

      nfcManager._handleTechLost();
      assert.isTrue(stubVibrate.withArgs([125, 50, 25]).calledOnce, 'vibrate');
      assert.equal(stubDispatchEvent.firstCall.args[0].type, 'nfc-tech-lost');
    });

    test('P2P clean up', function() {
      var stubRemoveListner = this.sinon.stub(window, 'removeEventListener');
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');

      nfcManager._handleTechLost();
      assert.equal(stubRemoveListner.firstCall.args[0], 'shrinking-sent');
      assert.deepEqual(stubRemoveListner.firstCall.args[1], nfcManager);
      assert.equal(stubDispatchEvent.secondCall.args[0].type, 'shrinking-stop');
    });
  });

  suite('_triggerP2PUI', function() {
    test('dispatches proper event', function() {
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');

      nfcManager._triggerP2PUI();
      assert.equal(stubDispatchEvent.firstCall.args[0].type,
                   'check-p2p-registration-for-active-app');
      assert.isTrue(stubDispatchEvent.firstCall.args[0].bubbles,
                    'bubbles not set to true');
      assert.isFalse(stubDispatchEvent.firstCall.args[0].cancelable,
                     'should not be cancelable');
      assert.deepEqual(stubDispatchEvent.firstCall.args[0].detail, nfcManager,
                       'nfcManager not passed as detail property of the event');
    });
  });

  suite('_fireNDEFDiscovered', function() {
    var records;
    var uriRecord;

    setup(function() {
      records = [];
      uriRecord = {
        tnf: NDEF.TNF_WELL_KNOWN,
        type: NDEF.RTD_URI,
        id: new Uint8Array([1]),
        payload: nfcUtils.fromUTF8('\u0000http://mozilla.org')
      };

      this.sinon.stub(window, 'MozActivity');
    }),

    teardown(function() {
      window.MozActivity.restore();
    }),

    suite('NDEF.payload.decode called with proper args', function() {
      var stubDecodePayload;
      var smartPoster;

      setup(function() {
        smartPoster = {
          tnf: NDEF.TNF_WELL_KNOWN,
          type: NDEF.RTD_SMART_POSTER,
          id: new Uint8Array([2]),
          payload: 'fake payload'
        };

        stubDecodePayload = this.sinon.stub(NDEF.payload, 'decode',
                                            () => null);
      });

      teardown(function() {
        stubDecodePayload.restore();
      });

      test('Multiple records, first record decoded', function() {
        records.push(uriRecord);
        records.push({tnf: NDEF.TNF_EMPTY});

        nfcManager._fireNDEFDiscovered(records);
        assert.isTrue(stubDecodePayload.withArgs(uriRecord.tnf,
                                                 uriRecord.type,
                                                 uriRecord.payload)
                                       .calledOnce);
      });

      test('SP (Smart Poster) takes precedence over URI record', function() {
        records.push(uriRecord);
        records.push(smartPoster);

        nfcManager._fireNDEFDiscovered(records);
        assert.isTrue(stubDecodePayload.withArgs(smartPoster.tnf,
                                                 smartPoster.type,
                                                 smartPoster.payload)
                                       .calledOnce);
      });

      test('SP doesnt take precedence over other records', function() {
        records.push({tnf: NDEF.TNF_EMPTY});
        records.push(smartPoster);

        nfcManager._fireNDEFDiscovered(records);
        assert.isTrue(stubDecodePayload.withArgs(NDEF.TNF_EMPTY,
                                                 undefined,
                                                 undefined)
                                       .calledOnce);
      });

      test('Empty NDEF message', function() {
        nfcManager._fireNDEFDiscovered(records);
        assert.isTrue(stubDecodePayload.withArgs(NDEF.TNF_EMPTY,
                                                 undefined,
                                                 undefined)
                                       .calledOnce);
      });
    }),

    test('_getSmartPoster called with proper arg', function() {
      records.push(uriRecord);

      var spyGetSmartPoster = this.sinon.spy(nfcManager, '_getSmartPoster');

      nfcManager._fireNDEFDiscovered(records);
      assert.isTrue(spyGetSmartPoster.withArgs(records).calledOnce);
    }),

    test('_createNDEFActivityOptions called with proper args', function() {
      records.push(uriRecord);

      this.sinon.stub(NDEF.payload, 'decode', () => 'decoded');
      var spyCreateOptions = this.sinon.spy(nfcManager,
                                            '_createNDEFActivityOptions');

      nfcManager._fireNDEFDiscovered(records);
      assert.isTrue(spyCreateOptions.withArgs('decoded').calledOnce);
    }),

    test('MozActivity called with proper args, valid NDEF', function() {
      records.push(uriRecord);

      nfcManager._fireNDEFDiscovered(records);
      assert.deepEqual(MozActivity.firstCall.args[0], {
        name: 'view',
        data: {
                type: 'url',
                url: 'http://mozilla.org',
                src: 'nfc',
                records: records
        }
      });
    });

    test('MozActivity called with proper args, invalid NDEF', function() {
      this.sinon.stub(NDEF.payload, 'decode', () => null);

      nfcManager._fireNDEFDiscovered(records);
      assert.deepEqual(MozActivity.firstCall.args[0],
        { name: 'nfc-ndef-discovered', data: {} });
    });
  }),

  suite('_getSmartPoster', function() {
    var smartPosterRecord;
    var uriRecord;
    var mimeRecord;

    setup(function() {
      smartPosterRecord = {
        tnf: NDEF.TNF_WELL_KNOWN,
        type: NDEF.RTD_SMART_POSTER,
        id: new Uint8Array([1]),
        paylod: nfcUtils.fromUTF8('dummy payload')
      };

      uriRecord = {
        tnf: NDEF.TNF_WELL_KNOWN,
        type: NDEF.RTD_URI,
        id: new Uint8Array([2]),
        payload: nfcUtils.fromUTF8('dummy uri')
      };

      mimeRecord = {
        tnf: NDEF.TNF_MIME_MEDIA,
        type: nfcUtils.fromUTF8('text/plain'),
        id: new Uint8Array([3]),
        payload: nfcUtils.fromUTF8('dummy text')
      };
    });

    test('no Smart Poster (SP) - null returned', function() {
      var result = nfcManager._getSmartPoster([uriRecord, mimeRecord]);
      assert.equal(result, null);
    });

    test('URI record first, SP record second - SP returned', function() {
      var result = nfcManager._getSmartPoster([uriRecord, smartPosterRecord]);
      assert.deepEqual(result, smartPosterRecord);
    });

    test('MIME record first, SP record second - null returned', function() {
      var result = nfcManager._getSmartPoster([mimeRecord, smartPosterRecord]);
      assert.equal(result, null);
    });

    test('SP record only - SP record returned', function() {
      var result = nfcManager._getSmartPoster([smartPosterRecord]);
      assert.deepEqual(result, smartPosterRecord);
    });

    test('Array empty - null returned', function() {
      var result = nfcManager._getSmartPoster([]);
      assert.equal(result, null);
    });
  });

  suite('_createNDEFActivityOptions', function() {
    const NDEF_ACTIVITY_NAME = 'nfc-ndef-discovered';

    test('URI tel -> dial number', function() {
      var payload = { type: 'uri', uri: 'tel:012345678' };

      var options = nfcManager._createNDEFActivityOptions(payload);
      assert.deepEqual(options, {
        name: 'dial',
        data: {
          type: 'webtelephony/number',
          number: payload.uri.substring(4),
          uri: payload.uri,
          src: 'nfc'
        }
      });
    });

    test('URI mailto -> create new mail', function() {
      var payload = { type: 'uri', uri: 'mailto:bugzilla-daemon@mozilla.org' };

      var options = nfcManager._createNDEFActivityOptions(payload);
      assert.deepEqual(options, {
        name: 'new',
        data: {
          type: 'mail',
          url: payload.uri,
          src: 'nfc'
        }
      });
    });

    test('URI http(s) -> launch browser', function() {
      var payload = { type: 'uri', uri: 'http://mozilla.org' };

      var options = nfcManager._createNDEFActivityOptions(payload);
      assert.deepEqual(options, {
        name: 'view',
        data: {
          type: 'url',
          url: payload.uri,
          src: 'nfc'
        }
      });
    });

    test('Data-URI -> launch browser', function() {
      var payload = { type: 'uri', uri: 'data:text/html,<b>Be bold</b>' };

      var options = nfcManager._createNDEFActivityOptions(payload);
      assert.deepEqual(options, {
        name: 'view',
        data: {
          type: 'url',
          url: payload.uri,
          src: 'nfc'
        }
      });
    });

    test('URI other', function() {
      var payload = { type: 'uri', uri: 'sip:bob@bob.com' };

      var options = nfcManager._createNDEFActivityOptions(payload);
      assert.deepEqual(options, {
        name: NDEF_ACTIVITY_NAME,
        data: {
          type: 'uri',
          uri: payload.uri
        }
      });
    });

    test('SmartPoster with http(s) -> launch browser', function() {
      var payload = {
        type: 'smartposter',
        uri: 'http://mozilla.org',
        text: {
          en: 'Home of the Mozilla Project',
          pl: 'Strona domowa projektu Mozilla'
        }
      };

      var options = nfcManager._createNDEFActivityOptions(payload);
      assert.deepEqual(options, {
        name: 'view',
        data: {
          type: 'url',
          text: payload.text,
          url: 'http://mozilla.org',
          src: 'nfc'
        }
      });
    });

    test('SmartPoster other URI', function() {
      var payload = {
        type: 'smartposter',
        uri: 'sip:bob@bob.com',
        text: {
          en: 'Call me!',
          pl: 'Zadzwoń do mnie!'
        }
      };

      var options = nfcManager._createNDEFActivityOptions(payload);
      assert.deepEqual(options, {
        name: NDEF_ACTIVITY_NAME,
        data: payload
      });
    });

    test('text/vcard -> import contct', function() {
      var payload = {
        type: 'text/vcard',
        blob: new Blob(['dummy'], {type: 'text/vcard'})
      };

      var options = nfcManager._createNDEFActivityOptions(payload);
      assert.deepEqual(options, {
        name: 'import',
        data: payload
      });
    });

    test('other payload', function() {
      var payload = {
        type: 'http://mozilla.org'
      };

      var options = nfcManager._createNDEFActivityOptions(payload);
      assert.deepEqual(options, {
        name: NDEF_ACTIVITY_NAME,
        data: {
          type: payload.type
        }
      });
    });

    test('no payload', function() {
      var options = nfcManager._createNDEFActivityOptions(null);
      assert.deepEqual(options, { name: NDEF_ACTIVITY_NAME, data: {} });
    });
  });

  suite('dispatchP2PUserResponse', function() {
    var realMozNfc = navigator.mozNfc;

    setup(function() {
      navigator.mozNfc = MockNfc;
    });

    teardown(function() {
      navigator.mozNfc = realMozNfc;
    });

    test('calls proper mozNfc method', function() {
      var stubNotifyAcceptedP2P = this.sinon.stub(MockNfc,
                                                  'notifyUserAcceptedP2P');
      nfcManager.dispatchP2PUserResponse();
      assert.isTrue(stubNotifyAcceptedP2P.withArgs(fakeAppConfig.manifestURL)
        .calledOnce);
    });
  });

  suite('checkP2PRegistrations', function() {
    var realMozNfc = navigator.mozNfc;

    setup(function() {
      navigator.mozNfc = MockNfc;
    });

    teardown(function() {
      navigator.mozNfc = realMozNfc;
    });

    test('calls proper mozNfc method', function() {
      var stubCheckP2P = this.sinon.stub(MockNfc, 'checkP2PRegistration',
                                         () => { return Promise.resolve(); });

      nfcManager.checkP2PRegistration();
      assert.isTrue(stubCheckP2P.withArgs(fakeAppConfig.manifestURL)
        .calledOnce);
    });

    test('app registered onpeerready handler - success', function() {
      // Setup Fake Promise to stub with:
      var fakePromise = new MockPromise();
      this.sinon.stub(MockNfc, 'checkP2PRegistration',
                      (manifest) => fakePromise);
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
      var spyAddEventListener = this.sinon.spy(window, 'addEventListener');

      // An unprivilaged P2P UI would send message to NFC Manager to validate
      // P2P registration in the stubbed DOM.
      nfcManager.checkP2PRegistration('dummyManifestUrl');

      fakePromise.mFulfillToValue(true);

      stubDispatchEvent.getCall(0).calledWith({ type: 'shrinking-start',
                                                bubbles: false });
      assert.isTrue(spyAddEventListener.withArgs('shrinking-sent').calledOnce);
    });

    test('app registered onpeerready handler - success, ' +
         'but sheets is in transitioning', function() {
      // Setup Fake Promise to stub with:
      var fakePromise = new MockPromise();
      this.sinon.stub(MockNfc, 'checkP2PRegistration',
                      (manifest) => fakePromise);
      var spyAddEventListener = this.sinon.spy(window, 'addEventListener');

      this.sinon.stub(fakeApp, 'isSheetTransitioning').returns(true);
      // An unprivilaged P2P UI would send message to NFC Manager to validate
      // P2P registration in the stubbed DOM.
      nfcManager.checkP2PRegistration('dummyManifestUrl');

      fakePromise.mFulfillToValue(true);

      assert.isFalse(spyAddEventListener.withArgs('shrinking-sent').calledOnce);
    });

    test('app registered onpeerready handler - success, ' +
         'but app is in transitioning', function() {
      // Setup Fake Promise to stub with:
      var fakePromise = new MockPromise();
      this.sinon.stub(MockNfc, 'checkP2PRegistration',
                      (manifest) => fakePromise);
      var spyAddEventListener = this.sinon.spy(window, 'addEventListener');
      this.sinon.stub(fakeApp, 'isTransitioning').returns(true);
      // An unprivilaged P2P UI would send message to NFC Manager to validate
      // P2P registration in the stubbed DOM.
      nfcManager.checkP2PRegistration('dummyManifestUrl');

      fakePromise.mFulfillToValue(true);

      assert.isFalse(spyAddEventListener.withArgs('shrinking-sent').calledOnce);
    });

    test('app not registered for onpeerready event - error', function() {
      // Setup Fake Promise to stub with:
      var fakePromise = new MockPromise();
      this.sinon.stub(MockNfc, 'checkP2PRegistration',
                      (manifestURL) => fakePromise);
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
      var spyRemoveEventListener = this.sinon.spy(window,
                                                  'removeEventListener');

      // An unprivilaged P2P UI would send message to NFC Manager to validate
      // P2P registration in the stubbed DOM.
      nfcManager.checkP2PRegistration('dummyManifestUrl');

      // Note: Error status is fired through the success code path.
      fakePromise.mFulfillToValue(false);
      stubDispatchEvent.getCall(0).calledWith({ type: 'shrinking-stop',
                                                bubbles: false });
      assert.isTrue(
        spyRemoveEventListener.withArgs('shrinking-sent').calledOnce);
    });

  });

  suite('_nfcSettingsChanged', function() {
    var stubChangeHWState;

    setup(function() {
      stubChangeHWState = this.sinon.stub(nfcManager, '_changeHardwareState');
    });

    teardown(function() {
      stubChangeHWState.restore();
    });

    test('enable NFC, Service.locked false', function() {
      window.Service.locked = false;

      nfcManager._nfcSettingsChanged(true);
      assert.isTrue(stubChangeHWState.withArgs(nfcManager.NFC_HW_STATE.ENABLING)
                                     .calledOnce);
    });

    test('enable NFC, Service.locked true', function() {
      window.Service.locked = true;

      nfcManager._nfcSettingsChanged(true);
      assert.isTrue(stubChangeHWState
                      .withArgs(nfcManager.NFC_HW_STATE.DISABLE_DISCOVERY)
                      .calledOnce);
    });

    test('Ignore enabling if NFC HW already enabled', function() {
      var stubIsActive = this.sinon.stub(nfcManager, 'isActive', () => true);

      nfcManager._nfcSettingsChanged(true);
      assert.isTrue(stubIsActive.calledOnce, 'isActive should be called');
      assert.isFalse(stubChangeHWState.called,
                     '_changeHardwareState should not be called');
    });

    test('Ignore disabling if NFC HW already disabled', function() {
      var stubIsActive = this.sinon.stub(nfcManager, 'isActive', () => false);

      nfcManager._nfcSettingsChanged(false);
      assert.isTrue(stubIsActive.calledOnce, 'isActive should be called');
      assert.isFalse(stubChangeHWState.called,
                     '_changeHardwareState should not be called');
    });

    test('Ignore enabling/disabling if NFC HW change in progress', function() {
      var stubIsInTransition = this.sinon.stub(nfcManager, 'isInTransition',
                                               () => true);
      nfcManager._nfcSettingsChanged(true);
      this.sinon.stub(nfcManager, 'isActive', () => true);
      nfcManager._nfcSettingsChanged(false);

      assert.isTrue(stubIsInTransition.calledTwice,
                    'isInTransition should be called twice');
      assert.isFalse(stubChangeHWState.called,
                     '_changeHardwareState should not be called');

    });

    test('disabling NFC', function() {
      nfcManager._hwState = nfcManager.NFC_HW_STATE.ON;

      nfcManager._nfcSettingsChanged(false);
      assert.isTrue(stubChangeHWState
                    .withArgs(nfcManager.NFC_HW_STATE.DISABLING)
                    .calledOnce);
    });
  });

  suite('_changeHardwareState', function() {
    var realNfc = navigator.mozNfc;

    setup(function() {
      navigator.mozNfc = MockNfc;
    });

    teardown(function() {
      navigator.mozNfc = realNfc;
    });

    test('proper mozNfc methods called', function() {
      var spyStartPoll = this.sinon.spy(MockNfc, 'startPoll');
      var spyStopPoll = this.sinon.spy(MockNfc, 'stopPoll');
      var spyPowerOff = this.sinon.spy(MockNfc, 'powerOff');

      var stubSettingsSet =
        this.sinon.stub(window.MockSettingsListener.getSettingsLock(),'set');

      nfcManager._changeHardwareState(nfcManager.NFC_HW_STATE.DISABLING);
      assert.isTrue(spyPowerOff.calledOnce, 'powerOff should be called once');
      assert.isTrue(stubSettingsSet.withArgs({'nfc.status':'disabling'})
                                   .calledOnce,
                    'nfc.status should be set to "disabling"');

      nfcManager._changeHardwareState(nfcManager.NFC_HW_STATE.ENABLING);
      assert.isTrue(spyStartPoll.calledOnce);
      assert.isTrue(stubSettingsSet.withArgs({'nfc.status':'enabling'})
                                   .calledOnce,
                    'nfc.status should be set to "enabling"');

      nfcManager._changeHardwareState(nfcManager.NFC_HW_STATE.ENABLE_DISCOVERY);
      assert.isTrue(spyStartPoll.calledTwice);

      nfcManager
      ._changeHardwareState(nfcManager.NFC_HW_STATE.DISABLE_DISCOVERY);
      assert.isTrue(spyStopPoll.calledOnce);

      assert.isTrue(stubSettingsSet.calledTwice, 'settings change 2 times');
    });

    suite('Promise handlers call proper methods.', function() {
      var fakePromise;

      var spyIsInTransition;
      var stubHandleNfcOnOff;

      setup(function() {
        fakePromise = new MockPromise();
        var returnRequest = () => fakePromise;

        this.sinon.stub(MockNfc, 'startPoll', returnRequest);
        this.sinon.stub(MockNfc, 'stopPoll', returnRequest);
        this.sinon.stub(MockNfc, 'powerOff', returnRequest);

        spyIsInTransition = this.sinon.spy(nfcManager, 'isInTransition');
        stubHandleNfcOnOff = this.sinon.stub(nfcManager, '_handleNFCOnOff');
      });

      teardown(function() {
        MockNfc.stopPoll.restore();
        MockNfc.startPoll.restore();
        MockNfc.powerOff.restore();

        spyIsInTransition.restore();
        stubHandleNfcOnOff.restore();
      });

      test('disabling, promise resolved', function() {
        nfcManager._changeHardwareState(nfcManager.NFC_HW_STATE.DISABLING);
        fakePromise.mFulfillToValue();

        assert.isTrue(spyIsInTransition.calledOnce);
        assert.isTrue(stubHandleNfcOnOff.withArgs(false).calledOnce);
      });

      test('disabling, promise rejected', function() {
        nfcManager._changeHardwareState(nfcManager.NFC_HW_STATE.DISABLING);
        fakePromise.mRejectToError();

        assert.isTrue(spyIsInTransition.calledOnce);
        assert.isTrue(stubHandleNfcOnOff.withArgs(true).calledOnce);
      });

      test('enabling, promise resolved', function() {
        nfcManager._changeHardwareState(nfcManager.NFC_HW_STATE.ENABLING);
        fakePromise.mFulfillToValue();

        assert.isTrue(spyIsInTransition.calledOnce);
        assert.isTrue(stubHandleNfcOnOff.withArgs(true).calledOnce);
      });

      test('enabling, promise rejected', function() {
        nfcManager._changeHardwareState(nfcManager.NFC_HW_STATE.ENABLING);
        fakePromise.mRejectToError();

        assert.isTrue(spyIsInTransition.calledOnce);
        assert.isTrue(stubHandleNfcOnOff.withArgs(false).calledOnce);
      });

      test('enable discovery, promise resolved', function() {
        nfcManager.
          _changeHardwareState(nfcManager.NFC_HW_STATE.ENABLE_DISCOVERY);
        fakePromise.mFulfillToValue();

        assert.isTrue(spyIsInTransition.calledOnce);
        assert.isFalse(stubHandleNfcOnOff.called);
      });

      test('disable discover, promise rejected', function() {
        nfcManager.
          _changeHardwareState(nfcManager.NFC_HW_STATE.DISABLE_DISCOVERY);
        fakePromise.mRejectToError();

        assert.isTrue(spyIsInTransition.calledOnce);
        assert.isFalse(stubHandleNfcOnOff.called);
      });
    });
  });

  suite('_handleNFCOnOff', function() {
    var stubSettingsSet;
    var stubDispatchEvt;

    setup(function() {
      stubSettingsSet =
        this.sinon.stub(window.MockSettingsListener.getSettingsLock(),'set');
      stubDispatchEvt = this.sinon.stub(window, 'dispatchEvent');
    });

    teardown(function() {
      stubSettingsSet.restore();
      stubDispatchEvt.restore();
    });

    test('isOn true', function() {
      nfcManager._handleNFCOnOff(true);

      assert.equal(nfcManager._hwState, nfcManager.NFC_HW_STATE.ON);
      assert.deepEqual(stubSettingsSet.firstCall.args[0],
                       {'nfc.status':'enabled'});
      assert.equal(stubDispatchEvt.firstCall.args[0].type,
                   'nfc-state-changed');
      assert.deepEqual(stubDispatchEvt.firstCall.args[0].detail,
                       { active: true });
    });

    test('isOn false', function() {
      nfcManager._handleNFCOnOff(false);

      assert.equal(nfcManager._hwState, nfcManager.NFC_HW_STATE.OFF);
      assert.deepEqual(stubSettingsSet.firstCall.args[0],
                       {'nfc.status':'disabled'});
      assert.equal(stubDispatchEvt.firstCall.args[0].type,
                   'nfc-state-changed');
      assert.deepEqual(stubDispatchEvt.firstCall.args[0].detail,
                       { active: false });
    });
  });
});
