/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* exported MockParsedProvisioningDoc */

'use strict';

var MockParsedProvisioningDoc = {
  _apns: [],

  mSetup: function mwl_setup(apns) {
    if (apns) {
      this._apns = apns;
    }
  },

  from: function mppd_from(provisioningDoc) {
    var apns = this._apns;

    return {
      getApns: function mppd_getApns() {
        return apns;
      }
    };
  },

  mTeardown: function mwl_teardown() {
    this._apns = [];
  }
};
