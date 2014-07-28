'use strict';

/* global ConfirmDialog */
/* global LazyLoader */

var utils = window.utils || {};

if (!utils.confirmDialog) {
  var doc = (parent.location === window.location) ?
      document : parent.document;
  utils.confirmDialog = function loadConfirmDialog() {
    var args = Array.slice(arguments);
    LazyLoader.load(
    [
      doc.getElementById('confirmation-message'),
      '/shared/js/confirm.js'
    ], function viewLoaded() {
      ConfirmDialog.show.apply(ConfirmDialog, args);
    });
  };
}
