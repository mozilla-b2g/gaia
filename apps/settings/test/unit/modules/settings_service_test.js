'use strict';

mocha.setup({
  globals: [
    'Settings',
    'LazyLoader',
    'startupLocale',
    'initLocale',
    'ScreenLayout'
  ]
});

suite('SettingsService', function() {
  suiteSetup(function(done) {
    navigator.addIdleObserver = sinon.spy();

    var modules = [
      'modules/settings_service',
      'modules/panel_cache',
      'unit/mock_settings_panel'
    ];

    // Use map to mock the dependencies.
    // In this case for modules/panel_cache, we use unit/mock_settings_panel to
    // replace modules/settings_panel.
    var map = {
      'modules/panel_cache': {
        'modules/settings_panel': 'unit/mock_settings_panel'
      },
      'modules/settings_service': {
        'modules/page_transitions': 'unit/mock_page_transitions'
      }
    };

    testRequire(modules, map,
      (function(SettingsService, PanelCache, MockSettingsPanel) {
        this.SettingsService = SettingsService;
        this.PanelCache = PanelCache;
        // Mock of the SettingsPanel function
        this.MockSettingsPanel = MockSettingsPanel;

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

  suite('navigate()', function() {
    setup(function() {
      this.SettingsService.reset();
      this.PanelCache.reset();

      this.options = [];
      this.panelElements = [];
      this.mockSettingsPanelInstances = [];

      var panelInstance = function() {
        return {
          init: function() {},
          uninit: function() {},
          show: function() {},
          hide: function() {},
          beforeShow: function() {},
          beforeHide: function() {}
        };
      };

      for (var i = 0; i < 4; i++) {
        this.options.push({ value: i });
        this.mockSettingsPanelInstances.push(panelInstance());

        // create panel elements
        var panelElement = document.createElement('div');
        panelElement.id = 'id' + i;
        document.body.appendChild(panelElement);
        this.panelElements.push(panelElement);
      }

      this.callCount = 0;
      this.MockSettingsPanel.mInnerFunction = (function() {
        return this.mockSettingsPanelInstances[this.callCount++];
      }).bind(this);
    });

    teardown(function() {
      this.panelElements.forEach(function(panelElement) {
        document.body.removeChild(panelElement);
      });
    });

    test('should call to panel functions correctly', function(done) {
      var mockInstances = [];

      this.SettingsService.init();

      mockInstances[0] = sinon.mock(this.mockSettingsPanelInstances[0]);
      // Expect only calls to beforeShow and show of panel0.
      mockInstances[0].expects('beforeShow').once()
                      .withExactArgs(this.panelElements[0], this.options[0]);
      mockInstances[0].expects('show').once()
                      .withExactArgs(this.panelElements[0], this.options[0]);
      mockInstances[0].expects('beforeHide').never();
      mockInstances[0].expects('hide').never();
      this.SettingsService.navigate('id0', this.options[0], (function() {
        mockInstances[0].verify();

        mockInstances[0] = sinon.mock(this.mockSettingsPanelInstances[0]);
        // Expect only calls to beforeHide and hide of panel0.
        mockInstances[0].expects('beforeShow').never();
        mockInstances[0].expects('show').never();
        mockInstances[0].expects('beforeHide').once();
        mockInstances[0].expects('hide').once();
        mockInstances[1] = sinon.mock(this.mockSettingsPanelInstances[1]);
        // Expect only calls to beforeShow and show of panel1.
        mockInstances[1].expects('beforeShow').once()
                        .withExactArgs(this.panelElements[1], this.options[1]);
        mockInstances[1].expects('show').once()
                        .withExactArgs(this.panelElements[1], this.options[1]);
        mockInstances[1].expects('beforeHide').never();
        mockInstances[1].expects('hide').never();
        this.SettingsService.navigate('id1', this.options[1], function() {
          mockInstances[0].verify();
          mockInstances[1].verify();
          done();
        });
      }).bind(this));
    });

    test('should not deactivate the root panel', function(done) {
      var mockInstances = [];

      this.SettingsService.init('id0');

      mockInstances[0] = sinon.mock(this.mockSettingsPanelInstances[0]);
      // Expect only calls to beforeShow and show of panel0.
      mockInstances[0].expects('beforeShow').once()
                      .withExactArgs(this.panelElements[0], this.options[0]);
      mockInstances[0].expects('show').once()
                      .withExactArgs(this.panelElements[0], this.options[0]);
      mockInstances[0].expects('beforeHide').never();
      mockInstances[0].expects('hide').never();
      this.SettingsService.navigate('id0', this.options[0], (function() {
        mockInstances[0].verify();

        mockInstances[0] = sinon.mock(this.mockSettingsPanelInstances[0]);
        // Expect only calls to beforeHide and hide of panel0.
        mockInstances[0].expects('beforeShow').never();
        mockInstances[0].expects('show').never();
        mockInstances[0].expects('beforeHide').never();
        mockInstances[0].expects('hide').never();
        mockInstances[1] = sinon.mock(this.mockSettingsPanelInstances[1]);
        // Expect only calls to beforeShow and show of panel1.
        mockInstances[1].expects('beforeShow').once()
                        .withExactArgs(this.panelElements[1], this.options[1]);
        mockInstances[1].expects('show').once()
                        .withExactArgs(this.panelElements[1], this.options[1]);
        mockInstances[1].expects('beforeHide').never();
        mockInstances[1].expects('hide').never();
        this.SettingsService.navigate('id1', this.options[1], function() {
          mockInstances[0].verify();
          mockInstances[1].verify();
          done();
        });
      }).bind(this));
    });

    test('should process the pending navigations correctly', function(done) {
      var mockInstances = [];
      for (var i = 0; i < 4; i++) {
        mockInstances[i] = sinon.mock(this.mockSettingsPanelInstances[i]);
      }

      // Expect only calls to beforeShow and show of panel0.
      mockInstances[0].expects('beforeShow').once()
                      .withExactArgs(this.panelElements[0], this.options[0]);
      mockInstances[0].expects('show').once()
                      .withExactArgs(this.panelElements[0], this.options[0]);
      mockInstances[0].expects('beforeHide').once();
      mockInstances[0].expects('hide').once();
      // Expect only calls to beforeShow and show of panel3.
      mockInstances[1].expects('beforeShow').once()
                      .withExactArgs(this.panelElements[3], this.options[3]);
      mockInstances[1].expects('show').once()
                      .withExactArgs(this.panelElements[3], this.options[3]);
      mockInstances[1].expects('beforeHide').never();
      mockInstances[1].expects('hide').never();

      // With the following calling sequence, the navigation to 'id1' and 'id2'
      // will be ignored. We will only get two panel instances for panel0 and
      // panel3 correspondingly.
      this.SettingsService.navigate('id0', this.options[0]);
      this.SettingsService.navigate('id1', this.options[1]);
      this.SettingsService.navigate('id2', this.options[2]);
      this.SettingsService.navigate('id3', this.options[3], (function() {
        mockInstances.forEach(function(mockInstance) {
          mockInstance.verify();
        });
        // The third and fourth panel instances should not be created.
        assert.ok(this.callCount == 2,
          'only two panel instances should be created');
        done();
      }).bind(this));
    });
  });
});
