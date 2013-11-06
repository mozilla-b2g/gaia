/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* exported MockWhiteList */

'use strict';

var MockWhiteList = {
  _whiteList: [],

  has: function mwl_has(value) {
    if (this._whiteList.length === 0) {
      return true;
    }

    return (this._whiteList.indexOf(value) !== -1);
  },

  mSetup: function mwl_setup(list) {
    if (list) {
      this._whiteList = list;
    }
  },

  mTeardown: function mwl_teardown() {
    this._whiteList = [];
  }
};
