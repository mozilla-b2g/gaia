'use strict';

suite('Achievements Panel > ', function() {

  var modules = [
    'panels/achievements/panel',
    'panels/achievements/achievements_list',
    'shared/settings_listener',
    'unit/mock_settings_panel'
  ];
  var map = {
    '*': {
      'modules/settings_panel': 'unit/mock_settings_panel',
      'panels/achievements/achievements_list': 'MockAchievementsList',
      'shared/settings_listener': 'shared_mocks/mock_settings_listener'
    }
  };

  var settingsListener;

  suiteSetup(function(done) {
    // Create a new requirejs context
    var requireCtx = testRequire([], map, function() {});
    var that = this;

    var MockAchievementsList = {
      get achievements() {},
      set achievements(val) {}
    };

    define('MockAchievementsList', function() {
      return function() {
        return MockAchievementsList;
      };
    });

    requireCtx(modules, function(AchievementsPanel, MockAchievementsList,
      MockSettingsListener, MockSettingsPanel) {
      MockSettingsPanel.mInnerFunction = options => Object.assign({}, options);

      that.panel = AchievementsPanel();
      that.achievementsList = MockAchievementsList();

      settingsListener = MockSettingsListener;
      settingsListener.observe = sinon.spy();
      settingsListener.unobserve = sinon.spy();
      done();
    });
  });

  suite('panel initialized', function() {
    setup(function() {
      this.panel.onInit(document.body);
      this.panel.onBeforeShow();
    });
    test('settings listener observer attached', function() {
      assert(settingsListener.observe.calledOnce);
      assert(settingsListener.observe.calledWith('achievements',
        this.achievementsList.achievements));
    });
  });

  suite('panel uninitialized', function() {
    setup(function() {
      this.panel.onHide();
    });
    test('settings listener observer detached', function() {
      assert(settingsListener.unobserve.calledOnce);
      assert(settingsListener.unobserve.calledWith('achievements'));
    });
  });

});
