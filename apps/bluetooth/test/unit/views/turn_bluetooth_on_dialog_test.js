'use strict';

require('/shared/test/unit/load_body_html_helper.js');

suite('Bluetooth app > TurnBluetoothOnDialog ', function() {
  var TurnBluetoothOnDialog;

  suiteSetup(function(done) {

    loadBodyHTML('./_transfer.html');

    var module = [
      'views/turn_bluetooth_on_dialog'
    ];
    var map = {};
    var requireCtx = testRequire([], map, function() {});
    requireCtx(module, function(turnBluetoothOnDialog) {
      TurnBluetoothOnDialog = turnBluetoothOnDialog;
      done();
    }.bind(this));
  });

  suiteTeardown(function() {
    document.body.innerHTML = '';
  });

  suite('init > ', function() {
    test('dialog, cancel/confirm button should be defined after init() ',
         function() {
      assert.equal(TurnBluetoothOnDialog.dialog,
                   document.getElementById('enable-bluetooth-view'));
      assert.equal(TurnBluetoothOnDialog.cancelBtn,
                   document.getElementById('enable-bluetooth-button-cancel'));
      assert.equal(TurnBluetoothOnDialog.confirmBtn,
                   document.getElementById('enable-bluetooth-button-turn-on'));
    });
  });

  suite('showConfirm > ', function() {
    var confirmedAction;
    setup(function() {
      confirmedAction = {
        cancel: 'cancel',
        confirm: 'confirm'
      };
      TurnBluetoothOnDialog.dialog.hidden = true;
      this.sinon.stub(TurnBluetoothOnDialog, 'close');
    });

    teardown(function() {
      TurnBluetoothOnDialog.dialog.hidden = true;
    });

    test('dialog should be show after showConfirm() called ', function() {
      TurnBluetoothOnDialog.showConfirm();
      assert.isFalse(TurnBluetoothOnDialog.dialog.hidden);
    });

    test('close() be called and resovled promise with arg "cancel" after a ' +
         'user clicked cancel button in turn Bluetooth on dialog ',
         function(done) {
      TurnBluetoothOnDialog.showConfirm().then((result) => {
        assert.equal(result, confirmedAction.cancel);
      }, () => {
        // reject case
      }).then(done, done);
      TurnBluetoothOnDialog.cancelBtn.onclick();
      assert.isTrue(TurnBluetoothOnDialog.close.called);
    });

    test('close() be called and resolved promise with arg "confirm" after a ' +
         'user clicked confirm button in turn Bluetooth on dialog ',
         function(done) {
      TurnBluetoothOnDialog.showConfirm().then((result) => {
        assert.equal(result, confirmedAction.confirm);
      }, () => {
        // reject case
      }).then(done, done);
      TurnBluetoothOnDialog.confirmBtn.onclick();
      assert.isTrue(TurnBluetoothOnDialog.close.called);
    });
  });

  suite('isVisible > ', function() {
    setup(function() {
      TurnBluetoothOnDialog.dialog.hidden = false;
    });

    teardown(function() {
      TurnBluetoothOnDialog.dialog.hidden = true;
    });

    test('getting the value of visible should be true ' +
         'after isVisible() is called ', function() {
      assert.isTrue(TurnBluetoothOnDialog.isVisible);
    });
  });

  suite('close > ', function() {
    setup(function() {
      TurnBluetoothOnDialog.dialog.hidden = false;
    });

    teardown(function() {
      TurnBluetoothOnDialog.dialog.hidden = true;
    });

    test('dialog should be hidden after close() is called ', function() {
      TurnBluetoothOnDialog.close();
      assert.isTrue(TurnBluetoothOnDialog.dialog.hidden);
    });
  });
});
