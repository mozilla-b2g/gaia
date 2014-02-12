'use strict';
/* global SettingsListener */

/**
 * When the GridView is enabled, it causes the display
 * to be overlaid with a grid pattern to help you gauge
 * positioning and alignment of items.
 * @class
 */
function GridView() {
  SettingsListener.observe('debug.grid.enabled', false, function(value) {
    !!value ? this.show() : this.hide();
  }.bind(this));
}

GridView.prototype = {
  /** @lends GridView */

  /**
   * A reference to the element which contains the grid overlay.
   * @type {Element}
   */
  grid: null,

  /**
   * Whether or not the GridView is visible.
   * @return {Boolean} The GridView is visible.
   */
  get visible() {
    return this.grid && this.grid.style.visibility === 'visible';
  },

  /**
   * Hides the overlay.
   */
  hide: function() {
    if (this.grid) {
      this.grid.style.visibility = 'hidden';
    }
  },

  /**
   * Shows the overlay.
   */
  show: function() {
    var grid = this.grid;
    if (!grid) {
      grid = document.createElement('div');
      grid.id = 'debug-grid';
      grid.dataset.zIndexLevel = 'debug-grid';

      this.grid = grid;
      document.getElementById('screen').appendChild(grid);
    }
    grid.style.visibility = 'visible';
  },

  /**
   * Toggles the displayed state of the overlay.
   */
  toggle: function() {
    this.visible ? this.hide() : this.show();
  }
};
