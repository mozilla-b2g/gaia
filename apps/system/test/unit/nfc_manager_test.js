'use strict';

mocha.globals(['NfcManager', 'ScreenManager', 'SettingsListener',
      'System', 'addEventListener', 'removeEventListener',
      'dispatchEvent']);

/* globals MockDOMRequest, MockNfc, MocksHelper, MozNDEFRecord, NDEF,
           NfcUtils, NfcManager */

require('/shared/test/unit/mocks/mock_moz_ndefrecord.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/js/nfc_utils.js');
require('/shared/test/unit/mocks/mock_event_target.js');
require('/shared/test/unit/mocks/mock_dom_request.js');
require('/test/unit/mock_screen_manager.js');
requireApp('system/test/unit/mock_system.js');
requireApp('system/test/unit/mock_activity.js');
requireApp('system/test/unit/mock_nfc.js');
requireApp('system/test/unit/mock_screen_manager.js');
requireApp('system/test/unit/mock_settingslistener_installer.js');
requireApp('system/js/nfc_manager.js');

var mocksForNfcManager = new MocksHelper([
  'MozActivity',
  'MozNDEFRecord',
  'ScreenManager',
  'SettingsListener',
  'System'
]).init();

var MockMessageHandlers = {};
function MockMozSetMessageHandler(event, handler) {
  MockMessageHandlers[event] = handler;
}

suite('Nfc Manager Functions', function() {

  var realMozSetMessageHandler;

  mocksForNfcManager.attachTestHelpers();

  setup(function(done) {
    realMozSetMessageHandler = window.navigator.mozSetMessageHandler;
    window.navigator.mozSetMessageHandler = MockMozSetMessageHandler;

    requireApp('system/js/nfc_manager.js', done);
  });

  teardown(function() {
    window.navigator.mozSetMessageHandler = realMozSetMessageHandler;
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

    test('NfcManager listens on screenchange, lock, unlock events', function() {
      var stubHandleEvent = this.sinon.stub(NfcManager, 'handleEvent');

      window.dispatchEvent(new CustomEvent('lock'));
      assert.isTrue(stubHandleEvent.calledOnce);
      assert.equal(stubHandleEvent.getCall(0).args[0].type, 'lock');

      window.dispatchEvent(new CustomEvent('unlock'));
      assert.isTrue(stubHandleEvent.calledTwice);
      assert.equal(stubHandleEvent.getCall(1).args[0].type, 'unlock');

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
      NfcManager.handleEvent(new CustomEvent('lock'));
      assert.isTrue(stubChangeHardwareState.calledOnce);
      assert.equal(stubChangeHardwareState.getCall(0).args[0],
                   NfcManager.NFC_HW_STATE_DISABLE_DISCOVERY);

      // no change in NfcManager.hwState
      NfcManager.hwState = NfcManager.NFC_HW_STATE_DISABLE_DISCOVERY;
      NfcManager.handleEvent(new CustomEvent('screenchange'));
      assert.isTrue(stubChangeHardwareState.calledOnce);

      // screen unlock
      window.System.locked = false;
      NfcManager.handleEvent(new CustomEvent('unlock'));
      assert.isTrue(stubChangeHardwareState.calledTwice);
      assert.equal(stubChangeHardwareState.getCall(1).args[0],
                   NfcManager.NFC_HW_STATE_ENABLE_DISCOVERY);

      // NFC off
      NfcManager.hwState = NfcManager.NFC_HW_STATE_OFF;
      NfcManager.handleEvent(new CustomEvent('lock'));
      NfcManager.handleEvent(new CustomEvent('unlock'));
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

  suite('handleNdefMessage', function() {
    var execCommonTest = function(message, type) {
      var activityOptions = NfcManager.handleNdefMessage(message);

      assert.equal(activityOptions.name, 'nfc-ndef-discovered');
      assert.equal(activityOptions.data.type, type);
      assert.equal(activityOptions.data.records, message);

      return activityOptions;
    };

    test('TNF empty', function() {
      var dummyNdefMsg = [new MozNDEFRecord(NDEF.TNF_EMPTY, null, null, null)];
      execCommonTest(dummyNdefMsg, 'empty');
    });

    test('TNF well known rtd text utf 8', function() {
      var payload = new Uint8Array([0x02, 0x65, 0x6E, 0x48,
                                    0x65, 0x79, 0x21, 0x20,
                                    0x55, 0x54, 0x46, 0x2D,
                                    0x38, 0x20, 0x65, 0x6E]);
      var dummyNdefMsg = [new MozNDEFRecord(NDEF.TNF_WELL_KNOWN,
                                            NDEF.RTD_TEXT,
                                            new Uint8Array(),
                                            payload)];

      var activityOptions = execCommonTest(dummyNdefMsg, 'text');
      assert.equal(activityOptions.data.text, 'Hey! UTF-8 en');
      assert.equal(activityOptions.data.rtd, NDEF.RTD_TEXT);
      assert.equal(activityOptions.data.language, 'en');
      assert.equal(activityOptions.data.encoding, 'UTF-8');
    });

    /* should be uncommented once Bug 1003723 will be fixed 
    test('TNF well known rtd text utf 16', function() {
      var payload = Uint8Array([0x82, 0x65, 0x6E, 0xFF,
                                0xFE, 0x48, 0x00, 0x6F,
                                0x00, 0x21, 0x00, 0x20,
                                0x00, 0x55, 0x00, 0x54,
                                0x00, 0x46, 0x00, 0x2D,
                                0x00, 0x31, 0x00, 0x36,
                                0x00, 0x20, 0x00, 0x65,
                                0x00, 0x6E, 0x00]);
      var dummyNdefMsg = [new MozNDEFRecord(NDEF.TNF_WELL_KNOWN,
                                            NDEF.RTD_TEXT,
                                            new Uint8Array(),
                                            payload)];

      var activityOptions = execCommonTest(dummyNdefMsg);
      assert.equal(activityOptions.data.text, 'Ho! UTF-16 en');
      assert.equal(activityOptions.data.rtd, NDEF.RTD_TEXT);
      assert.equal(activityOptions.data.language, 'en');
      assert.equal(activityOptions.data.encoding, 'UTF-16');
    });*/

    test('TNF well known rtd uri', function() {
      var payload = new Uint8Array([0x04, 0x77, 0x69, 0x6B,
                                    0x69, 0x2E, 0x6D, 0x6F,
                                    0x7A, 0x69, 0x6C, 0x6C,
                                    0x61, 0x2E, 0x6F, 0x72,
                                    0x67]);
      var dummyNdefMsg = [new MozNDEFRecord(NDEF.TNF_WELL_KNOWN,
                                            NDEF.RTD_URI,
                                            new Uint8Array(),
                                            payload)];

      var activityOptions = execCommonTest(dummyNdefMsg, 'url');
      assert.equal(activityOptions.data.url, 'https://wiki.mozilla.org');
    });

    test('TNF well known rtd smart poster', function() {
      // smart poster handling is application specific, don't need payload
      var dummyNdefMsg = [new MozNDEFRecord(NDEF.TNF_WELL_KNOWN,
                                            NDEF.RTD_SMART_POSTER,
                                            new Uint8Array(),
                                            new Uint8Array())];
      execCommonTest(dummyNdefMsg, 'smartposter');
    });

    test('TNF mime media-type text/plain', function() {
      var type = new Uint8Array([0x74, 0x65, 0x78, 0x74,
                                 0x2F, 0x70, 0x6C, 0x61,
                                 0x69, 0x6E]);
      // What up?!
      var payload = new Uint8Array([0x57, 0x68, 0x61, 0x74,
                                    0x20, 0x75, 0x70, 0x3F,
                                    0x21]);
      var dummyNdefMsg = [new MozNDEFRecord(NDEF.TNF_MIME_MEDIA,
                                            type,
                                            new Uint8Array(),
                                            payload)];

      execCommonTest(dummyNdefMsg, 'text/plain');
    });

    test('TNF absolute uri', function() {
      // TNF_ABSOLUTE_URI has uri in the type
      var type = new Uint8Array([0x68, 0x74, 0x74, 0x70,
                                 0x3A, 0x2F, 0x2F, 0x6D,
                                 0x6F, 0x7A, 0x69, 0x6C,
                                 0x6C, 0x61, 0x2E, 0x6F,
                                 0x72, 0x67]);
      var dummyNdefMsg = [new MozNDEFRecord(NDEF.TNF_ABSOLUTE_URI,
                                            type,
                                            new Uint8Array(),
                                            new Uint8Array())];

      execCommonTest(dummyNdefMsg, 'http://mozilla.org');
    });

    test('TNF external type', function() {
      var type = new Uint8Array([0x6D, 0x6F, 0x7A, 0x69,
                                 0x6C, 0x6C, 0x61, 0x2E,
                                 0x6F, 0x72, 0x67, 0x3A,
                                 0x62, 0x75, 0x67]);
      var payload = new Uint8Array([0x31, 0x30, 0x30, 0x30,
                                    0x39, 0x38, 0x31]);
      var dummyNdefMsg = [new MozNDEFRecord(NDEF.TNF_EXTERNAL_TYPE,
                                            type,
                                            new Uint8Array(),
                                            payload)];

      execCommonTest(dummyNdefMsg, 'mozilla.org:bug');
    });

    test('TNF unknown, unchanged, reserved', function() {
      var pld = NfcUtils.fromUTF8('payload');
      var empt = new Uint8Array();
      var unknwn = [new MozNDEFRecord(NDEF.TNF_UNKNOWN, empt, empt, pld)];
      var unchngd = [new MozNDEFRecord(NDEF.TNF_UNCHANGED, empt, empt, pld)];
      var rsrvd = [new MozNDEFRecord(NDEF.TNF_RESERVED, empt, empt, pld)];

      execCommonTest(unknwn, undefined);
      execCommonTest(rsrvd, undefined);

      var activityUnchngd = NfcManager.handleNdefMessage(unchngd);
      assert.equal(activityUnchngd.name, 'nfc-ndef-discovered');
      assert.isUndefined(activityUnchngd.data.type);
      assert.isUndefined(activityUnchngd.data.records);
    });
  });

  suite('Activity Routing', function() {
    var vcard;
    var activityInjection1;
    var activityInjection2;
    var activityInjection3;

    setup(function() {
      vcard = 'BEGIN:VCARD\n';
      vcard += 'VERSION:2.1\n';
      vcard += 'N:Office;Mozilla;;;\n';
      vcard += 'FN:Mozilla Office\n';
      vcard += 'TEL;PREF:1-555-555-5555\n';
      vcard += 'END:VCARD';

      activityInjection1 = {
        type: 'techDiscovered',
        techList: ['P2P', 'NDEF'],
        records: [{
          tnf: NDEF.TNF_MIME_MEDIA,
          type: NfcUtils.fromUTF8('text/vcard'),
          id: new Uint8Array(),
          payload: NfcUtils.fromUTF8(vcard)
        }],
        sessionToken: '{e9364a8b-538c-4c9d-84e2-e6ce524afd17}'
      };
      activityInjection2 = {
        type: 'techDiscovered',
        techList: ['P2P', 'NDEF'],
        records: [{
          tnf: NDEF.TNF_MIME_MEDIA,
          type: NfcUtils.fromUTF8('text/x-vcard'),
          id: new Uint8Array(),
          payload: NfcUtils.fromUTF8(vcard)
        }],
        sessionToken: '{e9364a8b-538c-4c9d-84e2-e6ce524afd18}'
      };
      activityInjection3 = {
        type: 'techDiscovered',
        techList: ['P2P', 'NDEF'],
        records: [{
          tnf: NDEF.TNF_MIME_MEDIA,
          type: NfcUtils.fromUTF8('text/x-vCard'),
          id: new Uint8Array(),
          payload: NfcUtils.fromUTF8(vcard)
        }],
        sessionToken: '{e9364a8b-538c-4c9d-84e2-e6ce524afd19}'
      };
    });

    test('text/vcard', function() {
      var spyFormatVCardRecord = this.sinon.spy(NfcManager,
                                                'formatVCardRecord');

      NfcManager.handleTechnologyDiscovered(activityInjection1);
      assert.isTrue(spyFormatVCardRecord.calledOnce);

      NfcManager.handleTechnologyDiscovered(activityInjection2);
      assert.isTrue(spyFormatVCardRecord.calledTwice);

      NfcManager.handleTechnologyDiscovered(activityInjection3);
      assert.isTrue(spyFormatVCardRecord.calledThrice);
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
        'shrinking-rejected');
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
