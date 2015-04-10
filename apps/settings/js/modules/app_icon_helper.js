define(function(require) {
  'use strict';

  //
  // Return the url of the app icon that is the best match for the
  // specified target size. This will return the URL of the smallest
  // icon that is at least as big as the target. Or, if no such icon
  // exists, it will return the largest icon.
  //
  // Note that if you should specify your target size in device pixels
  // by muliplying the desired CSS size by window.devicePixelRatio
  //
  function getIconURL(app, targetSize) {
    var manifest = app.manifest || app.updateManifest;
    var icons = manifest && manifest.icons;

    if (!icons || !Object.keys(icons).length) {
      return '../style/images/default.png';
    }

    var bestSize = Infinity;
    var maxSize = 0;

    for (var size in icons) {
      size = parseInt(size, 10);
      if (size >= targetSize && size < bestSize) {
        bestSize = size;
      }
      if (size > maxSize) {
        maxSize = size;
      }
    }
    // If there is an icon matching the preferred size, we return the result,
    // if there isn't, we will return the maximum available size.
    if (bestSize === Infinity) {
      bestSize = maxSize;
    }

    var url = icons[bestSize];

    if (url) {
      return new URL(url, app.origin).href;
    } else {
      return '../style/images/default.png';
    }
  }

  return {
    getIconURL: getIconURL
  };
});
