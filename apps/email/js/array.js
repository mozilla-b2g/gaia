/*global define */
define(function(require) {
  var array = {
    /**
     * @param {Array} array some array.
     * @param {Function} callback function to test for each element.
     * @param {Object} thisObject object to use as this for callback.
     */
    indexOfGeneric: function(array, callback, thisObject) {
      var result = -1;
      array.some(function(value, index) {
        if (callback.call(thisObject, value)) {
          result = index;
          return true;
        }
      });

      return result;
    }
  };

  return array;
});
