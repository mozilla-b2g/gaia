/* exported Pages */
'use strict';

(function(exports) {

  function Pages() {
    this.panel = document.getElementById('pages-panel');
    this.scrollable = document.querySelector('#pages-panel .scrollable');
  }

  Pages.prototype = {
  };

  exports.Pages = Pages;

})(window);
