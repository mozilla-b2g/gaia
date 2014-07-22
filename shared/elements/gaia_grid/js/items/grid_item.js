'use strict';
/* global GridIconRenderer */
/* global Promise */
/* global UrlHelper */

(function(exports) {

  // event names
  const ICON_BLOB_DECORATED_EVENT = 'iconblobdecorated';
  const ICON_BLOB_ERROR_EVENT = 'gaiagrid-iconbloberror';
  const FETCH_XHR_TIMEOUT = 10000;

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
     * Whether or not this item has a cached icon or not.
     */
    get hasCachedIcon() {
      return this.detail && this.detail.decoratedIconBlob;
    },

    /**
     * The icon renderer to use. Sub-classes may override this, and individual
     * objects may as well with a custom detail.renderer property.
     * Bookmarks use this for example to render both web results from E.me,
     * and favicons from the web with different styles.
     */
    renderer: GridIconRenderer.TYPE.STANDARD,

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
     * Returns true if this item is draggable.
     */
    isDraggable: function() {
      return true;
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
     * Given a list of icons that match a size, return the closest icon to
     * reduce possible pixelation by picking a wrong size.
     * @param {Object} choices An object mapping icon size to icon URL.
     */
    closestIconFromList: function(choices) {
      if (!choices) {
        return this.defaultIcon;
      }

      // Create a list with the sizes and order it by descending size.
      var list = Object.keys(choices).map(function(size) {
        return size;
      }).sort(function(a, b) {
        return b - a;
      });

      var length = list.length;
      if (length === 0) {
        // No icons -> return the default icon.
        return this.defaultIcon;
      }

      var maxSize = this.grid.layout.gridMaxIconSize; // The goal size
      var accurateSize = list[0]; // The biggest icon available
      for (var i = 0; i < length; i++) {
        var size = list[i];

        if (size < maxSize) {
          break;
        }

        accurateSize = size;
      }

      var icon = choices[accurateSize];

      // Handle relative URLs
      if (!UrlHelper.hasScheme(icon)) {
        var a = document.createElement('a');
        a.href = this.app.origin;
        icon = a.protocol + '//' + a.host + icon;
      }

      return icon;
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
      var strategy = this.detail.renderer || this.renderer;
      this.rendererInstance = new GridIconRenderer(this);
      this.rendererInstance[strategy](img).
        then(this._displayDecoratedIcon.bind(this));
    },

    /**
     * Finishes decoration process and displays the augmented icon.
     *
     * @param {Blob} blob The image blob to display.
     */
    _displayDecoratedIcon: function(blob, isCachedIcon) {
      if (!this.element) {
        // The icon could be removed while it is being decorated
        return;
      }

      var style = this.element.style;

      if (!style.backgroundSize) {
        style.height = this.grid.layout.gridItemHeight + 'px';
        // icon size + padding for shadows implemented in the icon renderer
        style.backgroundSize =
          ((this.grid.layout.gridIconSize * (1 / this.scale)) +
          GridIconRenderer.prototype.unscaledCanvasPadding) + 'px';
      }

      if (isCachedIcon) {
        var url = URL.createObjectURL(blob);
        style.backgroundImage = 'url(' + url + ')';
        this.element.dataset.backgroundImage = url;
        var img = new Image();
        img.onload = img.onerror = () => {
          this.grid.element.dispatchEvent(
            new CustomEvent('cached-icon-rendered')
          );
        };
        img.src = url;
        return;
      }

      this._compareBlobs(blob, this.detail.decoratedIconBlob).
      then((equal) => {
        if (equal) {
          return;
        }

        style.backgroundImage = 'url(' + URL.createObjectURL(blob) + ')';
        this.detail.decoratedIconBlob = blob;
        this.grid.element.dispatchEvent(
          new CustomEvent(ICON_BLOB_DECORATED_EVENT, {
            detail: this
          })
        );
        var bgImg = this.element.dataset.backgroundImage;
        bgImg && URL.revokeObjectURL(bgImg);
      });
    },

    /**
     * It compares two blobs.
     */
    _compareBlobs: function(blob1, blob2) {
      return new Promise(function(resolve) {
        if (!blob1 || !blob2 || blob1.type !== blob2.type ||
           blob1.size !== blob2.size) {
          resolve(false);
          return;
        }

        // We skip the first bytes that typically are headers
        var startBytes = 127;
        var bytesHash = 16;
        var reader = new FileReader();

        reader.onloadend = function() {
          var result1 = reader.result;

          reader = new FileReader();

          reader.onloadend = reader.onerror = function() {
            resolve(result1 === reader.result);
          };

          reader.readAsDataURL(blob2.slice(startBytes, startBytes + bytesHash));
        };

        reader.onerror = function() {
          resolve(false);
        };

        reader.readAsDataURL(blob1.slice(startBytes, startBytes + bytesHash));
      });
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
      if (!this.element || uri.startsWith('data:')) {
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
    renderIcon: function(renderCachedIcon) {
      var icon = this.icon;
      this.iconState = 'pending';

      if (renderCachedIcon && this.hasCachedIcon) {
        // Display cached icons before trying to get icons again.
        this._displayDecoratedIcon(this.detail.decoratedIconBlob, true);
        var resolveIcon = () => {
          this.grid.element.removeEventListener('cached-icons-rendered',
                                                 resolveIcon);
          this.doRenderIcon(icon);
        };
        this.grid.element.addEventListener('cached-icons-rendered',
                                            resolveIcon);
      } else {
        this.doRenderIcon(icon);
      }
    },

    doRenderIcon: function(icon) {
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

        if (!this.hasCachedIcon) {
          this.renderIconFromSrc(this.defaultIcon);
          this._stampElementWithIcon(this.defaultIcon);
        } else {
          this._stampElementWithIcon('blobcache');
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
          this._stampElementWithIcon(icon);
        }).
        catch((err) => {
          console.error('Error fetching icon', err);
          blobNotFound();
        });
    },

    /**
    Safely remove this item from the grid and DOM.
    */
    removeFromGrid: function() {
      var idx = this.grid.items.indexOf(this);

      // This should never happen but is remotely possible item is not in the
      // grid.
      if (idx === -1) {
        console.error('Attempting to remove self before item has been added!');
        return;
      }

      // update the state of the grid and DOM so this item is no longer
      // referenced.
      this.grid.items.splice(idx, 1);
      delete this.grid.icons[this.identifier];

      if (this.element) {
        this.element.parentNode.removeChild(this.element);
      }

      // ensure we don't end up with empty cruft..
      this.grid.render({ from: idx - 1 });
    },

    /**
    Removes item from the dom and dispatches a removeitem event.
    */
    remove: function() {
      this.grid.element.dispatchEvent(new CustomEvent('removeitem', {
        detail: this
      }));
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
        tile.dataset.isDraggable = this.isDraggable();
        tile.setAttribute('role', 'link');

        // This <p> has been added in order to place the title with respect
        // to this container via CSS without touching JS.
        var nameContainerEl = document.createElement('p');
        nameContainerEl.style.marginTop = ((this.grid.layout.gridIconSize *
          (1 / this.scale)) +
          (GridIconRenderer.prototype.unscaledCanvasPadding / 2)) + 'px';
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
        this.renderIcon(true);
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
    transform: function(x, y, scale, element) {
      scale = scale || 1;
      element = element || this.element;
      element.style.transform =
        'translate(' + x + 'px,' + y + 'px) scale(' + scale + ')';
    },

    /**
    Updates the title of the icon on the grid.
    */
    updateTitle: function() {
      // it is remotely possible that we have not .rendered yet
      if (!this.element) {
        return;
      }
      var nameEl = this.element.querySelector('.title');
      nameEl.textContent = this.name;
    },

    /**
     * Updates an icon on the page from a datastore record.
     * Used for bookmarks and collections.
     * @param {Object} record The datastore record.
     */
    updateFromDatastore: function(record) {
      var iconChanged = record.icon !== this.icon;
      var nameChanged = record.name !== this.name;

      var type = this.detail.type;
      var lastIcon = this.icon;
      record.type = type;
      this.detail = record;
      if (nameChanged) {
        this.updateTitle();

        // Bug 1007743 - Workaround for projected content nodes disappearing
        document.body.clientTop;
        this.element.style.display = 'none';
        document.body.clientTop;
        this.element.style.display = '';
      }

      if (iconChanged && record.icon) {
        this.renderIcon();
      } else if (!record.icon) {
        this.detail.icon = lastIcon;
      }
    }
  };

  exports.GaiaGrid.GridItem = GridItem;

}(window));
