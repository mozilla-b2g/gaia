(function(exports) {
  'use strict';

  /**
   * The PipedPromise is a 'trait' or 'mixin' for other module to mix it in.
   * Under certain situation, when we implement method that returns a Promise
   * to callee, we don't want the method to be reentrant and instantiate another
   * promise. We would like the request to be 'piped' in the same promise.
   * This is the case where PipedPromise comes to our resque.
   *
   * @example
   * SomeModule.prototype = {
   *   ...
   *   willReturnPromise: function willReturnPromise() {
   *     return this._getPipedPromise('willReturnPromise',
   *       function(resolve, reject) {
   *         ...
   *       });
   *   },
   *   ...
   * };
   * addMixin(SomeModule, new PipedPromise());
   *
   */
  var PipedPromise = function() {
    this._piped_promises = {};

    this._removePipedPromise = function pp_removePipedPromise(key) {
      this._piped_promises[key] = undefined;
    };

    /**
     * Get Promise object of specific key. It will generate a new Promise
     * if Promise of the key is not existed yet.
     *
     * @param {String} key - key of the Promise
     * @param {Function} executor - the executor once the Promise resolved
     *                              or rejected
     * @returns {Promise} - A Promise
     *
     */
    this._getPipedPromise = function pp_getOrCreatePromise(key, executor) {
      var that = this;
      var promise = this._piped_promises[key];
      if (!promise) {
        promise = new Promise(executor);
        Promise.all([promise]).then(function onFulfill() {
          that._removePipedPromise(key);
        }, function onReject() {
          that._removePipedPromise(key);
        });
        that._piped_promises[key] = promise;
      }
      return promise;
    };
  };

  exports.PipedPromise = PipedPromise;

}(window));
