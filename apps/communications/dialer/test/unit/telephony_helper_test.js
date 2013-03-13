requireApp('communications/dialer/js/telephony_helper.js');
requireApp('communications/dialer/test/unit/mock_moztelephony.js');
requireApp('communications/dialer/test/unit/mock_confirm_dialog.js');
requireApp('communications/dialer/test/unit/mock_l10n.js');


if (!this.ConfirmDialog) {
  this.ConfirmDialog = null;
}

if (!this._) {
  this._ = null;
}

if (!this.LazyL10n) {
  this.LazyL10n = null;
}

suite('telephony helper', function() {
  var subject;
  var realMozTelephony;
  var realL10n;
  var realLazyL10n;
  var realConfirmDialog;
  var real_;

  suiteSetup(function() {
    subject = TelephonyHelper;
    realMozTelephony = navigator.mozTelephony;
    navigator.mozTelephony = MockMozTelephony;

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockMozL10n;
    realLazyL10n = window.LazyL10n;
    window.LazyL10n = MockLazyL10n;
    real_ = _;
    _ = navigator.mozL10n.get;

    realConfirmDialog = window.ConfirmDialog;
    window.ConfirmDialog = window.MockConfirmDialog;
  });

  test('should block another call if on calling', function(done) {
    navigator.mozTelephony.active = {
      number: '1111',
      state: 'connected'
    };
    window.MockConfirmDialog.show = function(title, body) {
      assert.equal(title, 'previousCallExistTitle');
      assert.equal(body, 'previousCallExistMessage');
      done();
    };
    subject.call('123456');

  });

  suiteTeardown(function() {
    navigator.mozTelephony = realMozTelephony;
    navigator.mozL10n = realL10n;
    window.LazyL10n = realLazyL10n;
    window.ConfirmDialog = realConfirmDialog;
    _ = real_;
  });
});
