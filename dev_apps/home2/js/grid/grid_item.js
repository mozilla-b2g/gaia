'use strict';
/* global IconRetriever */
/* global layout */
/* global LazyLoader */

(function(exports) {
  // Icon container
  var container = document.getElementById('icons');

  /**
   * Represents a generic grid item from which other items can inherit from.
   */
  function GridItem() {}

  GridItem.prototype = {

    x: 0,
    y: 0,

    /**
     * Height in pixels of each item.
     */
    pixelHeight: 0,

    /**
     * Width in grid units for each item.
     */
    gridWidth: 1,

    scale: 1,

    /**
     * Returns true if this item is removable.
     */
    isRemovable: function() {
      return false;
    },

    /**
     * Returns true if this item is editable.
     */
    isEditable: function() {
      return false;
    },

    isRemoteIcon: function() {
      return this.icon.startsWith('http');
    },

    /**
     * Sets the item position
     */
    setPosition: function(position) {
      this.detail.index = position;
    },

    /**
     * Displays the icon as a background of the element.
     */
    displayIcon: function(url) {
      this.element.style.backgroundSize = layout.gridIconSize + 'px';
      this.element.style.backgroundImage = 'url(' + (url || this.icon) + ')';
    },

    /**
     * Renders the icon to the container.
     * @param {Object} coordinates Grid coordinates to render to.
     * @param {Number} index The index of the items list of this item.
     */
    render: function(coordinates, index) {
      var x = coordinates.x * layout.gridItemWidth;
      var y = layout.offsetY;
      var nameEl = null;

      // Generate an element if we need to
      if (!this.element) {
        var tile = document.createElement('div');
        tile.className = 'icon';
        tile.dataset.identifier = this.identifier;

        nameEl = document.createElement('span');
        nameEl.className = 'title';
        tile.appendChild(nameEl);

        // Add delete link if this icon is removable
        if (this.isRemovable()) {
          var removeEl = document.createElement('span');
          removeEl.className = 'remove';
          tile.appendChild(removeEl);
        }

        this.element = tile;
        if (this.isRemoteIcon()) {
          LazyLoader.load(['shared/js/async_storage.js',
                           'js/icon_retrivier.js'], function() {
            IconRetriever.get(this);
          }.bind(this));
        } else {
          this.displayIcon();
        }

        container.appendChild(tile);
      } else {
        nameEl = this.element.querySelector('.title');
      }

      nameEl.textContent = this.name;

      this.setPosition(index);
      this.x = x;
      this.y = y;
      this.scale = layout.percent;

      // Avoid rendering the icon during a drag to prevent jumpiness
      if (this.noRender) {
        return;
      }

      this.transform(x, y, layout.percent);
    },

    /**
     * Positions and scales an icon.
     */
    transform: function(x, y, scale) {
      scale = scale || 1;
      this.element.style.transform =
        'translate(' + x + 'px,' + y + 'px) scale(' + scale + ')';
    }
  };

  exports.GridItem = GridItem;

}(window));
