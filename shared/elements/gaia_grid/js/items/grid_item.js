'use strict';
/* global devicePixelRatio */
/* global Promise */

(function(exports) {

  const SHADOW_BLUR = 1;
  const SHADOW_OFFSET_Y = 1;
  const SHADOW_OFFSET_X = 1;
  const SHADOW_COLOR = 'rgba(0, 0, 0, 0.2)';
  const UNSCALED_CANVAS_PADDING = 2;
  const CANVAS_PADDING = UNSCALED_CANVAS_PADDING * devicePixelRatio;
  const FETCH_XHR_TIMEOUT = 10000;

  // event names
  const ICON_BLOB_LOAD_EVENT = 'gaiagrid-iconblobload';
  const ICON_BLOB_ERROR_EVENT = 'gaiagrid-iconbloberror';

  /**
   * XHR wrapper for fetching blobs with timeout logic.
   *
   * @param {String} uri to fetch.
   * @return {Promise[Blob]}
   */
  function fetchBlob(uri) {
    return new Promise(function(accept, reject) {
      var xhr = new XMLHttpRequest({
        mozAnon: true,
        mozSystem: true
      });

      xhr.open('GET', uri, true);
      xhr.responseType = 'blob';
      xhr.timeout = FETCH_XHR_TIMEOUT;

      // remember that send can throw for some non http protocols. The promise
      // wrapper here protects us.
      xhr.send();

      xhr.onload = function() {
        var status = xhr.status;
        if (status !== 0 && status !== 200) {
          reject(
            new Error('Got HTTP status ' + status + ' trying to load ' + uri)
          );
          return;
        }
        accept(xhr.response);
      };

      xhr.onerror = xhr.ontimeout = function() {
        reject(new Error('Error while HTTP GET: ', uri));
      };
    });
  }

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

    scale: 1,

    /**
     * Whether or not this icon will persist to the database.
     */
    persistToDB: true,

    /**
     * Every grid item has a desired icon (over the network) if we fail to fetch
     * or render it for some reason we display another. This string keeps track
     * of the states:
     *
     *
     *  none:    no action has been taken yet to display or fetch the icon.
     *  pending: fetching the icon
     *  success: icon was fetched and displayed
     *  error:   icon could not be fetched or displayed
     *
     */
    iconState: 'none',

    /**
     * Default icon url to use when no other icon can be downloaded
     */
    get defaultIcon() {
      // XXX: ideally this would be relative to the component
      return '/shared/elements/gaia_grid/images/default_icon.png';
    },

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
     * Renders the given image src as the icon (with processing).
     *
     * @param {String} url The image url to display.
     */
    renderIconFromSrc: function(url) {
      var background = new Image();
      background.src = url;
      background.onload = this._decorateIcon.bind(this, background);
    },


    /**
     * Renders the given blob as the icon (with processing).
     *
     * @param {Blob} blob to render as icon.
     */
    renderIconFromBlob: function(blob) {
      var background = new Image();
      background.src = URL.createObjectURL(blob);
      background.onload = () => {
        this._decorateIcon(background);
        URL.revokeObjectURL(background.src);
      };
    },

    /**
     * Begins decoration process for a given icon.
     *
     * @param {HTMLImageElement} img An image element to display from.
     */
    _decorateIcon: function(img) {
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
          shadowCanvas.toBlob(this._displayDecoratedIcon.bind(this));
        }.bind(this);
        clipImage.src = clipCanvas.toDataURL();
      } else {
        shadowCtx.drawImage(img, CANVAS_PADDING, CANVAS_PADDING,
                      MAX_ICON_SIZE, MAX_ICON_SIZE);
        shadowCanvas.toBlob(this._displayDecoratedIcon.bind(this));
      }
    },

    /**
     * Finishes decoration process and displays the augmented icon.
     *
     * @param {Blob} blob The image blob to display.
     */
    _displayDecoratedIcon: function(blob) {
      this.element.style.height = this.grid.layout.gridItemHeight + 'px';
      this.element.style.backgroundSize =
        ((this.grid.layout.gridIconSize * (1 / this.scale)) +
        UNSCALED_CANVAS_PADDING) +'px';
      this.element.style.backgroundImage =
        'url(' + URL.createObjectURL(blob) + ')';
    },

    /**
     * Fetch an icon blob by a URI. This can be used as an extension hook to
     * implement caching logic into the fetching process.
     *
     * @return {Promise[Null|Blob]}
     */
    fetchIconBlob: function() {
      return fetchBlob(this.icon);
    },

    /**
     * Helper method to stamp the element with an icon uri. This stamp is for
     * debugging/testing only and has no other effect.
     */
    _stampElementWithIcon: function(uri) {
      // ensure we don't stamp URI
      if (uri.startsWith('data:')) {
        return;
      }

      // do not allow long strings on the stamp
      if (uri.length > 255) {
        uri = uri.slice(0, 255);
      }

      // test prefix used to indicate this has no functional value.
      this.element.dataset.testIcon = uri;
    },

    /**
    Fetch and render the desired icon (`.icon`) if possible otherwise fallback
    to the default icon.

    XXX: This method is not concurrency safe one image may override another
         without ordering.
    */
    renderIcon: function() {
      var icon = this.icon;
      this.iconState = 'pending';

      // fast path if the icon is not from an origin display it outright
      if (!this.isIconFromOrigin()) {
        // XXX: Should we convert data uri(s) to blobs?
        this._stampElementWithIcon(icon);
        this.renderIconFromSrc(icon);
        // state set after in case of some exception or whatever
        this.iconState = 'success';

        // noop
        return Promise.resolve();
      }

      // root element of the web component
      var eventTarget = this.grid.element;

      // handle any cases where the blob is null or the icon cannot be
      // fetched.
      var blobNotFound = () => {
        this.iconState = 'error';

        if (this.detail.defaultIconBlob) {
          // no stamp for saved blobs
          this.renderIconFromBlob(this.detail.defaultIconBlob);
          this._stampElementWithIcon('blobcache');
        } else {
          this.renderIconFromSrc(this.defaultIcon);
          this._stampElementWithIcon(this.defaultIcon);
        }

        eventTarget.dispatchEvent(
          new CustomEvent(ICON_BLOB_ERROR_EVENT, {
            detail: this
          })
        );
      };

      return this.fetchIconBlob().
        then((blob) => {
          // if the fetch was a success but no blob could be found short
          // short circuit... note that being offline is _not_ an error.
          if (!blob) {
            return blobNotFound();
          }

          this.renderIconFromBlob(blob);
          this.iconState = 'success';
          this.detail.defaultIconBlob = blob;
          this._stampElementWithIcon(icon);

          eventTarget.dispatchEvent(
            new CustomEvent(ICON_BLOB_LOAD_EVENT, {
              detail: this
            })
          );
        }).
        catch((err) => {
          console.error('Error fetching icon', err);
          blobNotFound();
        });
    },

    /**
     * Renders the icon to the container.
     * @param {Array} coordinates Grid coordinates to render to.
     * @param {Number} index The index of the items list of this item.
     */
    render: function(coordinates, index) {
      this.scale = this.grid.layout.percent;

      // Generate an element if we need to
      if (!this.element) {
        var tile = document.createElement('div');
        tile.className = 'icon';
        tile.dataset.identifier = this.identifier;
        tile.setAttribute('role', 'link');

        // This <p> has been added in order to place the title with respect
        // to this container via CSS without touching JS.
        var nameContainerEl = document.createElement('p');
        nameContainerEl.style.marginTop = (this.grid.layout.gridIconSize *
                                          (1 / this.scale)) + 'px';
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
        this.renderIcon();
        this.grid.element.appendChild(tile);
      }

      var x = coordinates[0] * this.grid.layout.gridItemWidth;
      var y = this.grid.layout.offsetY;
      this.setPosition(index);
      this.x = x;
      this.y = y;

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
