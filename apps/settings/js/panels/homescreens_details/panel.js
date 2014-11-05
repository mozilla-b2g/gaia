/**
 * Used to show Personalization/Homescreens details panel
 */
define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var HomescreensDetails =
    require('panels/homescreens_details/homescreens_details');

  return function ctor_homescreen_details_panel() {
    var homescreensDetails = HomescreensDetails();

    return SettingsPanel({
      onInit: function(panel, options) {
        var elements = {
          detailTitle: panel.querySelector('#homescreens-details-title'),
          detailDescription:
            panel.querySelector('#homescreens-details > div > p'),
          detailButton:
            panel.querySelector('#homescreens-details > div > button')
        };
        homescreensDetails.init(elements);
      },
      onBeforeShow: function(panel, options) {
        homescreensDetails.onBeforeShow(options);
      }
    });
  };
});
