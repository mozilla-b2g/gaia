/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/*
 * FxaModuleManager is in charge of communication with the core of
 * FxAccounts, sending the info retrieved during the process if the
 * process was succeeded.
 */

var FxaModuleManager = {
  paramsRetrieved: null,
  init: function fxamm_init() {
    var flow = window.location.hash.replace('#', '');
    FxaModuleUI.init(flow);
  },
  setParam: function fxamm_setParam(key, value) {
    if (!this.paramsRetrieved) {
      this.paramsRetrieved = {};
    }
    this.paramsRetrieved[key] = value;
  },
  done: function fxamm_done() {
    window.parent.FxAccountsUI.done(this.paramsRetrieved);
  },
  close: function fxamm_close(error) {
    if (!this.paramsRetrieved) {
      window.parent.FxAccountsUI.error(error);
    } else {
      window.parent.FxAccountsUI.done(this.paramsRetrieved);
    }
  }
};

window.addEventListener('load', function managerLoaded() {
  window.removeEventListener('load', managerLoaded);
  FxaModuleManager.init();
});
