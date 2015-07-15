/* exported IconsHelper */
'use strict';

/**
 *  Utility library that will help us to work with icons coming from
 *  different sources.
 */
(function IconsHelper(exports) {
  const ICON_CACHE_PERIOD = 24 * 60 * 60 * 1000; // 1 day
  const FETCH_XHR_TIMEOUT = 10000;
  const DEBUG = false;

  var dataStore = null;

  /**
   * Return default size in px based in devicePixelRatio
   *
   * Sized based on current homescreen selected icons for apps
   * in a configuration of 3 icons per row. See:
   * https://github.com/mozilla-b2g/gaia/blob/master/
   * shared/elements/gaia_grid/js/grid_layout.js#L15
   * @returns {Number}
   */
  function getDefaultIconSize() {
    var dpr = window.devicePixelRatio;
    return (dpr && dpr > 1) ? 142 : 84;
  }

  function sizeIsNearer(size1, size2, targetSize) {
    // TODO: weight for a larger vs. smaller icon?
    var delta1 = Math.abs(targetSize - size1);
    var delta2 = Math.abs(targetSize - size2);
    return (delta1 <= delta2);
  }

  /**
   * Return a promise that resolves to the URL of the best icon for a web page
   * given its meta data and web manifest.
   *
   * @param uri {string}
   * @param iconTargetSize {number}
   * @param placeObj {Object}
   * @param siteObj {Object}
   * @returns {Promise}
   */
  function getIcon(uri, iconTargetSize, placeObj = {}, siteObj = {}) {
    var iconUrl = null;

    iconTargetSize = iconTargetSize * window.devicePixelRatio;

    // First look for an icon in the Webmanifest.
    if (siteObj.webManifestUrl && siteObj.webManifest) {
      iconUrl = getBestIconFromWebManifest(siteObj.webManifest, iconTargetSize);
      if (DEBUG && iconUrl) {
        console.log('Icon from Web Manifest');
      }
    }

    // Then look for an icon in the Firefox manifest.
    if (!iconUrl && siteObj.manifest) {
      iconUrl = getBestIconFromWebManifest({
        icons: _convertToWebManifestIcons(siteObj.manifest)
      }, iconTargetSize);
      if (DEBUG && iconUrl) {
        console.log('Icon from Firefox App Manifest');
      }
    }

    // Otherwise, look into the meta tags.
    if (!iconUrl && placeObj.icons) {
      iconUrl = getBestIconFromMetaTags(placeObj.icons, iconTargetSize);
      if (DEBUG && iconUrl) {
        console.log('Icon from Meta tags');
      }
    }

    // Last resort, we look for a favicon.ico file.
    if (!iconUrl) {
      var a = document.createElement('a');
      a.href = uri;
      iconUrl = a.origin + '/favicon.ico';
      if (iconTargetSize) {
        iconUrl += '#-moz-resolution=' + iconTargetSize + ',' + iconTargetSize;
      }
      DEBUG && console.log('Icon from favicon.ico');
    }

    return new Promise(resolve => {
      resolve(iconUrl);
    });
  }


  /**
   * Same as above except the promise resolves as an object containing the blob
   * of the icon and its size in pixels.
   *
   * @param uri {string}
   * @param iconTargetSize {number}
   * @param placeObj {Object}
   * @param siteObj {Object}
   * @returns {Promise}
   */
  function getIconBlob(uri, iconTargetSize, placeObj = {}, siteObj = {}) {
    return new Promise((resolve, reject) => {
      getIcon(uri, iconTargetSize, placeObj, siteObj)
        .then(iconUrl => {
          // @todo Need a better syntax.
          getStore().then(iconStore => {
            iconStore.get(iconUrl).then(iconObj => {
              if (!iconObj || !iconObj.timestamp ||
                Date.now() - iconObj.timestamp >= ICON_CACHE_PERIOD) {
                return fetchIcon(iconUrl)
                  .then(iconObject => {
                    // We resolve here to avoid I/O blocking on dataStore and
                    // quicker display.
                    // Persisting to the dataStore takes place subsequently.
                    resolve(iconObject);

                    iconStore.add(iconObject, iconUrl);
                  })
                  .catch(err => {
                    reject(`Failed to fetch icon ${iconUrl}: ${err}`);
                  });
              }

              return resolve(iconObj);
            }).catch(err => {
              // We should fetch the icon and resolve the promise here, anyhow.
              reject(`Failed to get icon from dataStore: ${err}`);
            });
          }).catch(err => {
            // We should fetch the icon and resolve the promise here, anyhow.
            reject(`Error opening the dataStore: ${err}`);
          });
        });
    });
  }

  function getBestIconFromWebManifest(webManifest, iconSize) {
    var icons = webManifest.icons;
    if (!icons) {
      return null;
    }
    var maxSize = 10000;

    var bestSize = maxSize;
    var iconURL = null;
    iconSize = iconSize || getDefaultIconSize();

    icons.forEach((potentialIcon) => {
      if (!iconURL) {
        iconURL = potentialIcon.src;
      }

      var sizes = Array.from(potentialIcon.sizes);
      var nearestSize = getNearestSize(sizes, iconSize, bestSize);

      if (nearestSize !== bestSize &&
        sizeIsNearer(nearestSize, bestSize, iconSize)) {
        iconURL = potentialIcon.src;
        bestSize = nearestSize;
      }
    });
    return iconURL ? iconURL.href : null;
  }

  function _convertToWebManifestIcons(manifest) {
    return Object.keys(manifest.icons).map(function(size) {
      var url = manifest.icons[size];
      var sizes = new Set().add(size + 'x' + size);
      url = url.indexOf('http') > -1 ? url : manifest.origin + url;

      return {
        src: new URL(url),
        sizes: sizes
      };
    });
  }

  // See bug 1041482, we will need to support better
  // icons for different part of the system application.
  // A web page have different ways to defining icons
  // based on size, 'touch' capabilities and so on.
  // From gecko we will receive all the rel='icon'
  // defined which will contain as well the sizes
  // supported in that file.
  // This function will help to deliver the best suitable
  // icon based on that definition list.
  // The expected format is the following one:
  //
  // {
  //   '[uri 1]': {
  //     sizes: ['16x16 32x32 48x48', '60x60']
  //   },
  //   '[uri 2]': {
  //     sizes: ['16x16']
  //   }
  // }
  //
  // iconSize is an additional parameter to specify a concrete
  // size or the closest icon.
  function getBestIconFromMetaTags(icons, iconSize) {
    if (!icons) {
      return null;
    }
    iconSize = iconSize || getDefaultIconSize();
    var iconURL = null;
    var bestSize = 10000;

    Object.keys(icons).forEach((uri) => {
      var potentialIcon = icons[uri];
      if (!iconURL) {
        // Handle the case of no size info in the whole list
        iconURL = uri;
      }
      var sizes = Array.from(potentialIcon.sizes);
      var nearestSize = getNearestSize(sizes, iconSize, bestSize);

      if (nearestSize !== bestSize &&
        sizeIsNearer(nearestSize, bestSize, iconSize)) {
        iconURL = uri;
        bestSize = nearestSize;
      }
      if (potentialIcon.rel === 'apple-touch-icon') {
        var moreInfoUrl = 'https://developer.mozilla.org/en-US/' +
          'Apps/Build/Icon_implementation_for_apps#General_icons_for_web_apps';
        console.warn('Warning: The apple-touch icons are being used ' +
          'as a fallback only. They will be deprecated in ' +
          'the future. See ' + moreInfoUrl);
      }
    });
    return iconURL || null;
  }

  // Given an array of size strings e.g. (64x64), a target iconSize
  // and optionally a best-so-far-size,
  // return the nearest match
  function getNearestSize(sizes, iconSize, bestSize) {
    var bogusSize = 10000;
    if (!bestSize) {
      bestSize = bogusSize;
    }
    var nearestSize = sizes.reduce(function(nearestSize, sizeString, idx) {
      var size = widthFromSizeString(sizeString);
      if (isNaN(size)) {
        return nearestSize;
      }
      if (sizeIsNearer(size, nearestSize, iconSize)) {
        return size;
      } else {
        return nearestSize;
      }
    }, bestSize);
    return nearestSize === bogusSize ? -1 : nearestSize;
  }

  // Given an icon size by string YYxYY returns the
  // width measurement, so will assume this will be
  // used by strings that identify a square size.
  function widthFromSizeString(size) {
    size = size || '';
    var xIndex = size.indexOf('x');
    if (!xIndex) {
      return NaN;
    }
    return parseInt(size.substr(0, xIndex));
  }

  /**
   * Return a promise that resolves to a dataStore for icons.
   *
   * @returns {Promise}
   */
  function getStore() {
    return new Promise(resolve => {
      if (dataStore) {
        return resolve(dataStore);
      }
      navigator.getDataStores('icons').then(stores => {
        dataStore = stores[0];
        return resolve(dataStore);
      });
    });
  }

  /**
   * Clear all the icons in the store.
   *
   * @returns {Promise}
   */
  function clear() {
    return getStore().then(iconStore => {
      iconStore.clear();
    });
  }


  /**
   * Return a promise that resolves to an object containing the blob and size
   * in pixels of an icon given its URL `iconUrl`.
   *
   * @param {string} iconUrl
   * @returns {Promise}
   */
  function fetchIcon(iconUrl) {
    return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest({
        mozAnon: true,
        mozSystem: true
      });

      xhr.open('GET', iconUrl, true);
      xhr.responseType = 'blob';
      xhr.timeout = FETCH_XHR_TIMEOUT;

      // Remember that send() can throw for some non http protocols.
      // The promise wrapper here protects us.
      xhr.send();

      xhr.onload = () => {
        if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
          var iconBlob = xhr.response;
          var img = document.createElement('img');

          img.src = URL.createObjectURL(iconBlob);

          img.onload = () => {
            var iconSize = Math.max(img.naturalWidth, img.naturalHeight);

            resolve({
              url: iconUrl,
              blob: iconBlob,
              size: iconSize,
              timestamp: Date.now()
            });
          };

          img.onerror = () => {
            reject(new Error(`Error while loading image.`));
          };

          return;
        }

        reject(new Error(
          `Got HTTP status ${xhr.status} trying to load ${iconUrl}.`));
      };

      xhr.onerror = xhr.ontimeout = () => {
        reject(new Error(`Error while getting ${iconUrl}.`));
      };
    });
  }

  exports.IconsHelper = {
    getIcon: getIcon,
    getIconBlob: getIconBlob,

    getBestIconFromWebManifest: getBestIconFromWebManifest,
    getBestIconFromMetaTags: getBestIconFromMetaTags,

    fetchIcon: fetchIcon,

    get defaultIconSize() {
      return getDefaultIconSize();
    },

    clear: clear,

    // Make public for unit test purposes.
    getNearestSize: getNearestSize,
  };

})(window);
