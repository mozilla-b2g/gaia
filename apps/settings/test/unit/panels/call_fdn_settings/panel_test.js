/* globals loadBodyHTML */

requireApp('settings/shared/test/unit/load_body_html_helper.js');

suite('CallFdnSettings > ', function() {
  'use strict';

  var callFdnSettingsPanel;
  var mockDialogService;
  var mockIccObject;
  var realMozMobileConnections;
  var realMozIccManager;

  var modules = [
    'modules/dialog_service',
    'panels/call_fdn_settings/panel'
  ];

  var map = {
    '*': {
      'modules/settings_panel': 'MockSettingsPanel',
      'modules/dialog_service': 'MockDialogService'
    }
  };

  suiteSetup(function() {
    realMozIccManager = window.navigator.mozIccManager;
    realMozMobileConnections = window.navigator.mozMobileConnections;
  });

  suiteTeardown(function() {
    window.navigator.mozIccManager = realMozIccManager;
    window.navigator.mozMobileConnections = realMozMobileConnections;
  });

  setup(function(done) {
    loadBodyHTML('_call_fdn_settings.html');

    mockIccObject = {
      _fdnEnabled: true,
      iccId: 1234,
      oncardstatechange: function() {},
      getCardLock: function() {
        return Promise.resolve({
          enabled: this._fdnEnabled
        });
      }
    };
    navigator.mozMobileConnections = [mockIccObject];

    navigator.mozIccManager = {
      getIccById: function() {
        return mockIccObject;
      }
    };

    define('MockSettingsPanel', function() {
      return function(options) {
        return options;
      };
    });

    define('MockDialogService', function() {
      return {
        show: function() {
          return Promise.resolve();
        }
      };
    });

    testRequire(modules, map, function(MockDialogService,
      CallFdnSettingsPanel) {
        mockDialogService = MockDialogService;
        callFdnSettingsPanel = CallFdnSettingsPanel();
        callFdnSettingsPanel.onInit(document.body, {});
        done();
    });
  });

  teardown(function() {
    document.body.innerHTML = '';
  });

  suite('onBeforeShow >', function() {
    setup(function() {
      this.sinon.stub(callFdnSettingsPanel, '_updateFdnStatus');
      callFdnSettingsPanel.onBeforeShow(document.body, {});
    });

    test('we will updateFdnStatus each time', function() {
      assert.ok(callFdnSettingsPanel._updateFdnStatus.called);
    });
  });

  suite('_showToggleFdnDialog >', function() {
    setup(function() {
      this.sinon.spy(mockDialogService, 'show');
      this.sinon.stub(callFdnSettingsPanel, '_updateFdnStatus');
    });

    test('if checked then enableFdn', function(done) {
      callFdnSettingsPanel._elements.simFdnCheckBox.checked = true;
      callFdnSettingsPanel._showToggleFdnDialog().then(() => {
        var dialogOptions = mockDialogService.show.getCall(0).args[1];
        assert.equal(dialogOptions.method, 'enable_fdn');
        assert.ok(callFdnSettingsPanel._updateFdnStatus.called);
      }).then(done, done);
    });

    test('if unchecked then disableFdn', function(done) {
      callFdnSettingsPanel._elements.simFdnCheckBox.checked = false;
      callFdnSettingsPanel._showToggleFdnDialog().then(() => {
        var dialogOptions = mockDialogService.show.getCall(0).args[1];
        assert.equal(dialogOptions.method, 'disable_fdn');
        assert.ok(callFdnSettingsPanel._updateFdnStatus.called);
      }).then(done, done);
    });

    test('if cardState is puk2required then unlockPuk2', function(done) {
      mockIccObject.cardState = 'puk2Required';
      callFdnSettingsPanel._showToggleFdnDialog().then(() => {
        var dialogOptions = mockDialogService.show.getCall(0).args[1];
        assert.equal(dialogOptions.method, 'unlock_puk2');
        assert.ok(callFdnSettingsPanel._updateFdnStatus.called);
      }).then(done, done);
    });
  });

  suite('_updateFdnStatus >', function() {
    test('if fdn is enabled, change UI', function(done) {
      mockIccObject._fdnEnabled = true;
      doAssertion(true, done);
    });

    test('if fdn is disabled, change UI', function(done) {
      mockIccObject._fdnEnabled = false;
      doAssertion(false, done);
    });

    function doAssertion(enabled, done) {
      callFdnSettingsPanel._updateFdnStatus().then(() => {
        assert.equal(enabled ? 'enabled' : 'disabled',
          callFdnSettingsPanel._elements.simFdnDesc.getAttribute(
            'data-l10n-id'));
        assert.equal(enabled,
          callFdnSettingsPanel._elements.simFdnCheckBox.checked);
        assert.equal(false,
          callFdnSettingsPanel._elements.simFdnCheckBox.disabled);
        assert.equal(!enabled,
          callFdnSettingsPanel._elements.resetPin2Item.hidden);
      }).then(done, done);
    }
  });
});
