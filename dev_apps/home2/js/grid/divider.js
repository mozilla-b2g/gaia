'use strict';
/* global GridItem */
/* global layout */

(function() {
  // Icon container
  var container = document.getElementById('icons');

  /**
   * Represents a single divider on the homepage.
   */
  function Divider() {
    this.detail = {
      type: 'divider',
      index: 0
    };
  }

  Divider.prototype = {

    __proto__: GridItem.prototype,

    x: 0,
    y: 0,

    /**
     * Height in pixels of each divider.
     */
    pixelHeight: 70,

    /**
     * Width in grid units for each divider.
     */
    gridWidth: 4,

    scale: 1,

    /**
     * Renders the icon to the container.
     * @param {Object} coordinates Grid coordinates to render to.
     * @param {Number} index The index of the items list of this item.
     */
    render: function(coordinates, index) {
      // Generate the content if we need to
      if (!this.divider) {
        var divider = this.divider = document.createElement('div');
        divider.className = 'divider';
        divider.innerHTML = '<span></span>';
        container.appendChild(divider);
      }

      var y = layout.offsetY;
      this.divider.style.transform = 'translate(0 ,' + y + 'px)';

      this.detail.index = index;
      this.y = y;
    },

    remove: function() {
      if (this.divider) {
        this.divider.parentNode.removeChild(this.divider);
      }
    }
  };

  window.Divider = Divider;

}());
