/**
 * Used to show homescreen details panel.
 */
define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var HomescreensDetails =
    require('panels/homescreen_details/homescreen_details');

  return function ctor_homescreen_details_panel() {
    var homescreensDetails = HomescreensDetails();

    return SettingsPanel({
      /**
       * @param {HTMLElement} panel The panel HTML element.
       */
      onInit: function hdp_onInit(panel) {
        homescreensDetails.init({
          icon: panel.querySelector('.developer-infos img'),
          headerTitle: panel.querySelector('.detail-title'),
          detailTitle: panel.querySelector('.developer-infos .title'),
          detailName: panel.querySelector('.developer-infos .name'),
          detailVersion: panel.querySelector('.version'),
          detailDescription: panel.querySelector('.description'),
          detailURL: panel.querySelector('.url'),
          detailURLLink: panel.querySelector('.url a'),
          uninstallButton: panel.querySelector('button.uninstall-homescreen')
        });

      },

      /**
       * @param {HTMLElement} panel The panel HTML element.
       * @param {Object} options
       */
      onBeforeShow: function hdp_onBeforeShow(panel, options) {
        homescreensDetails.onBeforeShow(options);
      }
    });
  };
});
