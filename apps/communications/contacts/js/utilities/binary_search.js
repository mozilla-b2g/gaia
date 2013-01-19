'use strict';

var utils = this.utils || {};

/**
 * This function performs a binary search over an already sorted array
 * target is the target item to search for
 * array is the sorted array
 * options is an optional object which may contain
 * the start and end position (from, to)
 * an optional arrayField which indicates the object property that contains the
 * comparable item and transform and compare functions
 *
 * Returns an array with the positions on which the target item was found
 *
 */
utils.binarySearch = function(target, array, options) {
  var arrayField = options.arrayField,
      transformFunction = options.transformFunction,
      compareFunction = options.compareFunction;

  // Obtains the comparable item by transforming if necessary
  function getItem(array, index) {
    var item = array[index];
    if (arrayField) {
      item = item[arrayField];
      if (typeof transformFunction === 'function') {
        item = transformFunction(item);
      }
    }
    return item;
  }

  // Compares the target with an array item
  function compare(target, item) {
    var out;
    if (typeof compareFunction === 'function') {
      out = compareFunction(target, item);
    }
    else {
      if (typeof target === 'string') {
         out = target.localeCompare(item);
      }
      else {
        out = target.toString().localeCompare(item);
      }
    }

    return out;
  }

  var from = options.from;
  if (typeof from === 'undefined') {
    from = 0;
  }
  var to = options.to;
  if (typeof to === 'undefined') {
    to = array.length - 1;
  }

  if (to < from) {
    // Not found
    return [];
  }

  var middleIndex = Math.floor((to - from) / 2);
  var item = getItem(array, from + middleIndex);

  var compareResult = compare(target, item);

  if (compareResult === 0) {
    // Once a result is found let's iterate in both directions to get the rest
    // Just in case there are more than one result
    var results = [from + middleIndex];

    var next = from + middleIndex + 1;
    var finish = false;
    while (next <= (array.length - 1) && !finish) {
      var item = getItem(array, next);

      if (compare(target, item) === 0) {
        results.push(next);
      }
      else {
        finish = true;
      }
      next++;
    }

    finish = false;
    next = from + middleIndex - 1;

    while (next >= 0 && !finish) {
      var item = getItem(array, next);

      if (compare(target, item) === 0) {
        results.push(next);
      }
      else {
        finish = true;
      }
      next--;
    }
    return results;
  }
  else if (compareResult < 0) {
    return utils.binarySearch(target, array, {
      from: from,
      to: to - middleIndex - 1,
      arrayField: arrayField,
      transformFunction: transformFunction,
      compareFunction: compareFunction
    });
  }
  else {
    return utils.binarySearch(target, array, {
      from: from + middleIndex + 1,
      to: to,
      arrayField: arrayField,
      transformFunction: transformFunction,
      compareFunction: compareFunction
    });
  }
};
