'use strict';

/* globals NfcConnectSystemDialog, document, MockL10n,
            MockBluetooth  */

requireApp('system/test/unit/mock_l10n.js');
requireApp('system/test/unit/mock_bluetooth.js');

suite('NfcConnectSystemDialog', function() {

  var realMozL10n;
  var realMozBluetooth;

  var stubGetElementById;
  var stubQuerySelector;

  setup(function(done) {
    realMozL10n = navigator.mozL10n;
    realMozBluetooth = navigator.mozBluetooth;

    navigator.mozL10n = MockL10n;
    navigator.mozBluetooth = MockBluetooth;

    // Stub necessary DOM calls.
    stubGetElementById = this.sinon.stub(document, 'getElementById',
      function() {
        return document.createElement('div');
      });

    stubQuerySelector = this.sinon.stub(document, 'querySelector',
      function() {
        return document.createElement('button');
      });

    requireApp('system/js/base_ui.js');
    requireApp('system/js/system_dialog.js');
    requireApp('system/js/system_nfc_connect_dialog.js', done);
  });

  teardown(function() {
    navigator.mozL10n = realMozL10n;
    navigator.mozBluetooth = realMozBluetooth;
    stubGetElementById.restore();
    stubQuerySelector.restore();
  });

  // This suite tests whether all three dialog events are sent:
  // "system-dialog-created", "system-dialog-show", "system-dialog-hide".
  // (see: Bug 1007569 - "system-dialog-hide" was never dispatched)
  suite('Dialog lifecycle', function() {
    var nfcDialog;
    var spyDispatchEvent;

    setup(function() {
      spyDispatchEvent = this.sinon.spy(window, 'dispatchEvent');

      nfcDialog = new NfcConnectSystemDialog();
      nfcDialog.show(null, function() {}, function() {});
    });

    teardown(function() {
      spyDispatchEvent.restore();
    });

    test('After confirmed, dismissed properly.', function() {
      nfcDialog.buttonOK.click();

      assert.equal(spyDispatchEvent.callCount, 3);
      assert.equal(spyDispatchEvent.getCall(0).args[0].type,
        'system-dialog-created');
      assert.equal(spyDispatchEvent.getCall(1).args[0].type,
        'system-dialog-show');
      assert.equal(spyDispatchEvent.getCall(2).args[0].type,
        'system-dialog-hide');
    });

    test('After canceled, dismissed properly.', function() {
      nfcDialog.buttonCancel.click();

      assert.equal(spyDispatchEvent.callCount, 3);
      assert.equal(spyDispatchEvent.getCall(0).args[0].type,
        'system-dialog-created');
      assert.equal(spyDispatchEvent.getCall(1).args[0].type,
        'system-dialog-show');
      assert.equal(spyDispatchEvent.getCall(2).args[0].type,
        'system-dialog-hide');
    });
  });

  suite('Buttons', function() {
    var nfcDialog;
    var stubConfirm;
    var stubCancel;

    setup(function() {
      stubConfirm = this.sinon.spy();
      stubCancel = this.sinon.spy();

      nfcDialog = new NfcConnectSystemDialog();
      nfcDialog.show(null, stubConfirm, stubCancel);
    });

    teardown(function() {
      nfcDialog.hide();
    });

    test('Cancel button calls only cancel callback', function() {
      nfcDialog.buttonCancel.click();
      assert.isTrue(stubCancel.calledOnce);
      assert.isTrue(stubConfirm.notCalled);
    });

    test('Confirm button calls only confirm callback', function() {
      nfcDialog.buttonOK.click();
      assert.isTrue(stubCancel.notCalled);
      assert.isTrue(stubConfirm.calledOnce);
    });
  });

  suite('L10n', function() {
    var realL10n;
    var nfcDialog;

    setup(function() {
      realL10n = navigator.mozL10n;
      navigator.mozL10n = MockL10n;

      nfcDialog = new NfcConnectSystemDialog();
    });

    teardown(function() {
      navigator.mozL10n = realL10n;
      nfcDialog.hide();
    });

    var assertTextContent = function(btEnabled, btName, el, expected) {
      MockBluetooth.enabled = btEnabled;
      nfcDialog.show(btName);
      assert.equal(nfcDialog[el].textContent, expected);
    };

    test('BT enabled, button OK', function() {
      assertTextContent(true, null, 'buttonOK', 'yes');
    });

    test('BT disabled, button OK', function() {
      assertTextContent(false, null, 'buttonOK',
        'confirmNFCConnectBTdisabled');
    });

    test('BT enabled, button cancel', function() {
      assertTextContent(true, null, 'buttonCancel', 'no');
    });

    test('BT disabled, button cancel', function() {
      assertTextContent(false, null, 'buttonCancel',
        'dismissNFCConnectBTdisabled');
    });

    test('BT enabled, no BT name, message', function() {
      assertTextContent(true, null, 'confirmNFCConnectMsg',
        'confirmNFCConnectBTenabledNameUnknown{"deviceName":null}');
    });

    test('BT enabled, with BT name, message', function() {
      assertTextContent(true, 'xyz 123', 'confirmNFCConnectMsg',
        'confirmNFCConnectBTenabledNameKnown{"deviceName":"xyz 123"}');
    });

    test('BT disabled, no BT name, message', function() {
      assertTextContent(false, null, 'confirmNFCConnectMsg',
        'confirmNFCConnectBTdisabledNameUnknown{"deviceName":null}');
    });

    test('BT disabled, with BT name, message', function() {
      assertTextContent(false, 'xyz 123', 'confirmNFCConnectMsg',
        'confirmNFCConnectBTdisabledNameKnown{"deviceName":"xyz 123"}');
    });

    test('Dialog title', function() {
      var spyTranslate = this.sinon.spy(MockL10n, 'translate');
      nfcDialog.show();
      assert.isTrue(spyTranslate.calledOnce);
    });
  });
});
