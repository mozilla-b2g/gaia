var FilterData = {
  /**
   * Checks if needle is in haystack
   *
   * @param {Array} haystack array to test for needle.
   * @param {Object} needle object which may or may not be in haystack.
   * @return {Boolean} true if item is in the array false otherwise.
   */
  validateArray: function(haystack, needle) {
    return haystack.indexOf(needle) !== -1;
  },

  validateByType: function(filterValue, metaValue) {
    if (Array.isArray(filterValue)) {
      return this.validateArray(filterValue, metaValue);
    }

    // default filtering logic is strict equality.
    return filterValue === metaValue;
  },

  /**
    * Checks the equality of two objects, with a special case for object
    * properties that are arrays.
    *
    *     // true
    *     validate({ host: ['a', 'b'] }, { host: 'a' });
    *
    *     // false
    *     validate({ host: ['a', 'b'] }, { host: 'c' });
    *
    *     // true
    *     validate({ host: 'c' }, { host: 'c' });
    *
    *     // false
    *     validate({ host: 'c', wifi: true }, { host: 'c' });
    *
    *     // true
    *     validate(
    *       { host: 'c', wifi: true },
    *       { host: 'c', wifi: true }
    *     );
    *
    *
    * @param {Object} filter Object to be compared for equality ot metadata.
    * @param {Object} metadata Object in which all property key value pairs,
    *  other than arrays musy match those of filter. In case of an array
    *  property in filter, metadata must have an equivalent key whose value is
    *  present in the array.
    * @return {Boolean} true when data matches.
    */
  validate: function(filter, metadata) {
    for (var prop in filter) {
      // metadata must contain all properties
      if (!(prop in metadata)) return false;

      var filterValue = filter[prop];
      var metaValue = metadata[prop];

      // if a single property is invalid return false.
      if (!this.validateByType(filterValue, metaValue)) {
        return false;
      }
    }

    return true;
  }
};

module.exports.FilterData = FilterData;
