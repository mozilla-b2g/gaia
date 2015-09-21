/**
 * List installed replaceable home screens.
 */
define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var HomescreensList = require('panels/homescreens_list/homescreens_list');

  return function ctor_homescreens_panel() {
    var homescreensList = HomescreensList();

    return SettingsPanel({
      /**
       * @param {HTMLElement} panel The panel HTML element.
       */
      onInit: function hp_onInit(panel) {
        homescreensList.init({
          homescreensList: panel.querySelector('.my-home-screens'),
          moreLink: panel.querySelector('.get-more-home-screens')
        });
      },

      onBeforeShow: function hp_onBeforeShow() {
        homescreensList.listBuilder();
      }
    });
  };
});
