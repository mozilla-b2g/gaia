'use strict';

/* globals MockDOMRequest, MockNfc, MocksHelper, NDEF,
           NfcUtils, NfcManager, MozActivity, NfcHandoverManager */

require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/js/nfc_utils.js');
require('/shared/test/unit/mocks/mock_event_target.js');
require('/shared/test/unit/mocks/mock_dom_request.js');
require('/test/unit/mock_screen_manager.js');
requireApp('system/test/unit/mock_activity.js');
requireApp('system/test/unit/mock_nfc.js');
requireApp('system/test/unit/mock_nfc_handover_manager.js');
requireApp('system/test/unit/mock_screen_manager.js');
requireApp('system/test/unit/mock_bluetooth.js');
require('/shared/test/unit/mocks/mock_system.js');

var mocksForNfcManager = new MocksHelper([
  'MozActivity',
  'ScreenManager',
  'SettingsListener',
  'NfcHandoverManager',
  'System'
]).init();

var MockMessageHandlers = {};
function MockMozSetMessageHandler(event, handler) {
  MockMessageHandlers[event] = handler;
}

suite('Nfc Manager Functions', function() {

  var realMozSetMessageHandler;
  var realMozBluetooth;

  mocksForNfcManager.attachTestHelpers();

  setup(function(done) {
    realMozSetMessageHandler = window.navigator.mozSetMessageHandler;
    window.navigator.mozSetMessageHandler = MockMozSetMessageHandler;
    realMozBluetooth = window.navigator.mozBluetooth;
    window.navigator.mozBluetooth = window.MockBluetooth;

    requireApp('system/js/nfc_manager.js', done);
  });

  teardown(function() {
    window.navigator.mozSetMessageHandler = realMozSetMessageHandler;
    window.mozBluetooth = realMozBluetooth;
  });

  suite('init', function() {
    test('Message handleres for nfc-manager-tech-xxx set', function() {
      var stubHandleTechnologyDiscovered =
        this.sinon.stub(NfcManager, 'handleTechnologyDiscovered');
      var stubHandleTechLost = this.sinon.stub(NfcManager, 'handleTechLost');

      // calling init once more to register stubs as handlers
      NfcManager.init();

      MockMessageHandlers['nfc-manager-tech-discovered']();
      assert.isTrue(stubHandleTechnologyDiscovered.calledOnce);

      MockMessageHandlers['nfc-manager-tech-lost']();
      assert.isTrue(stubHandleTechLost.calledOnce);
    });

    test('NfcManager listens on screenchange, and the locking events',
    function() {
      var stubHandleEvent = this.sinon.stub(NfcManager, 'handleEvent');

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
      var stubChangeHardwareState = this.sinon.stub(NfcManager,
                                               'changeHardwareState');

      window.MockSettingsListener.mCallbacks['nfc.enabled'](true);
      assert.isTrue(stubChangeHardwareState.calledOnce);
      assert.equal(stubChangeHardwareState.getCall(0).args[0],
                   NfcManager.NFC_HW_STATE_ON);

      window.MockSettingsListener.mCallbacks['nfc.enabled'](false);
      assert.isTrue(stubChangeHardwareState.calledTwice);
      assert.equal(stubChangeHardwareState.getCall(1).args[0],
                   NfcManager.NFC_HW_STATE_OFF);

      window.System.locked = true;
      window.MockSettingsListener.mCallbacks['nfc.enabled'](true);
      assert.isTrue(stubChangeHardwareState.calledThrice);
      assert.equal(stubChangeHardwareState.getCall(2).args[0],
                   NfcManager.NFC_HW_STATE_DISABLE_DISCOVERY);
      window.System.locked = false;
    });
  });

  suite('handleEvent', function() {
    test('proper handling of lock, unlock, screenchange', function() {
      var stubChangeHardwareState = this.sinon.stub(NfcManager,
                                                   'changeHardwareState');

      // screen lock when NFC ON
      NfcManager.hwState = NfcManager.NFC_HW_STATE_ON;
      window.System.locked = true;
      NfcManager.handleEvent(new CustomEvent('lockscreen-appopened'));
      assert.isTrue(stubChangeHardwareState.calledOnce);
      assert.equal(stubChangeHardwareState.getCall(0).args[0],
                   NfcManager.NFC_HW_STATE_DISABLE_DISCOVERY);

      // no change in NfcManager.hwState
      NfcManager.hwState = NfcManager.NFC_HW_STATE_DISABLE_DISCOVERY;
      NfcManager.handleEvent(new CustomEvent('screenchange'));
      assert.isTrue(stubChangeHardwareState.calledOnce);

      // screen unlock
      window.System.locked = false;
      NfcManager.handleEvent(new CustomEvent('lockscreen-appclosed'));
      assert.isTrue(stubChangeHardwareState.calledTwice);
      assert.equal(stubChangeHardwareState.getCall(1).args[0],
                   NfcManager.NFC_HW_STATE_ENABLE_DISCOVERY);

      // NFC off
      NfcManager.hwState = NfcManager.NFC_HW_STATE_OFF;
      NfcManager.handleEvent(new CustomEvent('lockscreen-appopened'));
      NfcManager.handleEvent(new CustomEvent('lockscreen-appclosed'));
      NfcManager.handleEvent(new CustomEvent('screenchange'));
      assert.isTrue(stubChangeHardwareState.calledTwice);
    });

    test('proper handling of shrinking-sent', function() {
      var stubRemoveEventListner = this.sinon.stub(window,
                                                   'removeEventListener');
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');

      NfcManager.handleEvent(new CustomEvent('shrinking-sent'));

      assert.isTrue(stubRemoveEventListner.calledOnce);
      assert.equal(stubRemoveEventListner.getCall(0).args[0], 'shrinking-sent');
      assert.equal(stubRemoveEventListner.getCall(0).args[1], NfcManager);

      assert.isTrue(stubDispatchEvent.calledTwice);
      assert.equal(stubDispatchEvent.getCall(0).args[0].type,
                   'dispatch-p2p-user-response-on-active-app');
      assert.equal(stubDispatchEvent.getCall(0).args[0].detail, NfcManager);
      assert.equal(stubDispatchEvent.getCall(1).args[0].type, 'shrinking-stop');
    });
  });

  suite('handleTechnologyDiscovered', function() {
    var sampleMsg;
    var sampleURIRecord;
    var sampleMimeRecord;

    setup(function() {
      sampleMsg = {
        type: 'techDiscovered',
        techList: [],
        records: [],
        sessionToken: 'sessionToken'
      };

      // NDEF TNF well know uri unabbreviated
      sampleURIRecord = {
        tnf: NDEF.TNF_WELL_KNOWN,
        type: NDEF.RTD_URI,
        id: new Uint8Array([1]),
        payload: NfcUtils.fromUTF8('\u0000http://mozilla.org')
      };

      sampleMimeRecord = {
        tnf: NDEF.TNF_MIME_MEDIA,
        type: NfcUtils.fromUTF8('text/vcard'),
        id: new Uint8Array([2]),
        payload: NfcUtils.fromUTF8('BEGIN:VCARD\nVERSION:2.1\nN:J;\nEND:VCARD')
      };

    });

    // Helper methods, can be called multiple times in testcase, stubs and spies
    // need to be restored here.
    // invalid message test helper
    var execInvalidMessageTest = function(msg) {
      var stubVibrate = this.sinon.stub(window.navigator, 'vibrate');
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
      var stubTryHandover = this.sinon.stub(NfcHandoverManager, 'tryHandover');
      var stubFireTag = this.sinon.stub(NfcManager, 'fireTagDiscovered');
      var validMsg = {techList: [], records: []};

      NfcManager.handleTechnologyDiscovered(msg);

      assert.isTrue(stubVibrate.withArgs([25, 50, 125]).calledOnce,
                    'wrong vibrate, when msg: ' + msg);
      assert.isTrue(stubDispatchEvent.calledOnce,
                    'dispatchEvent not called once, when msg: ' + msg);
      assert.equal(stubDispatchEvent.getCall(0).args[0].type,
                   'nfc-tech-discovered',
                   'when msg ' + msg);
      assert.isTrue(stubTryHandover.withArgs(validMsg.records, undefined)
                                   .calledOnce, 'handover, when msg: ' + msg);
      assert.isTrue(stubFireTag.withArgs(validMsg, 'Unknown').calledOnce,
                    'fireTagDiscovered, when msg: ' + msg);

      stubVibrate.restore();
      stubDispatchEvent.restore();
      stubTryHandover.restore();
      stubFireTag.restore();
    };

    // fireNDEFDiscovered test helper
    var execNDEFMessageTest = function(msg, tech) {
      var stub = this.sinon.stub(NfcManager, 'fireNDEFDiscovered');

      NfcManager.handleTechnologyDiscovered(msg);
      assert.isTrue(stub.withArgs(msg, tech).calledOnce);

      stub.restore();
    };

    // fireTagDiscovered test helper
    var execTagDiscoveredTest = function(msg, tech) {
      var stub = this.sinon.stub(NfcManager, 'fireTagDiscovered');

      NfcManager.handleTechnologyDiscovered(msg);
      assert.deepEqual(stub.firstCall.args[0], msg);
      assert.equal(stub.firstCall.args[1], tech);

      stub.restore();
    };

    test('invalid message handling', function() {
      execInvalidMessageTest.call(this, null);
      execInvalidMessageTest.call(this, {});
      execInvalidMessageTest.call(this, {techList: 'invalid'});
      execInvalidMessageTest.call(this, {techList: []});
    });

    // triggering of P2P UI
    test('message tech [P2P], no records', function() {
      sampleMsg.techList.push('P2P');

      var spyTriggerP2PUI = this.sinon.spy(NfcManager, 'triggerP2PUI');
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');

      NfcManager.handleTechnologyDiscovered(sampleMsg);
      assert.isTrue(spyTriggerP2PUI.calledOnce);
      assert.equal(stubDispatchEvent.secondCall.args[0].type,
                   'check-p2p-registration-for-active-app');
    });

    // P2P shared NDEF received
    test('message tech [P2P, NDEF], one record', function() {
      sampleMsg.techList.push('P2P');
      sampleMsg.techList.push('NDEF');
      sampleMsg.records.push(sampleMimeRecord);

      execNDEFMessageTest.call(this, sampleMsg, 'P2P');
    });

    test('message tech [NDEF], one URI record', function() {
      sampleMsg.techList.push('NDEF');
      sampleMsg.records.push(sampleURIRecord);

      execNDEFMessageTest.call(this, sampleMsg, 'NDEF');
    });

    // NDEF with no records was previosly treated as a special case
    // right now it is handled regularly in fireNDEFDiscovered
    test('message tech [NDEF], no records', function() {
      sampleMsg.techList.push('NDEF');

      execNDEFMessageTest.call(this, sampleMsg, 'NDEF');
    });

    // NDEF_WRITABLE is a flag which informs that it's possible to write
    // NDEF message on a tag, might have NDEF records
    test('message tech [NDEF_WRITEABLE]', function() {
      sampleMsg.techList.push('NDEF_WRITEABLE');

      execNDEFMessageTest.call(this, sampleMsg, 'NDEF_WRITEABLE');
    });

    test('message tech [NDEF_FORMATABLE]', function() {
      sampleMsg.techList.push('NDEF_FORMATABLE');
      sampleMsg.records.push = 'propriatary data';

      execTagDiscoveredTest.call(this, sampleMsg, 'NDEF_FORMATABLE');
    });

    test('message tech unsupported', function() {
      sampleMsg.techList.push('FAKE_TECH');

      execTagDiscoveredTest.call(this, sampleMsg, 'FAKE_TECH');
    });

    test('activities triggering end 2 end', function() {
      // empty record
      var empty = { tnf: NDEF.TNF_EMPTY };

      sampleMsg.techList.push('NDEF');
      sampleMsg.techList.push('NDEF_WRITEABLE');
      sampleMsg.records.push(sampleURIRecord);
      sampleMsg.records.push(empty);
      sampleMsg.records.push(sampleMimeRecord);

      this.sinon.stub(window, 'MozActivity');

      NfcManager.handleTechnologyDiscovered(sampleMsg);

      assert.deepEqual(MozActivity.firstCall.args[0], {
        name: 'nfc-ndef-discovered',
        data: {
                type: 'url',
                url: 'http://mozilla.org',
                records: sampleMsg.records,
                tech: 'NDEF',
                techList: sampleMsg.techList,
                sessionToken: sampleMsg.sessionToken
        }
      }, 'Uri record');

      sampleMsg.records.shift();
      NfcManager.handleTechnologyDiscovered(sampleMsg);
      assert.deepEqual(MozActivity.secondCall.args[0], {
        name: 'nfc-ndef-discovered',
        data: {
          type: 'empty',
          tech: 'NDEF',
          techList: sampleMsg.techList,
          records: sampleMsg.records,
          sessionToken: sampleMsg.sessionToken
        }
      },'TNF empty');

      sampleMsg.records.shift();
      NfcManager.handleTechnologyDiscovered(sampleMsg);
      assert.deepEqual(MozActivity.thirdCall.args[0], {
        name: 'import',
        data: {
          type: 'text/vcard',
          blob: new Blob([NfcUtils.toUTF8(sampleMsg.records.payload)],
                         {'type': 'text/vcard'}),
          tech: 'NDEF',
          techList: sampleMsg.techList,
          records: sampleMsg.records,
          sessionToken: sampleMsg.sessionToken
        }
      },'mime record');

      sampleMsg.records.shift();
      sampleMsg.techList.shift();
      NfcManager.handleTechnologyDiscovered(sampleMsg);
      assert.deepEqual(MozActivity.lastCall.args[0], {
        name: 'nfc-ndef-discovered',
        data: {
          type: 'empty',
          tech: 'NDEF_WRITEABLE',
          techList: sampleMsg.techList,
          records: sampleMsg.records,
          sessionToken: sampleMsg.sessionToken
        }
      }, 'no records');
    });
  });

  suite('fireNDEFDiscovered', function() {
    var msg;
    var uriRecord;

    setup(function() {
      msg = {
        type: 'techDiscovered',
        techList: [],
        records: [],
        sessionToken: 'sessionToken'
      };

      uriRecord = {
        tnf: NDEF.TNF_WELL_KNOWN,
        type: NDEF.RTD_URI,
        id: new Uint8Array([1]),
        payload: NfcUtils.fromUTF8('\u0000http://mozilla.org')
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
        msg.records.push(uriRecord);
        msg.records.push({tnf: NDEF.TNF_EMPTY});
        msg.techList.push('NDEF');

        NfcManager.fireNDEFDiscovered(msg, msg.techList[0]);
        assert.isTrue(stubDecodePayload.withArgs(uriRecord.tnf,
                                                 uriRecord.type,
                                                 uriRecord.payload)
                                       .calledOnce);
      });

      test('SP (Smart Poster) takes precedence over URI record', function() {
        msg.records.push(uriRecord);
        msg.records.push(smartPoster);
        msg.techList.push('NDEF');

        NfcManager.fireNDEFDiscovered(msg, msg.techList[0]);
        assert.isTrue(stubDecodePayload.withArgs(smartPoster.tnf,
                                                 smartPoster.type,
                                                 smartPoster.payload)
                                       .calledOnce);
      });

      test('SP doesnt take precedence over other records', function() {
        msg.records.push({tnf: NDEF.TNF_EMPTY});
        msg.records.push(smartPoster);
        msg.techList.push('NDEF');

        NfcManager.fireNDEFDiscovered(msg, msg.techList[0]);
        assert.isTrue(stubDecodePayload.withArgs(NDEF.TNF_EMPTY,
                                                 undefined,
                                                 undefined)
                                       .calledOnce);
      });

      test('Empty NDEF message', function() {
        msg.techList.push('NDEF');

        NfcManager.fireNDEFDiscovered(msg, msg.techList[0]);
        assert.isTrue(stubDecodePayload.withArgs(NDEF.TNF_EMPTY,
                                                 undefined,
                                                 undefined)
                                       .calledOnce);
      });
    }),

    test('getSmartPoster called with proper arg', function() {
      msg.records.push(uriRecord);
      msg.techList.push('NDEF');

      var spyGetSmartPoster = this.sinon.spy(NfcManager, 'getSmartPoster');

      NfcManager.fireNDEFDiscovered(msg, msg.techList[0]);
      assert.isTrue(spyGetSmartPoster.withArgs(msg.records).calledOnce);
    }),

    test('createNDEFActivityOptions called with proper args', function() {
      msg.records.push(uriRecord);
      msg.techList.push('NDEF');

      this.sinon.stub(NDEF.payload, 'decode', () => 'decoded');
      var spyCreateOptions = this.sinon.spy(NfcManager,
                                            'createNDEFActivityOptions');

      NfcManager.fireNDEFDiscovered(msg, msg.techList[0]);
      assert.isTrue(spyCreateOptions.withArgs('decoded').calledOnce);
    }),

    test('MozActivity called with proper args, valid NDEF', function() {
      msg.records.push(uriRecord);
      msg.techList.push('NDEF');

      NfcManager.fireNDEFDiscovered(msg, msg.techList[0]);
      assert.deepEqual(MozActivity.firstCall.args[0], {
        name: 'nfc-ndef-discovered',
        data: {
                type: 'url',
                url: 'http://mozilla.org',
                records: msg.records,
                tech: msg.techList[0],
                techList: msg.techList,
                sessionToken: msg.sessionToken
        }
      });
    });

    test('MozActivity called with proper args, invalid NDEF', function() {
      msg.techList.push('NDEF');

      this.sinon.stub(NDEF.payload, 'decode', () => null);

      NfcManager.fireNDEFDiscovered(msg, msg.techList[0]);
      assert.deepEqual(MozActivity.firstCall.args[0], {
        name: 'nfc-ndef-discovered',
        data: {
                tech: msg.techList[0],
                techList: msg.techList,
                sessionToken: msg.sessionToken
        }
      });
    });
  }),

  suite('fireTagDiscovered', function() {
    var msg = {
      sessionToken: 'token',
      techList: ['NDEF_FORMATABLE', 'ISODEP', 'FAKE_TECH'],
      type: 'techDiscovered',
      records: []
    };

    test('NDEF_FORMATABLE tech type', function() {
      this.sinon.stub(window, 'MozActivity');
      var dummyMsg = Object.create(msg);

      NfcManager.fireTagDiscovered(dummyMsg, dummyMsg.techList[0]);
      assert.deepEqual(MozActivity.getCall(0).args[0],
                       {
                         name: 'nfc-tag-discovered',
                         data: {
                           type: 'NDEF_FORMATABLE',
                           techList: dummyMsg.techList,
                           sessionToken: dummyMsg.sessionToken,
                           records: dummyMsg.records
                         }
                       });
    });
  });

  suite('NFC Manager Dispatch Events', function() {
    var aUUID = '{4f4787c4-51f0-4288-8caf-55d440303b0b}';
    var vcard;
    var realMozNfc;

    setup(function() {
      vcard = 'BEGIN:VCARD\n';
      vcard += 'VERSION:2.1\n';
      vcard += 'END:VCARD';

      // realMozNfc requires platform support, use a Mock
      realMozNfc = navigator.mozNfc;
      navigator.mozNfc = MockNfc;
    });

    teardown(function() {
      navigator.mozNfc = realMozNfc;
    });

    test('NFC Manager Outgoing DispatchEvents', function() {
      var command = {
        sessionToken: aUUID,
        techList: ['NDEF'],
        records: [{
          tnf: NDEF.TNF_MIME_MEDIA,
          type: NfcUtils.fromUTF8('text/vcard'),
          id: new Uint8Array(),
          payload: NfcUtils.fromUTF8(vcard)
        }]
      };

      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');

      NfcManager.handleTechnologyDiscovered(command);
      assert.isTrue(stubDispatchEvent.calledOnce);
      assert.equal(stubDispatchEvent.getCall(0).args[0].type,
                   'nfc-tech-discovered');

      NfcManager.handleTechLost(command);
      assert.isTrue(stubDispatchEvent.calledThrice);
      assert.equal(stubDispatchEvent.getCall(1).args[0].type, 'nfc-tech-lost');
      assert.equal(stubDispatchEvent.getCall(2).args[0].type,
        'shrinking-stop');
    });

    test('NFC Manager P2P: checkP2PRegistration success', function() {
      // Setup Fake DOMRequest to stub with:
      var fakeDOMRequest = new MockDOMRequest();
      this.sinon.stub(navigator.mozNfc, 'checkP2PRegistration',
                                        function(manifest) {
                                          return fakeDOMRequest;
                                        });
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
      var spyAddEventListener = this.sinon.spy(window, 'addEventListener');

      // An unprivilaged P2P UI would send message to NFC Manager to validate
      // P2P registration in the stubbed DOM.
      NfcManager.checkP2PRegistration('dummyManifestUrl');

      fakeDOMRequest.fireSuccess(true);
      stubDispatchEvent.getCall(0).calledWith({ type: 'shrinking-start',
                                                bubbles: false });
      assert.isTrue(spyAddEventListener.withArgs('shrinking-sent').calledOnce);
    });

    test('NFC Manager P2P: checkP2PRegistration error', function() {
      // Setup Fake DOMRequest to stub with:
      var fakeDOMRequest = new MockDOMRequest();
      this.sinon.stub(navigator.mozNfc, 'checkP2PRegistration',
                                        function(manifestURL) {
                                          return fakeDOMRequest;
                                        });
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
      var spyRemoveEventListener = this.sinon.spy(window,
                                                  'removeEventListener');

      // An unprivilaged P2P UI would send message to NFC Manager to validate
      // P2P registration in the stubbed DOM.
      NfcManager.checkP2PRegistration('dummyManifestUrl');

      // Note: Error status is fired through the success code path.
      fakeDOMRequest.fireSuccess(false);
      stubDispatchEvent.getCall(0).calledWith({ type: 'shrinking-stop',
                                                bubbles: false });
      assert.isTrue(
        spyRemoveEventListener.withArgs('shrinking-sent').calledOnce);
    });

  });

  suite('NFC Manager getPrioritizedTech test', function() {
    var techList1 = ['NDEF_WRITEABLE', 'P2P', 'NDEF', 'NDEF_FORMATABLE'];
    var techList2 = ['NDEF_WRITEABLE', 'NDEF', 'NDEF_FORMATABLE'];
    var techList3 = ['NDEF_WRITEABLE', 'NDEF', 'NFC_ISO_DEP'];
    var techList4 = [];

    test('techList P2P test', function() {
      var tech = NfcManager.getPrioritizedTech(techList1);
      assert.equal(tech, 'P2P');
    });

    test('techList NDEF test', function() {
      var tech = NfcManager.getPrioritizedTech(techList2);
      assert.equal(tech, 'NDEF');
    });

    test('techList Unsupported technology test', function() {
      var tech = NfcManager.getPrioritizedTech(techList3);
      assert.equal(tech, 'NDEF');
    });

    test('techList empty', function() {
      var tech = NfcManager.getPrioritizedTech(techList4);
      assert.equal(tech, 'Unknown');
    });
  });

  suite('NFC Manager changeHardwareState test', function() {
    var realNfc = navigator.mozNfc;

    setup(function() {
      navigator.mozNfc = MockNfc;
    });

    teardown(function() {
      navigator.mozNfc = realNfc;
    });

    test('NFC Manager startPoll', function() {
      var spyStartPoll = this.sinon.spy(MockNfc, 'startPoll');
      var spyStopPoll = this.sinon.spy(MockNfc, 'stopPoll');
      var spyPowerOff = this.sinon.spy(MockNfc, 'powerOff');
      var spyDispatchEvent = this.sinon.spy(window, 'dispatchEvent');

      NfcManager.changeHardwareState(NfcManager.NFC_HW_STATE_OFF);
      assert.isTrue(spyPowerOff.calledOnce);
      assert.isTrue(spyDispatchEvent.calledOnce);

      NfcManager.changeHardwareState(NfcManager.NFC_HW_STATE_ON);
      assert.isTrue(spyStartPoll.calledOnce);
      assert.isTrue(spyDispatchEvent.calledTwice);

      NfcManager.changeHardwareState(NfcManager.NFC_HW_STATE_ENABLE_DISCOVERY);
      assert.isTrue(spyStartPoll.calledTwice);

      NfcManager.changeHardwareState(NfcManager.NFC_HW_STATE_DISABLE_DISCOVERY);
      assert.isTrue(spyStopPoll.calledOnce);
    });
  });
});
