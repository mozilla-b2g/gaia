
'use strict';

const PaginationBar = (function() {
  var style, previousTotal;

  return {
    /*
     * Initializes the pagination bar
     *
     * @param {String} container that holds the pagination bar
     */
    init: function pb_init(element) {
      var scroller = (typeof element == 'object') ?
          element : document.querySelector(element);
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

      if (total && previousTotal !== total) {
        style.width = (100 / total) + '%';
        previousTotal = total;
      }

      if (document.documentElement.dir == 'rtl') {
        style.MozTransform = 'translateX(-' + current * 100 + '%)';
      } else {
        style.MozTransform = 'translateX(' + current * 100 + '%)';
      }
    }
  };
}());
