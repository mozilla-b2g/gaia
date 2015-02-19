/**
 * Handle support panel functionality with SIM and without SIM
 */
define(function(require) {
  'use strict';

  var SettingsListener = require('shared/settings_listener');

  /**
   * @alias module:developer_hud/developer_hud
   * @class DeveloperHud
   * @returns {DeveloperHud}
   */
  var DeveloperHud = function() {
    this._elements = {};
  };

  DeveloperHud.prototype = {
    /**
     * Initialization.
     *
     * @access public
     * @memberOf DeveloperHud.prototype
     * @param  {Object} elements
     */
    init: function about_init(elements) {
      this._elements = elements;
      SettingsListener.observe('devtools.overlay', false,
        (enabled) => {
          [].forEach.call(this._elements.widgets, function(widget) {
            widget.classList.toggle('disabled', !enabled);
          });
        });

      SettingsListener.observe('hud.appmemory', false,
        (enabled) => {
          [].forEach.call(this._elements.items, function(item) {
            item.parentElement.parentElement.classList.toggle('disabled',
              !enabled);
          });
        });
    }
  };

  return function ctor_developer_hud_panel() {
    return new DeveloperHud();
  };
});
