(function(exports) {
  'use strict';

  var proto;

  /**
   * This is the master debug mode controller.
   * We can turn-on/off debug globally through it.
   *
   * @class
   * @constructor
   */
  function MasterDebug(dbg) {
    /**
     * the master debug flag.
     * If true or false, would override all local debug mode flags.
     * If undefined, would leave contorl to all local debug mode flags.
     * @type {boolean|undefined}
     */
    this._flag_dbg = (dbg === undefined) ? undefined : !!dbg;
  }

  proto = MasterDebug.prototype;

  /**
   * @return {boolean|undefined}
   */
  proto.isDBG = function () {
    return this._flag_dbg;
  };

  /**
   * New one instance of {@link MasterDebug.LocalDebug}
   *
   * @parame dbg see {@link MasterDebug.LocalDebug}
   */
  proto.newLocDBG = function (dbg) {
    return new MasterDebug.LocalDebug(dbg, this);
  };

  /**
   * This is the local debug mode controller.
   * @class
   * @constructor
   */
  MasterDebug.LocalDebug = function (dbg, masterDBG) {

    /**
     * the local debig mode flag
     * @type {boolean}
     */
    this._flag_dbg = !!dbg;

    /**
     * The master debug controller for this local debug controllor
     * @type {MasterDebug}
     */
    this._masterDBG = masterDBG;
  };

  proto = MasterDebug._LocalDebug.prototype;

  /**
   * @return {boolean}
   */
  proto.isDBG = function () {
    var mDBG = this._masterDBG.isDBG();
    return (mDBG === true || mDBG === false) ? mDBG : this._flag_dbg;
  };

  proto.log = function (var_args) {
    if (this.isDBG()) {
      return window.log.apply(window, arguments);
    }
  };

  proto.warn = function (var_args) {
    if (this.isDBG()) {
      return window.warn.apply(window, arguments);
    }
  };

  proto.error = function (var_args) {
    if (this.isDBG()) {
      return window.error.apply(window, arguments);
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

  //exports.masterDBG = new MasterDebug();
  window.MasterDebug = MasterDebug;

})(window);