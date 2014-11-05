'use strict';

/* global FxAccountsUI */

require('/js/fxa_ui.js');

suite('system/FxAccountsUI', function() {
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
