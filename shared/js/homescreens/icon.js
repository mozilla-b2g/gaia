'use strict';
/* global GridIconRenderer, devicePixelRatio, Promise */

(function(exports) {

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
   * Represents a generic icon.
   *
   * @param {DOMElement} The DOM element.
   * @param {String} icon uri.
   */
  function Icon(elem, uri) {
    this.elem = elem;
    this.uri = uri;
  }

  Icon.prototype = {
    /**
     * The size icon by default.
     */
    get size() {
      return this._size || 40;
    },

    set size(size) {
      this._size = size || this.size;
      var style = this.elem.style;
      var sizeInRems = (this._size / 10) + 'rem';
      style.backgroundSize = style.width = style.height = sizeInRems;
    },

    /**
     * It renders the icon. If the URI of the icon is not defined or there is an
     * error fetching this one, the icon by default will be displayed if it is
     * defined in the stylesheet.
     *
     * @param {Object} It defines two optional parameters. "size" which defines
     *                 the size of the icon and "type" that describes how the
     *                 icon will be rendered ('clip', 'favicon' or 'standard').
     *                 See GridIconRenderer.
     */
    render: function render(options) {
      options = options || {};
      var uri = this.uri;
      this.size = options.size;
      if (!uri) {
        return;
      }

      fetchBlob(uri).then(function(blob) {
        this.renderBlob(blob, options);
      }.bind(this));
    },

    renderBlob: function renderBlob(blob, options) {
      options = options || {};
      var style = this.elem.style;
      this.size = options.size;
      var img = new Image();
      img.src = URL.createObjectURL(blob);
      var size = this.size;

      img.onload = () => {
        var renderer = new GridIconRenderer({
          grid: {
            layout: {
              get gridIconSize() {
                return size;
              },
              get gridMaxIconSize() {
                return size * devicePixelRatio;
              }
            }
          }
        });

        var type = options.type || GridIconRenderer.TYPE.FAVICON;
        renderer[type](img).then((blob) => {
          var url = URL.createObjectURL(blob);
          var imageUrl = 'url(' + url + ')';
          style.backgroundImage = imageUrl;
          if (options.onLoad) {
            options.onLoad(blob);
          }
        });

        URL.revokeObjectURL(img.src);
      };
    }
  };

  exports.Icon = Icon;

}(window));
