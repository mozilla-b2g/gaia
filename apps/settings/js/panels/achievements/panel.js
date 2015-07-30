define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var AchievementsList = require('panels/achievements/achievements_list');
  var SettingsListener = require('shared/settings_listener');

  return function ctor_achievements_panel() {
    var achievementsList;
    var update = achievements => achievementsList.achievements = achievements;

    return SettingsPanel({
      onInit: function(panel) {
        var listElement = panel.querySelector('.achievements-list');
        achievementsList = AchievementsList(listElement);
      },

      onBeforeShow: function() {
        SettingsListener.observe(
          'achievements', achievementsList.achievements, update);
      },

      onHide: function() {
        SettingsListener.unobserve('achievements', update);
      }
    });
  };
});
