/* exported WebManifestHelper */
'use strict';

/**
 *  Helper to fetch and process a Web Manifest.
 */
(function WebManifestHelper(exports) {

  /**
   * Get Manifest.
   *
   * @param {String} url Manifest URL
   * @returns {Promise} A promise of a response containing manifest data.
   */
  var getManifest = function(url) {
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest({mozSystem: true});
      xhr.open('get', url, true);
      xhr.responseType = 'json';
      xhr.setRequestHeader('Accept', 'application/manifest+json');
      xhr.onload = function() {
        var status = xhr.status;
        if (status == 200) {
          resolve(xhr.response);
        } else {
          reject(status);
        }
      };
      xhr.onerror = function(e) {
        console.error('Unable to get web manifest');
        reject(e.target.status);
      };
      xhr.send();
    });
  };

  /**
   *  Get the best icon URL for a given preferred size.
   *
   *  Inspired by /dom/apps/AppUtils.jsm in Gecko.
   *
   *  @param {Object} Raw manifest Manifest object.
   *  @param {String} URL the manifest was retrieved from.
   *  @param {Integer} size Preferred size in pixels.
   *  @returns {URL} URL object of icon URL.
   */
  var iconURLForSize = function(manifest, manifestURL, size) {
    var icons = processIcons(manifest, manifestURL);
    if (!icons) {
      return null;
    }
    var dist = 100000;
    var iconURL = null;
    icons.forEach(function(potentialIcon) {
      potentialIcon.sizes.forEach(function(sizeEntry) {
        var width = sizeEntry.substring(0, sizeEntry.indexOf('x'));
        var parsedSize = parseInt(width);
        if (Math.abs(parsedSize - size) < dist) {
          iconURL = new URL(potentialIcon.src, manifestURL);
          dist = Math.abs(parsedSize - size);
        }
      });
    });
    return iconURL;
  };

  const onlyDecimals = /^\d+$/,
    anyRegEx = new RegExp('any', 'i');

  /**
   * Process the icons member of a web manifest.
   *
   * Copied from /dom/manifest/ManifestProcess.jsm in Gecko.
   *
   * @param {Object} An un-processed manifest object.
   * @param {String} The base URL the manifest was fetched from.
   * @returns {Object} A processed manifest object.
   */
  var processIcons = function(manifest, baseURL) {
    const obj = {
        objectName: 'manifest',
        object: manifest,
        property: 'icons',
        expectedType: 'array'
      },
      icons = [];
    var value = extractValue(obj);

    if (Array.isArray(value)) {
      //filter out icons with no "src" or src is empty string
      var processableIcons = value.filter(
        icon => icon && Object.prototype.hasOwnProperty.call(icon, 'src') &&
          icon.src !== ''
      );
      for (var potentialIcon of processableIcons) {
        var src = processSrcMember(potentialIcon, baseURL);
        if(src !== undefined){
          var icon = {
            src: src,
            type: processTypeMember(potentialIcon),
            sizes: processSizesMember(potentialIcon),
            density: processDensityMember(potentialIcon)
          };
          icons.push(icon);
        }
      }
    }
    return icons;

    function processTypeMember(icon) {
      const obj = {
          objectName: 'icon',
          object: icon,
          property: 'type',
          expectedType: 'string'
        };
      var value = extractValue(obj),
        isParsable = (typeof value === 'string' && value.length > 0);
      return (value === '' || !isParsable) ? undefined : value;
    }

    function processDensityMember(icon) {
      const hasDensity = Object.prototype.hasOwnProperty.call(icon, 'density'),
        rawValue = (hasDensity) ? icon.density : undefined,
        value = parseFloat(rawValue),
        result = (Number.isNaN(value) || value === +Infinity ||
          value <= 0) ? 1.0 : value;
      return result;
    }

    function processSrcMember(icon, baseURL) {
      const obj = {
          objectName: 'icon',
          object: icon,
          property: 'src',
          expectedType: 'string'
        },
        value = extractValue(obj);
      var url;
      if (typeof value === 'string' && value.trim() !== '') {
        try {
          url = new URL(value, baseURL);
        } catch (e) {}
      }
      return url;
    }

    function processSizesMember(icon) {
      const sizes = new Set(),
        obj = {
          objectName: 'icon',
          object: icon,
          property: 'sizes',
          expectedType: 'string'
        };
      var value = extractValue(obj);
      value = (value) ? value.trim() : value;
      if (value) {
        //split on whitespace and filter out invalid values
        var validSizes = value.split(/\s+/).filter(isValidSizeValue);
        validSizes.forEach((size) => sizes.add(size));
      }
      return sizes;

      /*
       * Implementation of HTML's link@size attribute checker
       */
      function isValidSizeValue(size) {
        if (anyRegEx.test(size)) {
          return true;
        }
        size = size.toLowerCase();
        if (!size.contains('x') || size.indexOf('x') !==
          size.lastIndexOf('x')) {
          return false;
        }

        //split left of x for width, after x for height
        const width = size.substring(0, size.indexOf('x'));
        const height = size.substring(size.indexOf('x') + 1, size.length);
        const isValid = !(height.startsWith('0') || width.startsWith('0') ||
          !onlyDecimals.test(width + height));
        return isValid;
      }
    }
  };

  /*
   * Extract a value from a manifest.
   *
   * This helper function is used to extract values from manifest members.
   * It also reports conformance violations.
   *
   * Copied from /dom/manifest/ManifestProcess.jsm in Gecko.
   */
  function extractValue(obj) {
    var value = obj.object[obj.property];
    //we need to special-case "array", as it's not a JS primitive
    const type = (Array.isArray(value)) ? 'array' : typeof value;

    if (type !== obj.expectedType) {
      if (type !== 'undefined') {
        var msg = 'Expected the ' + obj.objectName + 's ' + obj.property +
        ' member to be a ' + obj.expectedType;
        console.warn(msg);
      }
      value = undefined;
    }
    return value;
  }

  exports.WebManifestHelper = {
    getManifest: getManifest,
    iconURLForSize: iconURLForSize
  };

})(window);
