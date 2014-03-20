'use strict';

mocha.setup({
  globals: [
    'Settings',
    'LazyLoader',
    'startupLocale',
    'initLocale'
  ]
});

suite('PanelCache', function() {
  suiteSetup(function(done) {
    navigator.addIdleObserver = sinon.spy();

    var modules = [
      'modules/panel_cache',
      'unit/mock_settings_panel',
      'unit/mock_test_panel'
    ];

    // Use map to mock the dependencies.
    // In this case for modules/panel_cache, we use unit/mock_settings_panel to
    // replace modules/settings_panel.
    var map = {
      'modules/panel_cache': {
        'modules/settings_panel': 'unit/mock_settings_panel'
      }
    };

    testRequire(modules, map, (function(PanelCache, MockSettingsPanel,
      MockTestPanel) {
      this.PanelCache = PanelCache;
      // Mock of the SettingsPanel function
      this.MockSettingsPanel = MockSettingsPanel;
      // Mock of the TestPanel function
      this.MockTestPanel = MockTestPanel;

      // XXX: As we use 'require' function of requirejs in PanelCache and it
      //      conflicts to the original require function, we replace it here.
      this.originalRequire = window.require;
      window.require = testRequire;
      done();
    }).bind(this));
  });

  suiteTeardown(function() {
    window.require = this.originalRequire;
    this.originalRequire = null;
  });

  suite('get()', function() {
    setup(function() {
      // create mock panel element
      this.panelID = 'id';
      this.panelElement = document.createElement('div');
      this.panelElement.id = this.panelID;
      document.body.appendChild(this.panelElement);
      // create mock panel instance
      this.mockPanelInstance = {};
    });

    teardown(function() {
      document.body.removeChild(this.panelElement);
      this.panelID = null;
      this.panelElement = null;
      this.mockPanelInstance = null;

      this.PanelCache.reset();
      this.MockSettingsPanel.mTeardown();
      this.MockTestPanel.mTeardown();
    });

    test('should return a SettingsPanel when without specifying a panel module',
      function(done) {
        this.MockSettingsPanel.mInnerFunction =
          sinon.stub().returns(this.mockPanelInstance);

        this.PanelCache.get(this.panelID, (function(panelInstance) {
          // ensure the returned panel instance is a SettingsPanel
          assert.equal(panelInstance, this.mockPanelInstance);
          done();
        }).bind(this));
    });

    test('should return correct panel instance when with a specified panel' +
      'module', function(done) {
        this.MockTestPanel.mInnerFunction =
          sinon.stub().returns(this.mockPanelInstance);

        /**
         * Make the dom element like:
         * <div>
         *   <panel data-path="unit/mock_test_panel"></panel>
         * </div>
         */
        var pathElement = document.createElement('panel');
        pathElement.dataset.path = 'unit/mock_test_panel';
        this.panelElement.appendChild(pathElement);

        this.PanelCache.get(this.panelID, (function(panelInstance) {
          // ensure the returned panel instance is a TestPanel
          assert.equal(panelInstance, this.mockPanelInstance);
          done();
        }).bind(this));
    });

    test('should return the same panel instance when inquiring with the ' +
      'same panel id', function(done) {
        var settingsPanelStub = sinon.stub().returns(this.mockPanelInstance);
        this.MockSettingsPanel.mInnerFunction = settingsPanelStub;

        this.PanelCache.get(this.panelID, (function(panelInstance) {
          assert.equal(panelInstance, this.mockPanelInstance);
          this.PanelCache.get(this.panelID, function(newPanelInstance) {
            // ensure there is only one instance created
            sinon.assert.calledOnce(settingsPanelStub);
            // ensure the returned instance is the original instance
            assert.equal(panelInstance, newPanelInstance);
            done();
          });
        }).bind(this));
    });
  });
});
