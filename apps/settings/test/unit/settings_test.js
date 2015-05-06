suite('Settings > ', function() {
  'use strict';
  
  var settings;
  var mockMozSetMessageHandler;
  var mockMozSettings;
  var mockL10n;
  var mockScreenLayout;
  var mockSettingsService;
  var modules = [
    'shared_mocks/mock_navigator_moz_set_message_handler',
    'shared_mocks/mock_navigator_moz_settings',
    'shared_mocks/mock_l10n',
    'shared_mocks/mock_screen_layout',
    'unit/mock_settings_service',
    'settings'
  ];

  var map = {};

  setup(function(done) {
    testRequire(modules, map, function(MockMozSetMessageHandler,
      MockMozSettings, MockL10n, MockScreenLayout,
      MockSettingsService, Settings) {

        mockMozSetMessageHandler = MockMozSetMessageHandler;
        mockMozSettings = MockMozSettings;
        mockSettingsService = MockSettingsService;
        mockScreenLayout = MockScreenLayout;
        mockL10n = MockL10n;
  
        window.LaunchContext = {};
        window.LaunchContext.initialPanelId = '#test';
        window.navigator.mozL10n = mockL10n;
        window.navigator.mozSettings = mockMozSettings;
        window.navigator.mozSetMessageHandler = mockMozSetMessageHandler;

        // We won't test `once` callback
        this.sinon.stub(window.navigator.mozL10n, 'once');

        settings = Settings;
        done();
    }.bind(this));
  });

  suite('init > ', function() {
    setup(function() {
      this.clock = this.sinon.useFakeTimers();
      this.sinon.stub(mockSettingsService, 'navigate');
      this.sinon.stub(settings, 'isTabletAndLandscape', function() {
        return true;
      });
      settings.init({
        SettingsService: mockSettingsService,
        ScreenLayout: mockScreenLayout
      });
    });

    test('currentPanel will be set to right one in tablet', function() {
      this.clock.tick(10); 
      assert.isTrue(settings.isTabletAndLandscape.called);
      assert.equal(mockSettingsService.navigate.lastCall.args[0],
        'wifi');
    });
  });
});
