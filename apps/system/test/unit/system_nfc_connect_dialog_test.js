'use strict';

mocha.globals(['BaseUI', 'SystemDialog', 'NfcConnectSystemDialog']);

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
});
