'use strict';
/* global devicePixelRatio */
/* global IconRetriever */
/* global LazyLoader */

(function(exports) {

  const SHADOW_BLUR = 1;
  const SHADOW_OFFSET_Y = 1;
  const SHADOW_OFFSET_X = 1;
  const SHADOW_COLOR = 'rgba(0, 0, 0, 0.2)';
  const UNSCALED_CANVAS_PADDING = 2;
  const CANVAS_PADDING = UNSCALED_CANVAS_PADDING * devicePixelRatio;

  /**
   * Represents a generic grid item from which other items can inherit from.
   */
  function GridItem() {
    this.detail = {};
  }

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

    /**
     * Whether or not this icon will persist to the database.
     */
    persistToDB: true,

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
     * Displays the icon as a background of the element. A shadow will be
     * generated for the icon before it is rendered.
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
      const MAX_ICON_SIZE = this.grid.layout.gridIconSize * devicePixelRatio;

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
          this.renderIconFromURL(shadowCanvas.toDataURL());
        }.bind(this);
        clipImage.src = clipCanvas.toDataURL();
      } else {
        shadowCtx.drawImage(img, CANVAS_PADDING, CANVAS_PADDING,
                      MAX_ICON_SIZE, MAX_ICON_SIZE);
        this.renderIconFromURL(shadowCanvas.toDataURL());
      }
    },

    /**
     * Renders an icon by url
     * @param {String} url The image url to render.
     */
    renderIconFromURL: function(url) {
      this.iconElement.src = url;
    },

    showDownloading: function() {
      if (this.element) {
        this.element.classList.add('loading');
      }
    },

    hideDownloading: function() {
      if (this.element) {
        this.element.classList.remove('loading');
      }
    },

    /**
     * Renders the icon to the container.
     * @param {Array} coordinates Grid coordinates to render to.
     * @param {Number} index The index of the items list of this item.
     * @param {Boolean} useTransform Use a transform instead of left/top to
     * position the item
     */
    render: function(coordinates, index, useTransform) {
      // Generate an element if we need to
      if (!this.element) {
        var tile = document.createElement('div');
        tile.className = 'icon';
        tile.dataset.identifier = this.identifier;
        tile.setAttribute('role', 'link');

        var icon = document.createElement('img');
        icon.className = 'image';
        tile.appendChild(icon);

        // This <p> has been added in order to place the title with respect
        // to this container via CSS without touching JS.
        var nameContainerEl = document.createElement('p');
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
        this.iconElement = icon;

        if (this.isIconFromOrigin()) {
          LazyLoader.load(
            ['/shared/js/async_storage.js',
             '/shared/elements/gaia_grid/js/icon_retriever.js'], function() {
            var app = this.app;
            // The download should finish when the icon is local
            if (app && app.downloading && this.icon.startsWith('app:')) {
              this.showDownloading();
              app.ondownloadsuccess = app.ondownloaderror = function() {
                app.ondownloadsuccess = app.ondownloaderror = null;
                IconRetriever.get(this, this.hideDownloading.bind(this));
              }.bind(this);
              return;
            }
            IconRetriever.get(this);
          }.bind(this));
        } else {
          this.displayIcon();
        }

        this.grid.element.appendChild(tile);
      }

      // XXX Ideally we'd set this in the CSS using calc(100% / columnWidth),
      //     but it's a lot less hassle to set it here.
      var width = this.grid.layout.gridItemWidth;

      var x = coordinates[0] * width;
      var y = this.grid.layout.offsetY;
      this.element.style.width = width + 'px';
      this.setPosition(index);
      this.x = x;
      this.y = y;
      if (this.iconElement) {
        this.iconElement.style.height = (this.grid.layout.gridIconSize) + 'px';
      }

      // Avoid rendering the icon during a drag to prevent jumpiness
      if (this.noTransform) {
        return;
      }

      this.transform(x, y, 1, useTransform);
    },

    /**
     * Positions and scales an icon.
     */
    transform: function(x, y, scale, useTransform) {
      // There are two paths to position the icon, one using transforms and
      // the other using absolute positioning. Both paths cause different
      // layerisation behaviour in Gecko, and so either may be more
      // performant depending on what properties are applied to the icon and
      // its children.
      if (useTransform) {
        scale = scale || 1;
        this.element.style.left = '';
        this.element.style.top = '';
        this.element.style.transform =
          'translate(' + x + 'px,' + y + 'px) scale(' + scale + ')';

        // Force a style computation so that the above doesn't incorrectly
        // transition before adding this class
        this.element.clientTop;

        this.element.classList.add('has-transform');
      } else {
        this.element.classList.remove('has-transform');
        this.element.style.left = x + 'px';
        this.element.style.top = y + 'px';
        if (scale && scale != 1) {
          this.element.style.transform = 'scale(' + scale + ')';
        } else {
          this.element.style.transform = '';
        }
      }
    }
  };

  exports.GridItem = GridItem;

}(window));
