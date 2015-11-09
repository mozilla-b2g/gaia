/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

'use strict';

(function(exports) {

  var MockBrowser = {
    sideBlock: {
      dataset: {
        sidebar: 'false'
      }
    },
    switchCursorMode() {}
  };

  exports.MockBrowser = MockBrowser;
}(window));
