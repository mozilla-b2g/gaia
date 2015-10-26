'use strict';

suite('Addon Details Panel > ', function() {

  var modules = [
    'panels/addon_details/panel',
    'unit/mock_settings_panel',
    'unit/mock_addon_manager',
    'panels/addon_details/addon_details',
    'unit/mock_settings_service',
    'shared_mocks/mock_manifest_helper'
  ];
  var map = {
    '*': {
      'modules/settings_panel': 'unit/mock_settings_panel',
      'modules/addon_manager': 'unit/mock_addon_manager',
      'panels/addon_details/addon_details': 'MockAddonDetails',
      'modules/settings_service': 'unit/mock_settings_service',
      'modules/dialog_service': 'MockDialogService',
      'shared/toaster': 'MockToaster',
      'shared/manifest_helper': 'shared_mocks/mock_manifest_helper'
    }
  };
  var MockAddon = {};
  var MockPanel = {
    querySelector: () => document.createElement('div')
  };
  var subject;

  suiteSetup(function(done) {
    // Create a new requirejs context
    var requireCtx = testRequire([], map, function() {});

    var MockAddonDetails = {
      _updateEnabledState: sinon.stub(),
      render: sinon.stub(),
      updateNames: sinon.stub()
    };

    define('MockAddonDetails', function() {
      return function() {
        return MockAddonDetails;
      };
    });

    // Define MockDialogService
    define('MockDialogService', function() {
      return {
        prompt: function() {
          return Promise.resolve({
            type: 'submit'
          });
        }
      };
    });

    // Define MockToaster
    define('MockToaster', function() {
      return {
        showToast: function() {}
      };
    });

    requireCtx(modules, (AddonDetailsPanel, MockSettingsPanel,
      MockAddonManager, MockAddonDetails, MockSettingsService,
      MockManifestHelper) => {
      MockSettingsPanel.mInnerFunction = options => Object.assign({}, options);

      subject = AddonDetailsPanel();
      done();
    });
  });

  suite('panel initialized', function() {
    setup(function() {
      subject.onInit(MockPanel);
      subject.onBeforeShow(MockPanel, { addon: MockAddon });
    });
    test('elements are initialized', function() {
      var elements = Object.keys(subject._elements);
      assert.isTrue(elements.length > 0);
      elements.forEach(key => assert.ok(subject._elements[key]));
    });
  });
});
