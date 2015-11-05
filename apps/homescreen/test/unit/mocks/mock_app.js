/* exported App */
'use strict';

(function(exports) {

  function App() {
    this.panel = document.getElementById('apps-panel');
    this.scrollable = document.querySelector('#apps-panel .scrollable');
    this.editMode = false;
    this.dialogs = [];
  }

  App.prototype = {
    exitEditMode: function() {}
  };

  exports.App = App;

})(window);
