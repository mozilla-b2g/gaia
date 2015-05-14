(function() {
  'use strict';

  if (window.wrappedJSObject.ObjectCache !== undefined) {
    // Don't redefine ObjectCache!
    return;
  }

  /**
   * @constructor
   */
  function ObjectCache() {
  }


  ObjectCache.prototype = {
    /**
     * Find the gecko object that corresponds to some node object.
     * @param {string} key Some id.
     */
    get: function(key) {
      return this._cache[key];
    },


    /**
     * Add some gecko object to the client's object cache.
     * @param {Object} obj Gecko object.
     * @param {string} opt_key Optional key to store obj on.
     * @return {string} The key that we end up storing obj on.
     */
    set: function(obj, opt_key) {
      var key = opt_key || this.getNextId();
      this._cache[key] = obj;
      return key;
    },


    /**
     * Generate a new, unique id.
     * @return {string}
     */
    getNextId: function() {
      this._nextId += 1;
      return this._nextId.toString();
    },


    /**
     * Map from id to gecko objects.
     * @type {Object<string, Object>}
     */
    _cache: {},


    /**
     * @type {number} Count of number of ids we've generated.
     */
    _nextId: 0
  };

  ObjectCache._inst = new ObjectCache();
  window.wrappedJSObject.ObjectCache = ObjectCache;
})();
