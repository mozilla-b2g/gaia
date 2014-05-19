'use strict';
/* global IconRetriever */
/* global layout */
/* global LazyLoader */

(function(exports) {

  const SHADOW_BLUR = 1;
  const SHADOW_OFFSET_Y = 1;
  const SHADOW_OFFSET_X = 1;
  const SHADOW_COLOR = 'rgba(0, 0, 0, 0.2)';
  const CANVAS_PADDING = 2;

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

    /**
     * Returns true if the icon is hosted at an origin.
     */
    isIconFromOrigin: function() {
      return this.icon.startsWith('http') || this.icon.startsWith('app:');
    },

    /**
     * Sets the item position
     */
    setPosition: function(position) {
      this.detail.index = position;
    },

    /**
     * Displays the icon as a background of the element.
     * @param {String} url The image url to display.
     */
    displayIcon: function(url) {
      var background = new Image();
      background.src = url || this.icon;
      background.onload = this.displayFromImage.bind(this, background);
    },

    /**
     * Displays an icon from an image element.
     * @param {HTMLImageElement} img An image element to display from.
     */
    displayFromImage: function(img) {
      const MAX_ICON_SIZE = layout.gridIconSize;

      var canvas = document.createElement('canvas');
      canvas.width = MAX_ICON_SIZE + (CANVAS_PADDING * 2);
      canvas.height = MAX_ICON_SIZE + (CANVAS_PADDING * 2);
      var ctx = canvas.getContext('2d');

      ctx.shadowColor = SHADOW_COLOR;
      ctx.shadowBlur = SHADOW_BLUR;
      ctx.shadowOffsetY = SHADOW_OFFSET_Y;
      ctx.shadowOffsetX = SHADOW_OFFSET_X;
      ctx.drawImage(img, CANVAS_PADDING, CANVAS_PADDING,
                    MAX_ICON_SIZE, MAX_ICON_SIZE);
      canvas.toBlob(this.renderIconFromBlob.bind(this));
    },

    /**
     * Displays an icon by blob
     * @param {Blob} blob The image blob to display.
     */
    renderIconFromBlob: function(blob) {
      this.element.style.height = layout.gridItemHeight + 'px';
      this.element.style.backgroundSize =
        (layout.gridIconSize + CANVAS_PADDING) + 'px';
      this.element.style.backgroundImage =
        'url(' + URL.createObjectURL(blob) + ')';
    },

    /**
     * Renders the icon to the container.
     * @param {Array} coordinates Grid coordinates to render to.
     * @param {Number} index The index of the items list of this item.
     */
    render: function(coordinates, index) {
      // Generate an element if we need to
      if (!this.element) {
        var tile = document.createElement('div');
        tile.className = 'icon';
        tile.dataset.identifier = this.identifier;
        tile.setAttribute('role', 'link');

        // This <p> has been added in order to place the title with respect
        // to this container via CSS without touching JS.
        var nameContainerEl = document.createElement('p');
        nameContainerEl.style.marginTop = layout.gridIconSize + 'px';
        tile.appendChild(nameContainerEl);

        var nameEl = document.createElement('span');
        nameEl.className = 'title';
        nameEl.textContent = this.name;
        nameContainerEl.appendChild(nameEl);

        // Add delete link if this icon is removable
        if (this.isRemovable()) {
          var removeEl = document.createElement('span');
          removeEl.className = 'remove';
          tile.appendChild(removeEl);
        }

        this.element = tile;
        if (this.isIconFromOrigin()) {
          LazyLoader.load(['shared/js/async_storage.js',
                           'js/icon_retrivier.js'], function() {
            IconRetriever.get(this);
          }.bind(this));
        } else {
          this.displayIcon();
        }

        container.appendChild(tile);
      }

      var x = coordinates[0] * layout.gridItemWidth;
      var y = layout.offsetY;
      this.setPosition(index);
      this.x = x;
      this.y = y;
      this.scale = layout.percent;

      // Avoid rendering the icon during a drag to prevent jumpiness
      if (this.noTransform) {
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
