'use strict';

/* globals loadBodyHTML*/

requireApp('settings/shared/test/unit/load_body_html_helper.js');

suite('Achievements List > ', function() {

  var modules = [
    'unit/mock_settings_service',
    'modules/mvvm/observable_array',
    'unit/mock_list_view',
    'panels/achievements/achievements_template',
    'panels/achievements/achievements_list'
  ];
  var maps = {
    'panels/achievements/achievements_list': {
      'modules/settings_service': 'unit/mock_settings_service',
      'modules/mvvm/list_view': 'unit/mock_list_view',
      'panels/achievements/achievements_template': 'MockAchievementsTemplate'
    }
  };
  var achievementsList, observableArray;
  var mockAchievement = {
    issuer: 'fxos-sharing',
    criteria: 'achievements/sharing-is-caring'
  };

  suiteSetup(function(done) {
    loadBodyHTML('_achievements.html');

    // Create a new requirejs context
    var requireCtx = testRequire([], maps, function() {});

    // Define MockAchievementsTemplate
    var MockAchievementsTemplate = {};
    define('MockAchievementsTemplate', function() {
      return function() {
        return MockAchievementsTemplate;
      };
    });

    requireCtx(modules, function(MockSettingsService, ObservableArray,
      MockListView, MockAchievementsTemplate, AchievementsList) {
      achievementsList = AchievementsList(document.body.querySelector(
        '.achievements-list'));
      observableArray = ObservableArray;
      done();
    });
  });

  suite('achievements list initialized', function() {
    test('constructed', function() {
      assert.equal(achievementsList.achievements.length, 0);
      assert.isTrue(achievementsList._achievements instanceof observableArray);
    });
  });

  suite('update achievements list', function() {
    test('add an achievement to the list', function() {
      var achievements = [mockAchievement];
      achievementsList.achievements = achievements;
      assert.equal(achievementsList.achievements.length, 1);
    });

    test('remove last achievement from the list', function() {
      var achievements = [];
      achievementsList.achievements = achievements;
      assert.equal(achievementsList.achievements.length, 0);
    });
  });
});
