/* exported Apps */
'use strict';

(function(exports) {

  function Apps() {
    this.panel = document.getElementById('apps-panel');
    this.scrollable = document.querySelector('#apps-panel .scrollable');
    this.editMode = false;
    this.dialogs = [];
    this.openGroup = null;
  }

  Apps.prototype = {
    exitEditMode: function() {},
    closeOpenGroup: function() {}
  };

  exports.Apps = Apps;

})(window);
