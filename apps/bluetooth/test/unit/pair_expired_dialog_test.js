/* global MockL10n, PairExpiredDialog */
'use strict';

require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_l10n.js');

mocha.globals(['PairExpiredDialog']);

suite('Bluetooth app > PairExpiredDialog ', function() {
  var realL10n;

  suiteSetup(function(done) {
    realL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = MockL10n;

    loadBodyHTML('./_message.html');

    requireApp('bluetooth/js/pair_expired_dialog.js', done);
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realL10n;
    document.body.innerHTML = '';
  });

  suite('init > ', function() {
    test('dialog, confirm button should be defined after init() ', function() {
      assert.equal(PairExpiredDialog.dialog,
                   document.getElementById('pairing-request-timeout'));
      assert.equal(PairExpiredDialog.confirmBtn,
                   document.getElementById('incoming-pairing-timeout-confirm'));
    });
  });

  suite('showConfirm > ', function() {
    var callback;
    setup(function() {
      callback = function() {/* do something.. */};
      PairExpiredDialog.dialog.hidden = true;
      this.sinon.stub(PairExpiredDialog, 'close');
    });

    teardown(function() {
      callback = null;
      PairExpiredDialog.dialog.hidden = true;
    });

    test('dialog should be show after showConfirm() called ', function() {
      PairExpiredDialog.showConfirm(callback);
      assert.isFalse(PairExpiredDialog.dialog.hidden);
    });

    test('close() be called with callback function after a user clicked ' +
         'confirm button in pair expired dialog ', function() {
      PairExpiredDialog.showConfirm(callback);
      PairExpiredDialog.confirmBtn.onclick();
      assert.isTrue(PairExpiredDialog.close.called);
    });
  });

  suite('isVisible > ', function() {
    setup(function() {
      PairExpiredDialog.dialog.hidden = false;
    });

    teardown(function() {
      PairExpiredDialog.dialog.hidden = true;
    });

    test('getting the value of visible should be true ' +
         'after isVisible() is called ', function() {
      assert.isTrue(PairExpiredDialog.isVisible);
    });
  });

  suite('close > ', function() {
    setup(function() {
      PairExpiredDialog.dialog.hidden = false;
    });

    teardown(function() {
      PairExpiredDialog.dialog.hidden = true;
    });

    test('dialog should be hidden after close() is called, and the arg of ' +
         'callback should be excuted if it is given ', function() {
      PairExpiredDialog.close();
      assert.isTrue(PairExpiredDialog.dialog.hidden);
    });
  });
});
