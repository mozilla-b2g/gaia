'use strict';

/**
 * Define a MediaUtils object for helper
 * function used across Media Apps
 *
 */

var exifDateSplitRe = /[:\s]/;

var MediaUtils = {
  //Format Date
  formatDate: function(timestamp) {
     if (!timestamp || timestamp === undefined || isNaN(timestamp)) {
      return;
    }
    return new Date(timestamp).toLocaleString(navigator.languages, {
      'month': 'numeric',
      'year': 'numeric',
      'day': 'numeric'
    });
  },

  formatExifDate: function(dateString) {
    var [y, m, d] = dateString.split(exifDateSplitRe, 3);

    return new Date(y, m - 1, d).toLocaleString(navigator.languages, {
      'month': 'numeric',
      'year': 'numeric',
      'day': 'numeric'
    });
  },

  // exposure is a fraction
  formatExifExposure: function(exposureTime) {
    if (!exposureTime || exposureTime.numerator === undefined ||
        exposureTime.numerator === 0 ||
        exposureTime.denominator === undefined ||
        exposureTime.denominator === 0) {
      return null;
    }
    if (exposureTime.numerator > exposureTime.denominator) {
      return (exposureTime.numerator / exposureTime.denominator).toString();
    }
    // trivial fraction simplification.
    var num = exposureTime.numerator;
    var den = exposureTime.denominator;
    if (den % num === 0) {
      den = den / num;
      num = 1;
    }
    return num + '/' + den;
  },

  formatExifFlash: function(flashValue) {
    // uncomment and reorder these mask when you need them,
    // to make the linter happy.
    // var FLASH_RETURN_MASK = 0x6;
    // var FLASH_FUNCTION_MASK = 0x20;
    var FLASH_FIRED_MASK = 0x1;
    var FLASH_MODE_MASK = 0x18;
    var FLASH_REDEYE_MASK = 0x40;

    if(flashValue === undefined || flashValue === null) {
      return ;
    }
    if(flashValue === 0) {
      return ['flash-none'];
    }

    var values = [];

    switch (flashValue & FLASH_MODE_MASK) {
    case 0x08:
      values.push('flash-on');
      break;
    case 0x10:
      values.push('flash-off');
      break;
    case 0x18:
      values.push('flash-auto');
      break;
    }
    if (flashValue & FLASH_FIRED_MASK) {
      values.push('flash-fired');
    } else {
      values.push('flash-not-fired');
    }
    if (flashValue & FLASH_REDEYE_MASK) {
      values.push('flash-red-eye');
    }
    return values;
  },

  getLocalizedSizeTokens: function(size) {
    if (!size || size === undefined || isNaN(size)) {
      return Promise.resolve('');
    }
    var units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    var i = 0;
    while (size >= 1024 && i < (units.length - 1)) {
      size /= 1024;
      ++i;
    }
    var sizeDecimal = i < 2 ? Math.round(size) : Math.round(size * 10) / 10;

    return document.l10n.formatValue('byteUnit-' + units[i]).then(
      (unit) => { return { size: sizeDecimal, unit }; }
    );
  },

  getLocalizedSize: function(size) {
    return this.getLocalizedSizeTokens(size).then((args) => {
      return document.l10n.formatValue('fileSize', args);
    });
  },

  //Format Duration
  formatDuration: function(duration) {
    function padLeft(num, length) {
      var r = String(num);
      while (r.length < length) {
        r = '0' + r;
      }
      return r;
    }

    duration = Math.round(duration);
    var minutes = Math.floor(duration / 60);
    var seconds = duration % 60;
    if (minutes < 60) {
      return padLeft(minutes, 2) + ':' + padLeft(seconds, 2);
    }
    var hours = Math.floor(minutes / 60);
    minutes = Math.floor(minutes % 60);
    return hours + ':' + padLeft(minutes, 2) + ':' + padLeft(seconds, 2);
  },

  // Each media app has a static info overlay view, hidden by default.
  // populateMediaInfo takes a data object and fills in the field of
  // info overlay view. Format of data object is
  // {
  //   id: 'value',
  //    ...
  // }
  // where each property is the id of an element that is statically defined
  // in the index.html file.
  // If data object has properties that do not match an element,
  // then ignore them.
  populateMediaInfo: function(data) {
    for (var id in data) {
      if (data.hasOwnProperty(id)) {
        var element = document.getElementById(id);
        //fill respective value tag to display value passed in data object
        if (element) {
          if (typeof data[id] === 'string') {
            element.setAttribute('data-l10n-id', data[id]);
          } else if (data[id].hasOwnProperty('raw')) {
            element.removeAttribute('data-l10n-id');
            element.textContent = data[id].raw;
          } else {
            document.l10n.setAttributes(element,
              data[id].id, data[id].args);
          }
        }
      }
    }
  },

  // Assuming that array is sorted according to comparator, return the
  // array index at which element should be inserted to maintain sort order
  binarySearch: function(array, element, comparator, from, to) {
    if (comparator === undefined) {
      comparator = function(a, b) {
        return a - b;
      };
    }

    if (from === undefined) {
      return MediaUtils.binarySearch(array, element, comparator, 0,
                                     array.length);
    }

    if (from === to) {
      return from;
    }

    var mid = Math.floor((from + to) / 2);

    var result = comparator(element, array[mid]);
    if (result < 0) {
      return MediaUtils.binarySearch(array, element, comparator, from, mid);
    }
    else {
      return MediaUtils.binarySearch(array, element, comparator, mid + 1, to);
    }
  }
};
