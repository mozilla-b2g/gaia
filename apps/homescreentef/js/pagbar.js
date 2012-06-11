if (!PaginationBar) {

  const PaginationBar = (function(doc) {
    'use strict';

    var style, percentage = '%';

    return {

     /*
      * Initializes the pagination bar
      *
      * @param {String} container that holds the pagination bar
      */
      init: function(ele) {
        var scroller = typeof ele === 'object' ? ele : doc.querySelector(ele);
        style = scroller.style;
      },

     /*
      * Shows the pagination bar
      *
      * @param {String} container that holds the pagination bar
      */
      show: function() {
        style.visibility = 'visible';
      },

     /*
      * Updates the progress of the bar
      *
      * @param {int} current page (start index is zero)
      *
      * @param {int} total number of pages
      */
      update: function(current, total) {
        var div = 100 / total;
        // Here we set up the width and position
        style.width = div + percentage;
        style.marginLeft = current * div + percentage;
      }
    }

  }(document));
}
