'use strict';
/* global IconRetriever */
/* global LazyLoader */

(function(exports) {

  const SHADOW_BLUR = 1;
  const SHADOW_OFFSET_Y = 1;
  const SHADOW_OFFSET_X = 1;
  const SHADOW_COLOR = 'rgba(0, 0, 0, 0.2)';
  const CANVAS_PADDING = 2;

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
     * Returns a reference to the current grid.
     * We can currently only have one grid per page.
     */
    get grid() {
      return document.getElementsByTagName('gaia-grid')[0]._grid;
    },

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
      const MAX_ICON_SIZE = this.grid.layout.gridIconSize;

      var shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = MAX_ICON_SIZE + (CANVAS_PADDING * 2);
      shadowCanvas.height = MAX_ICON_SIZE + (CANVAS_PADDING * 2);
      var shadowCtx = shadowCanvas.getContext('2d');

      shadowCtx.shadowColor = SHADOW_COLOR;
      shadowCtx.shadowBlur = SHADOW_BLUR;
      shadowCtx.shadowOffsetY = SHADOW_OFFSET_Y;
      shadowCtx.shadowOffsetX = SHADOW_OFFSET_X;

      if (this.detail.clipIcon) {
        // clipping to round the icon
        var clipCanvas = document.createElement('canvas');
        clipCanvas.width = shadowCanvas.width;
        clipCanvas.height = shadowCanvas.height;
        var clipCtx = clipCanvas.getContext('2d');

        clipCtx.beginPath();
        clipCtx.arc(clipCanvas.width / 2, clipCanvas.height / 2,
                    clipCanvas.height / 2 - CANVAS_PADDING, 0, 2 * Math.PI);
        clipCtx.clip();

        clipCtx.drawImage(img, CANVAS_PADDING, CANVAS_PADDING,
                               MAX_ICON_SIZE, MAX_ICON_SIZE);

        var clipImage = new Image();
        clipImage.onload = function clip_onload() {
          shadowCtx.drawImage(clipImage, CANVAS_PADDING, CANVAS_PADDING,
                                MAX_ICON_SIZE, MAX_ICON_SIZE);
          shadowCanvas.toBlob(this.renderIconFromBlob.bind(this));
        }.bind(this);
        clipImage.src = clipCanvas.toDataURL();
      } else {
        shadowCtx.drawImage(img, CANVAS_PADDING, CANVAS_PADDING,
                      MAX_ICON_SIZE, MAX_ICON_SIZE);
        shadowCanvas.toBlob(this.renderIconFromBlob.bind(this));
      }
    },

    /**
     * Displays an icon by blob
     * @param {Blob} blob The image blob to display.
     */
    renderIconFromBlob: function(blob) {
      this.element.style.height = this.grid.layout.gridItemHeight + 'px';
      this.element.style.backgroundSize =
        (this.grid.layout.gridIconSize + CANVAS_PADDING) + 'px';
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
        nameContainerEl.style.marginTop = this.grid.layout.gridIconSize + 'px';
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
          LazyLoader.load(
            ['/shared/js/async_storage.js',
             '/shared/elements/gaia_grid/js/icon_retriever.js'], function() {
            IconRetriever.get(this);
          }.bind(this));
        } else {
          this.displayIcon();
        }

        this.grid.element.appendChild(tile);
      }

      var x = coordinates[0] * this.grid.layout.gridItemWidth;
      var y = this.grid.layout.offsetY;
      this.setPosition(index);
      this.x = x;
      this.y = y;
      this.scale = this.grid.layout.percent;

      // Avoid rendering the icon during a drag to prevent jumpiness
      if (this.noTransform) {
        return;
      }

      this.transform(x, y, this.grid.layout.percent);
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
