/**
 * List installed replaceable homescreens.
 */
define(require => {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var HomescreensList = require('panels/homescreen_list/homescreen_list');
  var UpdateCheck = require('panels/homescreen_list/update_check');

  return function ctor_homescreens_panel() {
    var homescreensList = HomescreensList();
    var updateCheck = UpdateCheck();

    return SettingsPanel({
      onInit: function hp_onInit(panel) {
        homescreensList.init({
          homescreensList: panel.querySelector('#homescreens-list'),
          moreLink: panel.querySelector('#get-more-home-screens')
        });

        updateCheck.init({
          checkUpdateNow: panel.querySelector('.check-update'),
          updateStatus: panel.querySelector('.update-status'),
          systemStatus: panel.querySelector('.system-update-status')
        });
      },

      onBeforeShow: function hp_onBeforeShow() {
        homescreensList.listBuilder();
      }
    });
  };
});
