'use strict';

/* global FxAccountsUI, MockService, MocksHelper */

require('/js/fx_accounts_u_i.js');
require('/test/unit/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_service.js');

var mocksForFxAccountsUI = new MocksHelper([
  'Service', 'LazyLoader'
]).init();

suite('system/FxAccountsUI', function() {
  mocksForFxAccountsUI.attachTestHelpers();
  setup(function() {
    window.FxAccountsDialog = function() {};
    window.FxAccountsDialog.prototype = {
      getView: function() {
        return {
          removeChild: function() {}
        };
      }
    };
  });

  teardown(function() {
    window.FxAccountsDialog = null;
  });

  suite('Before init', function() {
    test('Should not have a dialog', function() {
      assert.isNull(FxAccountsUI.dialog);
    });

    test('Should not have a panel', function() {
      assert.isNull(FxAccountsUI.panel);
    });

    test('Should not have an iframe', function() {
      assert.isNull(FxAccountsUI.iframe);
    });
  });

  suite('After init', function() {
    setup(function() {
      FxAccountsUI.init();
    });

    test('loadFlow', function() {
      FxAccountsUI.panel = document.createElement('div');
      FxAccountsUI.dialog = {
        show: function() {}
      };
      MockService.mIsFtuRunning = true;
      FxAccountsUI.loadFlow('login');
      assert.isTrue(FxAccountsUI.iframe.src.indexOf('isftu=true') >= 0);

      MockService.mIsFtuRunning = false;
      FxAccountsUI.loadFlow('login');
      assert.isFalse(FxAccountsUI.iframe.src.indexOf('isftu=true') >= 0);

      FxAccountsUI.panel = null;
      FxAccountsUI.dialog = null;
    });

    test('Should not have a dialog', function() {
      assert.ok(FxAccountsUI.dialog);
    });

    test('Should not have a panel', function() {
      assert.ok(FxAccountsUI.panel);
    });

    test('Should not have an iframe', function() {
      assert.ok(FxAccountsUI.iframe);
    });
  });

  suite('Reset', function() {
    var onerrorReason;

    setup(function() {
      FxAccountsUI.onerrorCb = function(reason) {
        onerrorReason = reason;
      };
    });

    suite('Reset "home" reason', function() {
      setup(function() {
        FxAccountsUI.reset('home');
      });

      teardown(function() {
        onerrorReason = null;
      });

      test('onerror should be called on reset with "home" reason', function() {
        assert.equal(onerrorReason, 'DIALOG_CLOSED_BY_USER');
        assert.isNull(FxAccountsUI.onerrorCb);
      });
    });

    suite('Reset "holdhome" reason', function() {
      setup(function() {
        FxAccountsUI.reset('holdhome');
      });

      teardown(function() {
        onerrorReason = null;
      });

      test('onerror should be called on reset with "holdhome" reason',
        function() {
          assert.equal(onerrorReason, 'DIALOG_CLOSED_BY_USER');
          assert.isNull(FxAccountsUI.onerrorCb);
      });
    });

    suite('Reset "whatever" reason', function() {
      setup(function() {
        FxAccountsUI.reset('whatever');
      });

      teardown(function() {
        onerrorReason = null;
      });

      test('onerror should be called on reset with "whatever" reason',
        function() {
          assert.isNull(onerrorReason);
          assert.isNull(FxAccountsUI.onerrorCb);
      });
    });

  });
});
