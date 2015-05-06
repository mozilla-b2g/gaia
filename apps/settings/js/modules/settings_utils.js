/*
 * SettingsUtils is a singleton that we will provide all needed methods
 * when doing panel related actions.
 *
 * @module SettingsUtils
 */
define(function(require) {
  'use strict';

  // TODO
  // We need to move utils.js to SettingsUtils step by step
  var LazyLoader = require('shared/lazy_loader');

  var SettingsUtils = {
    /**
     * We will use LazyLoader to help us load settings' used templates
     * and then return the html to callback
     *
     * @memberOf SettingsUtils
     * @param {String} panelId - ID of target panel
     * @param {Function} callback - with html as its first parameter
     */
    loadTemplate: function su_loadTemplate(panelId, callback) {
      var templateElement = document.getElementById(panelId);
      if (!templateElement) {
        callback(null);
      } else {
        LazyLoader.load([templateElement], function() {
          callback(templateElement.innerHTML);
        });
      }
    },

    /**
     * Re-runs the font-fit title
     * centering logic.
     *
     * The gaia-header has mutation observers
     * that listen for changes in the header
     * title and re-run the font-fit logic.
     *
     * If buttons around the title are shown/hidden
     * then these mutation observers won't be
     * triggered, but we want the font-fit logic
     * to be re-run.
     *
     * This is a deficiency of <gaia-header>. If
     * anyone knows a way to listen for changes
     * in visibility, we won't need this anymore.
     *
     * @param {GaiaHeader} header
     * @private
     */
    runHeaderFontFit: function su_runHeaderFontFit(header) {
      var titles = header.querySelectorAll('h1');
      [].forEach.call(titles, function(title) {
        title.textContent = title.textContent;
      });
    }
  };

  return SettingsUtils;
});
