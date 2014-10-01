/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global LazyLoader */
/* exported WhiteList */

'use strict';

/**
 * MSISDN whitelist, if not empty only the messages sent from the MSISDNs
 * present in the list will be shown to the user, others will be discarded.
 */
var WhiteList = {
  /** An array holding the list of MSISDNs */
  _whiteList: [],

  /**
   * Read the whitelist.json file from disk and initialize the whitelist with
   * it. If the file is not present or empty the whitelist will be empty.
   */
  init: function wl_init() {
    return LazyLoader.getJSON('js/whitelist.json')
      .then(
        (function wl_load(list) {
          this._whiteList = list;
        }).bind(this),
        function () {
          /**
           * This reject handler is important here because in case of
           * whitelist json file missing or empty, getJSON rejects the promise.
           * If this handler is not present here, the returned promise from
           * this function will fail for the outside code
           */
        }
      );
  },

  /**
   * Checks if the element is in the whitelist.
   *
   * @return {Boolean} true if the element is in the whitelist, always return
   *         true if the whitelist is empty.
   */
  has: function wl_has(value) {
    if (this._whiteList.length === 0) {
      return true;
    }

    return (this._whiteList.indexOf(value) !== -1);
  }
};
