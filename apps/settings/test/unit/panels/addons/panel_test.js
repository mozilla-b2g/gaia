'use strict';

/* globals loadBodyHTML*/

requireApp('settings/shared/test/unit/load_body_html_helper.js');

suite('Addons Panel > ', function() {

  var modules = [
    'panels/addons/panel',
    'panels/addons/addons_list',
    'unit/mock_addon_manager',
    'unit/mock_settings_panel'
  ];
  var map = {
    '*': {
      'modules/settings_panel': 'unit/mock_settings_panel',
      'panels/addons/addons_list': 'MockAddonsList',
      'modules/addon_manager': 'unit/mock_addon_manager'
    }
  };

  suiteSetup(function(done) {
    loadBodyHTML('_addons.html');
    // Create a new requirejs context
    var requireCtx = testRequire([], map, function() {});
    var that = this;

    var MockAddonsList = {
      setFilter: sinon.stub().returns({
        then: function(callback) { callback(); }
      }),
      unsetFilter: sinon.stub().returns({
        then: function(callback) { callback(); }
      }),
      set enabled(value) { this._enabled = value; },
      get enabled() { return this._enabled; }
    };

    define('MockAddonsList', function() {
      return function() {
        return MockAddonsList;
      };
    });

    requireCtx(modules, function(AddonsPanel, MockAddonsList,
      MockAddonManager, MockSettingsPanel) {
      MockSettingsPanel.mInnerFunction = options => Object.assign({}, options);

      that.panel = AddonsPanel();
      that.addonsList = MockAddonsList();
      done();
    });
  });

  suite('panel initialized', function() {
    setup(function() {
      this.panel.onInit(document.body);
      assert.notOk(this.addonsList.enabled);
      this.panel.onBeforeShow();
    });
    test('no filter should be set', function() {
      assert(this.addonsList.setFilter.notCalled);
      assert.isTrue(this.addonsList.enabled);
    });
  });

  suite('panel initialized with filter', function() {
    setup(function() {
      this.panel.onInit(document.body);
      this.panel.onBeforeShow(document.body, { manifestURL: 'test' });
    });
    test('filter should be set', function() {
      assert(this.addonsList.setFilter.calledOnce);
      assert.isTrue(this.addonsList.enabled);
    });
    test('filter should be unset', function() {
      this.panel.onBeforeHide();
      assert(this.addonsList.unsetFilter.calledOnce);
      assert.isFalse(this.addonsList.enabled);
    });
  });
});
