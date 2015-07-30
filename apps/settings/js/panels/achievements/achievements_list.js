/**
 * UI for Achievements panel's functionality.
 */
define(function(require) {
  'use strict';

  var ListView = require('modules/mvvm/list_view');
  var ObservableArray = require('modules/mvvm/observable_array');
  var AchievementsTemplate = require(
    'panels/achievements/achievements_template');

  function AchievementsList(root) {
    this._achievements = ObservableArray([]);
    this._listView = ListView(root, this._achievements, AchievementsTemplate);
  }

  AchievementsList.prototype = {
    get achievements() {
      return this._achievements.array;
    },

    set achievements(achievements) {
      achievements = achievements || [];
      this._achievements.reset(achievements);
    }
  };

  return function ctor_achievements_list(panel) {
    return new AchievementsList(panel);
  };
});
