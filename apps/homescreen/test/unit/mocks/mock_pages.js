/* exported Pages */
'use strict';

(function(exports) {

  function Pages() {
    this.panel = document.getElementById('pages-panel');
    this.scrollable = document.querySelector('#pages-panel .scrollable');
    this.editMode = false;
    this.dialogs = [];
  }

  Pages.prototype = {
    exitEditMode: function() {}
  };

  exports.Pages = Pages;

})(window);
