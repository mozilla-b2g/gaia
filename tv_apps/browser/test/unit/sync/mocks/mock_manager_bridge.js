/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

'use strict';

(function(exports) {

  var MockSyncManagerBridge = {
    _syncInfo: null,

    addListener() {},

    removeListener() {},

    enable() {
      return Promise.resolve();
    },

    disable() {
      return Promise.resolve();
    },

    sync() {
      return Promise.resolve();
    },

    getInfo() {
      return Promise.resolve(this._syncInfo);
    }
  };

  exports.MockSyncManagerBridge = MockSyncManagerBridge;
}(window));
