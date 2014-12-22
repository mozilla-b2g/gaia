/* global MockL10n, MockSimPinDialog */
'use strict';

require('/shared/test/unit/mocks/mock_l10n.js');
require('/apps/settings/test/unit/mock_sim_pin_dialog.js');
require('/shared/test/unit/load_body_html_helper.js');

suite('SimCardFdn > ', function() {
  var SimFdnLock;
  var map = {
    '*': {
      'modules/dialog_service': 'MockDialogService'
    }
  };

  setup(function(done) {
    this.sinon.stub(MockL10n, 'once', function() {});

    window.navigator.mozL10n = MockL10n;
    window.SimPinDialog = MockSimPinDialog;

    loadBodyHTML('./simcard_fdn_test.html');
    define('MockDialogService', function() {
      return {};
    });

    var requireCtx = testRequire([], map, function() {});
    requireCtx(['simcard_fdn'], function(requiredSimFdnLock) {
      SimFdnLock = requiredSimFdnLock;
      done();
    });
  });

  teardown(function() {
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
