'use strict';

require('/shared/test/unit/load_body_html_helper.js');

suite('Bluetooth app > CannotTransferDialog ', function() {
  var CannotTransferDialog;

  suiteSetup(function(done) {

    loadBodyHTML('./_transfer.html');

    var module = [
      'views/cannot_transfer_dialog'
    ];
    var map = {};
    var requireCtx = testRequire([], map, function() {});
    requireCtx(module, function(cannotTransferDialog) {
      CannotTransferDialog = cannotTransferDialog;
      done();
    }.bind(this));
  });

  suiteTeardown(function() {
    document.body.innerHTML = '';
  });

  suite('init > ', function() {
    test('dialog, confirm button should be defined after init() ', function() {
      assert.equal(CannotTransferDialog.dialog,
                   document.getElementById('alert-view'));
      assert.equal(CannotTransferDialog.confirmBtn,
                   document.getElementById('alert-button-ok'));
    });
  });

  suite('showConfirm > ', function() {
    setup(function() {
      CannotTransferDialog.dialog.hidden = true;
      this.sinon.stub(CannotTransferDialog, 'close');
    });

    teardown(function() {
      CannotTransferDialog.dialog.hidden = true;
    });

    test('dialog should be show after showConfirm() called ', function() {
      CannotTransferDialog.showConfirm();
      assert.isFalse(CannotTransferDialog.dialog.hidden);
    });

    test('close() be called and resovle promise after a user clicked ' +
         'confirm button in cannot transfer dialog ', function(done) {
      CannotTransferDialog.showConfirm().then(() => {
        assert.ok(true);
      }, () => {
        // reject case
      }).then(done, done);
      CannotTransferDialog.confirmBtn.onclick();
      assert.isTrue(CannotTransferDialog.close.called);
    });
  });

  suite('isVisible > ', function() {
    setup(function() {
      CannotTransferDialog.dialog.hidden = false;
    });

    teardown(function() {
      CannotTransferDialog.dialog.hidden = true;
    });

    test('getting the value of visible should be true ' +
         'after isVisible() is called ', function() {
      assert.isTrue(CannotTransferDialog.isVisible);
    });
  });

  suite('close > ', function() {
    setup(function() {
      CannotTransferDialog.dialog.hidden = false;
    });

    teardown(function() {
      CannotTransferDialog.dialog.hidden = true;
    });

    test('dialog should be hidden after close() is called ', function() {
      CannotTransferDialog.close();
      assert.isTrue(CannotTransferDialog.dialog.hidden);
    });
  });
});
