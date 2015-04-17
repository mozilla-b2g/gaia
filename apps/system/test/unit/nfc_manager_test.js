'use strict';

/* globals MockPromise, MockNfc, MockBluetooth, MocksHelper, NDEF,
           MockService, NfcUtils, MozActivity, NfcHandoverManager,
           MockNfcHandoverManager, BaseModule, MockLazyLoader,
           MockScreenManager */

requireApp('system/test/unit/mock_lazy_loader.js');
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
requireApp('system/js/base_module.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/nfc_icon.js');
requireApp('system/js/nfc_manager.js');

var mocksForNfcManager = new MocksHelper([
  'AppWindow',
  'MozActivity',
  'ScreenManager',
  'SettingsListener',
  'NfcHandoverManager',
  'Service',
  'LazyLoader'
]).init();

var MockMessageHandlers = {};
function MockMozSetMessageHandler(event, handler) {
  MockMessageHandlers[event] = handler;
}

suite('Nfc Manager Functions', function() {
  var fakeApp;
  var realMozSetMessageHandler;
  var realMozBluetooth;
  var realMozNfc;
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

  var fakePrivateLandingPage = {
    url: 'app://system.gaiamobile.org/private_browser.html',
    manifest: {},
    origin: 'http://www.private',
    isPrivate: true
  };

  setup(function() {
    window.NfcHandoverManager = MockNfcHandoverManager;
    MockLazyLoader.mLaodRightAway = true;
    this.sinon.spy(MockLazyLoader, 'load');
    fakeApp = new window.AppWindow(fakeAppConfig);
    realMozSetMessageHandler = window.navigator.mozSetMessageHandler;
    window.navigator.mozSetMessageHandler = MockMozSetMessageHandler;

    realMozBluetooth = window.navigator.mozBluetooth;
    Object.defineProperty(navigator, 'mozBluetooth', {
      configurable: true,
      get: function() {
        return MockBluetooth;
      }
    });

    realMozNfc = window.navigator.mozNfc;
    window.navigator.mozNfc = MockNfc;

    nfcUtils = new NfcUtils();
    MockService.mTopMostWindow = fakeApp;
    nfcManager = BaseModule.instantiate('NfcManager');
    nfcManager.service = MockService;
    nfcManager.start();
  });

  teardown(function() {
    nfcManager.stop();
    window.navigator.mozSetMessageHandler = realMozSetMessageHandler;
    Object.defineProperty(navigator, 'mozBluetooth', {
      configurable: true,
      get: function() {
        return realMozBluetooth;
      }
    });

    window.navigator.mozNfc = realMozNfc;
  });

  suite('_start', function() {
    test('Should lazy load icon', function() {
      assert.isTrue(MockLazyLoader.load.calledWith(['js/nfc_icon.js']));
    });

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
      var stubScreenchange = this.sinon.stub(nfcManager,
                                             '_handle_screenchange');
      var stubLockscreenOn = this.sinon.stub(nfcManager,
                                             '_handle_lockscreen-appopened');
      var stubLockscreenOff = this.sinon.stub(nfcManager,
                                              '_handle_lockscreen-appclosed');

      window.dispatchEvent(new CustomEvent('lockscreen-appopened'));
      assert.isTrue(stubLockscreenOn.calledOnce);

      window.dispatchEvent(new CustomEvent('lockscreen-appclosed'));
      assert.isTrue(stubLockscreenOff.calledOnce);

      window.dispatchEvent(new CustomEvent('screenchange'));
      assert.isTrue(stubScreenchange.calledOnce);
    });

    test('SettingsListner callback nfc.enabled fired', function() {
      var enabled = 'test';
      var stubNfcSettingObserver = this.sinon.stub(nfcManager,
                                                   '_observe_nfc.enabled');

      nfcManager['_observe_nfc.enabled'](enabled);
      assert.isTrue(stubNfcSettingObserver.calledWith(enabled));
    });

    test('Sets nfc.status setting to disabled', function() {
      var stubWriteSetting = this.sinon.stub(nfcManager, 'writeSetting');

      nfcManager._start();
      assert.isTrue(stubWriteSetting.calledOnce);
      assert.deepEqual(stubWriteSetting.firstCall.args[0],
                       { 'nfc.status': 'disabled' });
    });
  });

  suite('_stop', function() {
    test('removes message handlers', function() {
      var setHandlerStub = this.sinon.stub(window.navigator,
                                           'mozSetMessageHandler');

      nfcManager._stop();
      assert.isTrue(setHandlerStub.withArgs('nfc-manager-tech-discovered', null)
                                  .calledOnce);
      assert.isTrue(setHandlerStub.withArgs('nfc-manager-tech-lost', null)
                                  .calledOnce);
    });
  });

  suite('isActive', function() {
    test('returns false if hardware state is OFF', function() {
      nfcManager._hwState = 'disabled';
      assert.isFalse(nfcManager.isActive());
    });

    test('returns false if hardware state is a transition state', function() {
      nfcManager._hwState = 'enabling';
      assert.isFalse(nfcManager.isActive());

      nfcManager._hwState = 'disabling';
      assert.isFalse(nfcManager.isActive());
    });

    test('returns true if hardware state is ON', function() {
      nfcManager._hwState = 'enabled';
      assert.isTrue(nfcManager.isActive());
    });

    test('returns true if hardware state is ENABLE_DISCOVERY', function() {
      nfcManager._hwState = 'polling-on';
      assert.isTrue(nfcManager.isActive());
    });

    test('returns true if hardware state is DISABLE_DISCOVERY', function() {
      nfcManager._hwState = 'polling-off';
      assert.isTrue(nfcManager.isActive());
    });
  });

  suite('_handle_<event_name>', function() {
    var  stubDoTransition;

    setup(function() {
      stubDoTransition = this.sinon.stub(nfcManager, '_doNfcStateTransition');
    });

    teardown(function() {
      stubDoTransition.restore();
    });

    test('lockscreen-appopened -> disable-polling', function() {
      window.dispatchEvent(new CustomEvent('lockscreen-appopened'));
      assert.isTrue(stubDoTransition.withArgs('disable-polling').calledOnce);
    });

    test('lockscreen-appclosed -> enable-polling', function() {
      window.dispatchEvent(new CustomEvent('lockscreen-appclosed'));
      assert.isTrue(stubDoTransition.withArgs('enable-polling').calledOnce);
    });

    test('screenchange -> enable-polling/disable-polling', function() {
      MockScreenManager.screenEnabled = false;
      window.dispatchEvent(new CustomEvent('screenchange'));
      assert.isTrue(stubDoTransition.withArgs('disable-polling').calledOnce);

      MockScreenManager.screenEnabled = true;
      MockService.locked = true;
      window.dispatchEvent(new CustomEvent('screenchange'));
      assert.isTrue(stubDoTransition.withArgs('disable-polling').calledTwice);

      MockService.locked = false;
      window.dispatchEvent(new CustomEvent('screenchange'));
      assert.isTrue(stubDoTransition.withArgs('enable-polling').calledOnce);
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

      nfcManager.nfcHandoverManager = MockNfcHandoverManager;
    });

    // Helper methods, can be called multiple times in testcase, stubs and spies
    // need to be restored here.
    // invalid message test helper
    var execInvalidMessageTest = function(msg) {
      var stubVibrate = this.sinon.stub(window.navigator, 'vibrate');
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
      var stubTryHandover = this.sinon.stub(NfcHandoverManager, 'tryHandover');
      var stubFireNDEF = this.sinon.stub(nfcManager, '_fireNDEFDiscovered');
      var stubCheckP2P = this.sinon.stub(nfcManager, '_checkP2PRegistration');

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
      var stub = this.sinon.stub(nfcManager, '_checkP2PRegistration');
      nfcManager._handleTechDiscovered(msg);
      assert.isTrue(stub.calledOnce);

      stub.restore();
    };

    test('valid message, proper methods called', function() {
      sampleMsg.records.push(sampleURIRecord);
      var stubVibrate = this.sinon.stub(window.navigator, 'vibrate');
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
      var stubTryHandover = this.sinon.stub(nfcManager.nfcHandoverManager,
        'tryHandover');

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
      var stubCleanP2PUI = this.sinon.stub(nfcManager, '_cleanP2PUI');

      nfcManager._handleTechLost();
      assert.isTrue(stubCleanP2PUI.calledOnce);
    });
  });

  suite('_doNfcStateTransition', function() {
    var events = ['enable', 'disable', 'enable-polling', 'disable-polling',
     'hw-change-success', 'hw-change-failure', 'unknown-event'];

    // { state: { event: new_state }}
    var stateTransitions = {
      'disabling': {
        'hw-change-success': 'disabled',
        'hw-change-failure': 'enabled'
      },
      'disabled': { 'enable': 'enabling' },
      'enabling': {
        'hw-change-success': 'enabled',
        'hw-change-failure': 'disabled'
      },
      'enabled': {
        'disable': 'disabling',
        'enable-polling': 'polling-on',
        'disable-polling': 'polling-off'
      },
      'polling-on': {
        'disable': 'disabling',
        'disable-polling': 'polling-off'
      },
      'polling-off': {
        'disable': 'disabling',
        'enable-polling': 'polling-on'
      }
    };

    Object.keys(stateTransitions).forEach(function(state) {
      test('"' + state + '" state transitions', function() {
        var stubProccessStateChange = this.sinon.stub(nfcManager,
                                                      '_processNfcStateChange');
        events.forEach(function(evt, idx) {
          nfcManager._hwState = state;
          nfcManager._doNfcStateTransition(evt);

          var expectedState = stateTransitions[state][evt] || state;
          assert.equal(nfcManager._hwState, expectedState,
                       state + '[' + evt + '] should be ' + expectedState);
        });

        assert.equal(stubProccessStateChange.callCount,
                     Object.keys(stateTransitions[state]).length,
                     '_processNfcStateChange should be called on transition');
      });
    });
  });

  suite('_processNfcStateChange', function() {
    var states = ['disabling', 'disabled', 'enabling', 'enabled',
                  'polling-off', 'polling-on'];

    var fakePromise;
    var stubPowerOff, stubStartPoll, stubStopPoll;
    var stubIconUpdate, stubWriteSetting, stubNfcTransition;

    setup(function() {
      fakePromise = new MockPromise();
      var handler = () => fakePromise;
      stubPowerOff = this.sinon.stub(MockNfc, 'powerOff', handler);
      stubStartPoll = this.sinon.stub(MockNfc, 'startPoll', handler);
      stubStopPoll = this.sinon.stub(MockNfc, 'stopPoll', handler);

      stubIconUpdate = this.sinon.stub(nfcManager.icon, 'update');
      stubWriteSetting = this.sinon.stub(nfcManager, 'writeSetting');
      stubNfcTransition = this.sinon.stub(nfcManager, '_doNfcStateTransition');
    });

    teardown(function() {
      stubPowerOff.restore();
      stubStartPoll.restore();
      stubStopPoll.restore();
      stubIconUpdate.restore();
      stubWriteSetting.restore();
      stubNfcTransition.restore();
    });

    states.forEach(function(state) {
      test('"' + state + '" state handlind', function() {
        nfcManager._hwState = state;
        nfcManager._processNfcStateChange();

        // icon updated in proper states
        if (state === 'enabled' || state === 'disabled') {
          assert.isTrue(stubIconUpdate.calledOnce,
                        'icon should be updated');
        } else {
          assert.isTrue(stubIconUpdate.notCalled,
                        'icon should not be update');
        }

        // write setting in proper states
        if (state === 'polling-on' || state === 'polling-off') {
          assert.isTrue(stubWriteSetting.notCalled,
                        'should not call writeSetting');
        } else {
          assert.isTrue(stubWriteSetting.calledOnce,
                        'should call writeSetting');
          assert.deepEqual(stubWriteSetting.firstCall.args[0],
                           { 'nfc.status': state });
        }

        // proper hw changes
        if (state === 'disabling') {
          assert.isTrue(stubPowerOff.calledOnce,
                        'mozNfc.powerOff should be called');
        } else {
          assert.isTrue(stubPowerOff.notCalled,
                        'mozNfc.powerOff should not be called');
        }

        if (state === 'enabling' || state === 'polling-on') {
          assert.isTrue(stubStartPoll.calledOnce,
                        'mozNfc.startPoll should be called');
        } else {
          assert.isTrue(stubStartPoll.notCalled,
                        'mozNfc.stopPoll should not be called');
        }

        if (state === 'polling-off') {
          assert.isTrue(stubStopPoll.calledOnce,
                        'mozNfc.stopPoll should be called');
        } else {
          assert.isTrue(stubStopPoll.notCalled,
                        'mozNfc.stopPoll should not be called');
        }

        // proper promise handling
        if (state === 'enabled' || state === 'disabled') {
          assert.isTrue(fakePromise.then.notCalled,
                        'then should not be called on promise');
        } else {
          fakePromise.mFulfillToValue();
          assert.isTrue(stubNfcTransition.withArgs('hw-change-success').called,
                        '_doNfcStateTransition(hw-change-success) not called');

          fakePromise.mRejectToError();
          assert.isTrue(stubNfcTransition.withArgs('hw-change-failure').called,
                        '_doNfcStateTransition(hw-change-failure) not called');
        }
      });
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

  suite('_cleanP2PUI', function() {
    test('removes "shrinking-sent" event listner', function() {
      var stubRemoveListener = this.sinon.stub(window, 'removeEventListener');
      var fakeListner = () => { return 'fake'; };
      nfcManager._handleShrinkingSent = fakeListner;

      nfcManager._cleanP2PUI();
      assert.isTrue(stubRemoveListener.calledOnce);
      assert.deepEqual(stubRemoveListener.firstCall.args,
                       ['shrinking-sent', fakeListner]);
    });

    test('publishes "shrinking-stop" event', function() {
      var stubPublish = this.sinon.stub(nfcManager, 'publish');

      nfcManager._cleanP2PUI();
      assert.isTrue(stubPublish.calledOnce);
      assert.deepEqual(stubPublish.firstCall.args,
                       ['shrinking-stop', nfcManager, true]);
    });
  });

  suite('_initP2PUI', function() {
    test('publishes "shrinking-start event"', function() {
      // prevents registering event listener handler
      this.sinon.stub(window, 'addEventListener');
      var stubPublish = this.sinon.stub(nfcManager, 'publish');

      nfcManager._initP2PUI();
      assert.isTrue(stubPublish.calledOnce);
      assert.deepEqual(stubPublish.firstCall.args,
                       ['shrinking-start', nfcManager, true]);
    });

    test('adds "shrinking-sent" event listner', function() {
      var stubAddListener = this.sinon.stub(window, 'addEventListener');

      nfcManager._initP2PUI();
      assert.isTrue(stubAddListener.calledOnce);
      assert.deepEqual(stubAddListener.firstCall.args,
                       ['shrinking-sent', nfcManager._handleShrinkingSent]);
    });

    test('"shrinking-sent" handler calls proper methods', function() {
      var stubCleanP2PUI = this.sinon.stub(nfcManager, '_cleanP2PUI');
      var stubDispatchP2P = this.sinon.stub(nfcManager,
                                            '_dispatchP2PUserResponse');

      nfcManager._initP2PUI();
      window.dispatchEvent(new CustomEvent('shrinking-sent'));

      assert.isTrue(stubCleanP2PUI.calledOnce, '_cleanP2PUI');
      assert.isTrue(stubDispatchP2P.calledOnce, '_dispatchP2PUserResponse');
    });
  });

  suite('_dispatchP2PUserResponse', function() {
    test('calls proper mozNfc method', function() {
      var stubNotifyAcceptedP2P = this.sinon.stub(MockNfc,
                                                  'notifyUserAcceptedP2P');
      nfcManager._dispatchP2PUserResponse();
      assert.isTrue(stubNotifyAcceptedP2P.withArgs(fakeAppConfig.manifestURL)
        .calledOnce);
    });
  });

  suite('_checkP2PRegistrations', function() {
    test('calls proper mozNfc method', function() {
      var stubCheckP2P = this.sinon.stub(MockNfc, 'checkP2PRegistration',
                                         () => { return Promise.resolve(); });

      nfcManager._checkP2PRegistration();
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

      nfcManager._checkP2PRegistration();

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

      nfcManager._checkP2PRegistration();

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

      nfcManager._checkP2PRegistration();

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

      nfcManager._checkP2PRegistration();

      // Note: Error status is fired through the success code path.
      fakePromise.mFulfillToValue(false);
      stubDispatchEvent.getCall(0).calledWith({ type: 'shrinking-stop',
                                                bubbles: false });
      assert.isTrue(
        spyRemoveEventListener.withArgs('shrinking-sent').calledOnce);
    });

    test('private browser landing page', function() {
      var fakePromise = new MockPromise();
      var stubCheckP2P = this.sinon.stub(MockNfc, 'checkP2PRegistration',
                                         () => fakePromise);

      MockService.mTopMostWindow = new window.AppWindow(fakePrivateLandingPage);

      this.sinon.stub(MockService.mTopMostWindow, 'isPrivateBrowser')
        .returns(true);

      // Should not shrink on the landing page.
      nfcManager._checkP2PRegistration();
      assert.isTrue(stubCheckP2P.notCalled);

      // Able to share pages after navigating.
      MockService.mTopMostWindow.config.url = 'http://mozilla.org';
      nfcManager._checkP2PRegistration();
      assert.isTrue(stubCheckP2P.calledOnce);
    });

  });
});
