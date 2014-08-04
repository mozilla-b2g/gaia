/* global MockL10n, SimFdnLock, test, suite, suiteTeardown, suiteSetup,
   setup, assert, MockSimPinDialog */
'use strict';

require('/apps/settings/test/unit/mock_l10n.js');
require('/apps/settings/test/unit/mock_sim_pin_dialog.js');
require('/shared/test/unit/load_body_html_helper.js');

suite('SimCardFdn > ', function() {
  var realL10n;
  var realSimPinDialog;
  var MockL10nStub;

  suiteSetup(function(done) {
    realL10n = window.navigator.mozL10n;
    // dont exec the init so quick
    MockL10nStub = sinon.stub(MockL10n, 'once', function() {});

    window.navigator.mozL10n = MockL10n;

    if (window.SimPinDialog) {
      realSimPinDialog = window.SimPinDialog;
    }
    window.SimPinDialog = MockSimPinDialog;

    loadBodyHTML('./simcard_fdn_test.html');
    require('/apps/settings/js/simcard_fdn.js', done);
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realL10n;
    window.SimPinDialog = realSimPinDialog;

    MockL10nStub.restore();
    document.body.innerHTML = '';
  });

  suite('init > ', function() {
    var realGetIccByIindex;
    var updateFdnStub;
    var renderAuthorizedNumbersStub;

    setup(function() {
      updateFdnStub = this.sinon.stub(SimFdnLock, 'updateFdnStatus');
      renderAuthorizedNumbersStub = this.sinon.stub(
        SimFdnLock, 'renderAuthorizedNumbers');

      realGetIccByIindex = window.getIccByIndex;
      window.getIccByIndex = this.sinon.stub();
      window.getIccByIndex.returns({
        addEventListener: this.sinon.stub()
      });

      SimFdnLock.init();
    });

    suiteTeardown(function() {
      window.getIccByIndex = realGetIccByIindex;
      updateFdnStub.restore();
      renderAuthorizedNumbersStub.restore();
    });

    test('is panelready bound successfully', function(done) {
      assert.isTrue(SimFdnLock.updateFdnStatus.calledOnce);

      var panelreadyEvent = function(el) {
        var ev = new CustomEvent('panelready', {
          'detail': {
            current: el
          }
        });
        window.dispatchEvent(ev);
      };

      panelreadyEvent('#call-fdnList');
      panelreadyEvent('#call-fdnSettings');

      setTimeout(function() {
        assert.isTrue(SimFdnLock.updateFdnStatus.calledTwice);
        assert.isTrue(SimFdnLock.renderAuthorizedNumbers.calledOnce);
        done();
      });
    });
  });
});
