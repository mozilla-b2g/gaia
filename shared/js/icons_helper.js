/* exported IconsHelper */
'use strict';

/**
 *  Utility library that will help us to work with icons coming from
 *  different sources.
 */
(function IconsHelper(exports) {

  //
  // See bug 1041482, we will need to support better
  // icons for different part of the system application.
  // A web page have different ways to defining icons
  // based on size, 'touch' capabilities and so on.
  // From gecko we will receive all the rel='icon'
  // defined which will containg as well the sizes
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
  // iconSize is an aditional parameter to specify a concrete
  // size or the closest icon.
  function getBestIcon(icons, iconSize) {
    if (!icons) {
      return null;
    }

    var options = getSizes(icons);
    var sizes = Object.keys(options).sort(function(a, b) {
      return a - b;
    });
    // Handle the case of no size info in the whole list
    // just return the first icon.
    if (sizes.length === 0) {
      var iconStrings = Object.keys(icons);
      return iconStrings.length > 0 ? iconStrings[0] : null;
    }


    var preferredSize = getPreferredSize(sizes, iconSize);

    return options[preferredSize];
  }

  // Given an object representing the icons detected in a web
  // return the list of sizes and which uris offer the specific
  // size.
  // Current implementation overrides the source if the size is
  // defined twice.
  function getSizes(icons) {
    var sizes = {};
    var uris = Object.keys(icons);
    uris.forEach(function(uri) {
      var uriSizes = icons[uri].sizes.join(' ').split(' ');
      uriSizes.forEach(function(size) {
        var sizeValue = guessSize(size);
        if (!sizeValue) {
          return;
        }

        sizes[sizeValue] = uri;
      });
    });

    return sizes;
  }


  function getPreferredSize(sizes, iconSize) {
    var targeted = iconSize ? parseInt(iconSize) : 0;
    // Sized based on current homescreen selected icons for apps
    // in a configuration of 3 icons per row. See:
    // https://github.com/mozilla-b2g/gaia/blob/master/
    // shared/elements/gaia_grid/js/grid_layout.js#L15
    if (targeted === 0) {
      targeted = window.devicePixelRatio > 1 ? 142 : 84;
    }

    var selected = -1;
    var length = sizes.length;
    for(var i = 0; i < length && selected < targeted; i++) {
      selected = sizes[i];
    }

    return selected;
  }


  // Given an icon size by string YYxYY returns the
  // width measurement, so will assume this will be
  // used by strings that identify a square size.
  function guessSize(size) {
    var xIndex = size.indexOf('x');
    if (!xIndex) {
      return null;
    }

    return size.substr(0, xIndex);
  }

  exports.IconsHelper = {
    getBestIcon: getBestIcon,
    // Make public for unit test purposes
    getSizes: getSizes
  };

})(window);