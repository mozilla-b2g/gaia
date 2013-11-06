/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

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
    var xhr = new XMLHttpRequest();
    xhr.overrideMimeType('application/json');
    xhr.open('GET', 'js/whitelist.json', true);
    xhr.send(null);

    xhr.onreadystatechange = (function wl_load(evt) {
      if (xhr.readyState !== 4) {
        return;
      }

      if (xhr.status === 0 || xhr.status === 200) {
        var list = JSON.parse(xhr.responseText);
        var whiteList = [];

        list.forEach(function wl_addTo(item) {
          whiteList.push(item);
        });

        this._whiteList = whiteList;
      }
    }).bind(this);
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

WhiteList.init();
