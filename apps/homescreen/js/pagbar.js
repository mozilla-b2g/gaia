
'use strict';

const PaginationBar = (function() {
  var style, percentage = '%';

  return {
   /*
    * Initializes the pagination bar
    *
    * @param {String} container that holds the pagination bar
    */
    init: function pb_init(element) {
      var scroller =
        typeof element == 'object' ? element : document.querySelector(element);
      style = scroller.style;
    },

   /*
    * Shows the pagination bar
    *
    * @param {String} container that holds the pagination bar
    */
    show: function pb_show() {
      style.visibility = 'visible';
    },

   /*
    * Updates the progress of the bar
    *
    * @param {int} current page (start index is zero)
    *
    * @param {int} total number of pages
    */
    update: function pb_update(current, total) {
      var div = 100 / total;
      style.width = div + percentage;
      style.marginLeft = current * div + percentage;
    }
  };
}());

