/* global loadBodyHTML*/
'use strict';

require('/shared/test/unit/load_body_html_helper.js');

suite('Full developer mode final warning > ', function() {
  var FinalWarning;

  var realL10n;
  var realMozPower;

  var warning;

  var modules = [
    'panels/full_developer_mode_final_warning/panel'
  ];
  var map = {
    '*': {
      'modules/dialog_panel': 'MockDialogPanel'
    }
  };

  setup(function(done) {
    loadBodyHTML('_full_developer_mode_final_warning.html');

    realL10n = document.l10n;
    document.l10n = {
      setAttributes: sinon.stub()
    };
    realMozPower = navigator.mozPower;
    navigator.mozPower = {
      factoryReset: sinon.stub()
    };

    // Create a new requirejs context
    var requireCtx = testRequire([], map, function() {});

    // Define MockDialogPanel
    define('MockDialogPanel', function() {
      return function(options) {
        return {
          _initialized: false,
          init: function(panel) {
            options.onInit(panel);
            panel.querySelector('button[type="submit"]').onclick =
              options.onSubmit.bind(options);
          },
          beforeShow: function(panel) {
            if (!this._initialized) {
              this._initialized = true;
              this.init(panel);
            }
            options.onBeforeShow(panel);
          }
        };
      };
    });

    requireCtx(modules, function(_FinalWarning) {
      FinalWarning = _FinalWarning;
      done();
    });
  });

  teardown(function() {
    document.body.innerHTML = '';
    document.l10n = realL10n;
    navigator.mozPower = realMozPower;
  });

  suite('full developer mode warning', function() {
    var okBtn;
    var cancelBtn;
    var warningInfo;

    setup(function() {
      okBtn = document.querySelector('button[type="submit"]');
      cancelBtn = document.querySelector('button[type="reset"]');
      warningInfo = document.querySelector('.warning-info');
      warning = FinalWarning();
    });

    test('click on the ok button 10 times', function() {
      warning.beforeShow(document.body);
      sinon.assert.calledWith(document.l10n.setAttributes, warningInfo,
        'enable-full-dev-mode-final-warning-msg', {
          count: 10
        });

      for (var i = 0; i < 10; i++) {
        document.l10n.setAttributes.reset();
        navigator.mozPower.factoryReset.reset();
        okBtn.dispatchEvent(new Event('click'));
        if (i === 9) {
          // Call to factory reset on the 10th click.
          sinon.assert.calledWith(navigator.mozPower.factoryReset, 'root');
        } else {
          sinon.assert.notCalled(navigator.mozPower.factoryReset);
          sinon.assert.calledWith(document.l10n.setAttributes, warningInfo,
            'enable-full-dev-mode-final-warning-msg', {
              count: 9 - i
            });
        }
      }
    });
  });
});
