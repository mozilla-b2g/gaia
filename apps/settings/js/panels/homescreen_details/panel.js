/**
 * Used to show homescreen details panel.
 */
define(require => {
  'use strict';

  const DEFAULT_MANIFEST = 'app://verticalhome.gaiamobile.org/manifest.webapp';

  var SettingsPanel = require('modules/settings_panel');
  var HomescreensDetails =
    require('panels/homescreen_details/homescreen_details');
  var HomescreenCols = require('panels/homescreen_details/homescreen_cols');

  var gridSelect = null;

  return function ctor_homescreen_details_panel() {
    var homescreenCols = HomescreenCols();
    var homescreensDetails = HomescreensDetails();

    return SettingsPanel({
      onInit: function hdp_onInit(panel, options) {
        homescreensDetails.init({
          detailTitle: panel.querySelector('.detail-title'),
          detailURLLink: panel.querySelector('.developer-infos a'),
          detailName: panel.querySelector('.developer-infos .name'),
          detailURL: panel.querySelector('.developer-infos .url'),
          detailVersion: panel.querySelector('.version'),
          detailDescription: panel.querySelector('.description'),
          uninstallButton: panel.querySelector('button.uninstall-homescreen')
        });

        gridSelect = panel.querySelector('[name="grid.layout.cols"]');
        gridSelect.addEventListener('change', function() {
          homescreenCols.setCols(this.value);
        });

        this._updateCols(homescreenCols.cols);
      },

      onBeforeShow: function hdp_onBeforeShow(panel, options) {
        homescreensDetails.onBeforeShow(options);

        homescreenCols.observe('cols', this._updateCols);

        // Hide or show the legacy homescreen layout section.
        var legacyLayout = panel.querySelector('#legacy-homescreen-layout');
        legacyLayout.classList.toggle('visible',
          options.app.manifestURL === DEFAULT_MANIFEST);
      },

      onBeforeHide: function hdp_onBeforeHide() {
        homescreenCols.unobserve('cols');
      },

      _updateCols: function hdp_updateCols(number) {
        if (!number) {
          return;
        }

        var option =
          gridSelect.querySelector('[value="' + number + '"]');

        if (option) {
          option.selected = true;
        }
      }
    });
  };
});
