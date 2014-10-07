'use strict';
/* global GaiaGrid */
/* global LazyLoader */

(function(exports) {

  /**
   * Represents a shelf in the grid.
   */
  function Shelf(detail) {
    this.type = 'shelf';
    this.detail = {
      type: 'shelf',
      id: detail.id,
      index: 0
    };
  }

  Shelf.prototype = {

    __proto__: GaiaGrid.GridItem.prototype,

    x: 0,
    y: 0,

    headerHeight: 0,

    /**
     * Height in pixels of each shelf.
     */
    get pixelHeight() {
      return 100 * window.devicePixelRatio;
    },

    /**
     * Width in grid units for each shelf.
     */
    gridWidth: 4,

    scale: 1,

    /**
     * Renders the icon to the grid component.
     */
    render: function() {
      // Generate the content if we need to
      if (!this.element) {
        var shelf = this.element = document.createElement('section');
        shelf.className = 'shelf';

        LazyLoader.load([
          '/elements/shelf_' + this.detail.id + '/js/'
        ], () => {
          var customElement = document.createElement('shelf_' + this.detail.id);
          shelf.appendChild(customElement);
        });

        this.grid.element.appendChild(shelf);
      }

      this.element.style.transform = 'translate(0 ,' + this.y + 'px)';
    },

    remove: function() {
      if (this.element) {
        this.element.parentNode.removeChild(this.element);
      }
    },

    isDraggable: function() {
      return false;
    }
  };

  exports.GaiaGrid.Shelf = Shelf;

}(window));
