'use strict';
/* exported Dedupe */

var Dedupe = {

  /**
   * Current working set of data.
   * A set of objects with the following keys:
   * - objects: A list of objects to dedupe.
   * - key: Which key of the object should be unique.
   */
  data: [],

  /**
   * Result the current dataset.
   */
  reset: function() {
    this.data = [];
  },

  /**
   * Adds a set of data to the current working set.
   */
  add: function(dataset) {
    this.data.push(dataset);
  },

  /**
   * Reduces the data by removing any objects with keys that
   * match the last provided result set.
   */
  reduce: function() {
    var numSets = this.data.length;

    if (numSets <= 1) {
      return this.data[0].objects;
    }

    var prevSet = this.data[numSets - 2];
    var currSet = this.data[numSets - 1];

    // Build a map of objects based on the key for efficient lookups.
    var prevObjectMap = {};
    prevSet.objects.forEach(function _eachObject(val) {
      prevObjectMap[val[prevSet.key]] = true;
    });

    return currSet.objects.filter(function _filter(val, idx) {
      return prevObjectMap[val[currSet.key]] !== true;
    });
  }
};
