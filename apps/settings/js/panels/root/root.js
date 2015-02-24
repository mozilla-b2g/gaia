/* global TelephonySettingHelper */
/**
 * The module loads scripts used by the root panel. In the future these scripts
 * must be converted to AMD modules. Implementation details please refer to
 * {@link Root}.
 *
 * @module root/root
 */
define(function(require) {
  'use strict';

  var LazyLoader = require('shared/lazy_loader');

  /**
   * @alias module:root/root
   * @class Root
   * @requires module:shared/lazy_loader
   * @returns {Root}
   */
  function Root() {}

  Root.prototype = {
    _loadScripts: function root_loadScripts() {
      /**
       * Enable or disable the menu items related to the ICC card
       * relying on the card and radio state.
       */
      LazyLoader.load([
        'js/firefox_accounts/menu_loader.js',
        'js/telephony_settings.js',
        'js/telephony_items_handler.js'
      ], function() {
        TelephonySettingHelper
          .init()
          .then(function telephonySettingInitDone() {
            window.dispatchEvent(new CustomEvent('telephony-settings-loaded'));
          });
      });
    },

    init: function root_init() {
      // Load the necessary scripts after the UI update.
      setTimeout(this._loadScripts);
    }
  };

  return function ctor_root() {
    return new Root();
  };
});
