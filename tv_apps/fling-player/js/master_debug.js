(function(exports) {
  'use strict';

  var proto;

  /**
   * This is the local debug mode controller.
   * @class
   * @constructor
   */
  function MasterDebug(dbg) {

    /**
     * the local debug mode flag
     * @type {boolean}
     */
    this._flag_dbg = false;

    this.setDBG(dbg);
  }

  proto = MasterDebug.prototype;

  proto.isDBG = function () {
    return this._flag_dbg;
  };

  proto.setDBG = function (dbg) {
    this._flag_dbg = !!dbg;
  };

  proto.log = function (var_args) {
    if (this.isDBG()) {
      return console.log.apply(console, Array.prototype.slice.call(arguments));
    }
  };

  proto.warn = function (var_args) {
    if (this.isDBG()) {
      return console.warn.apply(console, Array.prototype.slice.call(arguments));
    }
  };

  proto.error = function (var_args) {
    if (this.isDBG()) {
      return console.error.apply(
        console,
        Array.prototype.slice.call(arguments)
      );
    }
  };

  /**
   * Run provided testing behavior in the debug mode
   * @param {function} behavior a callback executing testing behavior
   */
  proto.test = function (behavior) {
    if (this.isDBG() && typeof behavior === 'function') {
      behavior();
    }
  };

  window.mDBG = new MasterDebug(false);

})(window);
