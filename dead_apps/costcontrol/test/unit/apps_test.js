/* global CostControlApp, MocksHelper */

'use strict';

require('/test/unit/mock_debug.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/test/unit/mock_airplane_mode_helper.js');
require('/test/unit/mock_config_manager.js');
require('/test/unit/mock_cost_control.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/test/unit/mock_non_ready_screen.js');
require('/shared/test/unit/mocks/mock_accessibility_helper.js');
require('/js/view_manager.js');

require('/js/app.js');

var MocksHelperForUnitTest = new MocksHelper([
  'LazyLoader',
  'AirplaneModeHelper',
  'ConfigManager',
  'CostControl',
  'SettingsListener',
  'NonReadyScreen',
  'AccessibilityHelper'
]).init();

suite('Costcontrol App Test Suite >', function() {
  MocksHelperForUnitTest.attachTestHelpers();

  suite('_onHashChange >', function() {
    suiteSetup(function() {
      //  This initialization launches a startup to NonReadyScreen screen
      // because of a mandatory api does not exists, this way the viewManager is
      // initialized, but the app not. This is necessary to avoid the listeners
      // to be attached.
      CostControlApp.init();
    });
    suiteTeardown(function() {
      CostControlApp.reset();
    });

    //  The URL schema is: #tab-id[#overlay-id]
    test('Error bad new url schema.',
      function() {
        var evt = {
          newURL: 'app://usage/index.html###',
          oldURL: 'app://usage/index.html#datausage-tab'
        };
        var previousHash = window.location.hash;
        this.sinon.spy(console, 'error');
        CostControlApp._onHashChange(evt);
        assert.equal(window.location.hash, previousHash);
        sinon.assert.called(console.error);
      }
    );

    test('If the new hash does not exist, we maintain the old hash.',
      function() {
        var evt = {
          newURL: 'app://usage/index.html',
          oldURL: 'app://usage/index.html#datausage-tab'
        };
        CostControlApp._onHashChange(evt);
        assert.equal(window.location.hash, '#datausage-tab');
      }
    );

    test('Closing settings overlay with # returns to datausage tab.',
      function() {
        var evt = {
          newURL: 'app://usage/index.html#',
          oldURL: 'app://usage/index.html#datausage-tab#settings-view'
        };

        CostControlApp._onHashChange(evt);
        assert.equal(window.location.hash, '#datausage-tab');
      }
    );

    test('Openning settings overlay from datausage tab.',
      function() {
        var evt = {
          newURL: 'app://usage/index.html##settings-view',
          oldURL: 'app://usage/index.html#datausage-tab'
        };

        CostControlApp._onHashChange(evt);
        assert.equal(window.location.hash, '#datausage-tab#settings-view');
      }
    );

  });
});
