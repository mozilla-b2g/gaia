/* global SelectMode, utils */

(function(exports) {
  'use strict';

  // Given a row, and the contact id, setup the value of the selection check
  function updateSingleRowSelection(row, id) {
    id = id || row.dataset.uuid;
    var check = row.querySelector('input[value="' + id + '"]');
    if (!check) {
      return;
    }

    check.checked = !!SelectMode.selectedContacts[id];
  }

  // Shows, hides the selection check depending if the row is
  // on the screen.
  function updateRowStyle(row, onscreen) {
    if (SelectMode.isInSelectMode && onscreen) {
      if (!row.dataset.selectStyleSet) {
        utils.dom.addClassToNodes(row, '.contact-checkbox',
                             'contact-checkbox-selecting');
        utils.dom.addClassToNodes(row, '.contact-text',
                             'contact-text-selecting');
        row.dataset.selectStyleSet = true;
      }
    } else if (row.dataset.selectStyleSet) {
      utils.dom.removeClassFromNodes(row, '.contact-checkbox-selecting',
                                'contact-checkbox-selecting');
      utils.dom.removeClassFromNodes(row, '.contact-text-selecting',
                                'contact-text-selecting');
      delete row.dataset.selectStyleSet;
    }
  }

  exports.ListUtils = {
    'updateRowStyle': updateRowStyle,
    'updateSingleRowSelection': updateSingleRowSelection
  };
})(window);
