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
      return 40;
    },

    /**
     * It renders the icon. If the URI of the icon is not defined or there is an
     * error fetching this one, the icon by default will be displayed (defined
     * by style in save.css).
     *
     * @param {Integer} Optional parameter which defines the size of the icon.
     */
    render: function render(size) {
      size = (size || this.size) * devicePixelRatio;
      var style = this.elem.style;
      style.backgroundSize = style.width = style.height = size + 'px';

      var uri = this.uri;
      if (!uri) {
        return;
      }

      fetchBlob(uri).then((blob) => {
        var img = new Image();
        img.src = URL.createObjectURL(blob);

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

          renderer.favicon(img).then((blob) => {
            var url = URL.createObjectURL(blob);
            style.backgroundImage = 'url(' + url + ')';
          });

          URL.revokeObjectURL(img.src);
        };
      });
    }
  };

  exports.Icon = Icon;

}(window));
