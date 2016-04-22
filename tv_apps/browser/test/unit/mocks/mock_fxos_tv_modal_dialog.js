/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

(function(exports) {

  var MockFxosTvModalDialog = function (container, options) {
    this.isOpened = false;
    this.element = document.createElement('div');
  };

  MockFxosTvModalDialog.prototype = {

    constructor: MockFxosTvModalDialog,

    open() {
      this.isOpened = true;
    },

    close() {
      this.isOpened = false;
    }
  };

  exports.MockFxosTvModalDialog = MockFxosTvModalDialog;
  exports.MockFxosTvInputDialog = MockFxosTvModalDialog;
}(window));
