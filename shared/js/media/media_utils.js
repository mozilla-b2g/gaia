'use strict';

/**
 * Define a MediaUtils object for helper
 * function used across Media Apps
 *
 */

var MediaUtils = {
   _: navigator.mozL10n.get,

  //Format Date
  formatDate: function(timestamp) {
     if (!timestamp || timestamp === undefined || isNaN(timestamp)) {
      return;
    }
    var dtf = new navigator.mozL10n.DateTimeFormat();
    return dtf.localeFormat(new Date(timestamp), this._('dateTimeFormat_%x'));
  },

  // Format Size
  formatSize: function(size) {
    if (!size || size === undefined || isNaN(size)) {
      return;
    }
    var units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    var i = 0;
    while (size >= 1024 && i < units.length) {
      size /= 1024;
      ++i;
    }
    var sizeString = size.toFixed((size < 1024 * 1024) ? 0 : 1);
    var sizeDecimal = parseFloat(sizeString);

    return sizeDecimal + ' ' + this._('byteUnit-' + units[i]);
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

    var minutes = Math.floor(duration / 60);
    var seconds = Math.floor(duration % 60);
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
        if (element)
          element.textContent = data[id];
      }
    }
  },

  // Assuming that array is sorted according to comparator, return the
  // array index at which element should be inserted to maintain sort order
  binarySearch: function(array, element, comparator, from, to) {
    if (comparator === undefined)
      comparator = function(a, b) {
        return a - b;
      };

    if (from === undefined)
      return MediaUtils.binarySearch(array, element, comparator, 0,
                                     array.length);

    if (from === to)
      return from;

    var mid = Math.floor((from + to) / 2);

    var result = comparator(element, array[mid]);
    if (result < 0)
      return MediaUtils.binarySearch(array, element, comparator, from, mid);
    else
      return MediaUtils.binarySearch(array, element, comparator, mid + 1, to);
  }
};
