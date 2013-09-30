
'use strict';

var PaginationBar = (function() {
  var style, previousTotal, scroller;

  var dir = document.documentElement.dir === 'rtl' ? -100 : 100;

  return {
    /*
     * Initializes the pagination bar
     *
     * @param {String} container that holds the pagination bar
     */
    init: function pb_init(element) {
      scroller = (typeof element == 'object') ?
          element : document.querySelector(element);
      style = scroller.style;
      scroller.addEventListener('keypress', this);
    },

    /*
     * Shows the pagination bar
     */
    show: function pb_show() {
      style.visibility = 'visible';
    },

    /*
     * Hides the pagination bar
     */
    hide: function pb_hide() {
      style.visibility = 'hidden';
    },

    /*
     * Updates the progress of the bar
     *
     * @param {int} current page (start index is zero)
     *
     * @param {int} total number of pages
     */
    update: function pb_update(current, total) {
      scroller.setAttribute('aria-valuenow', current);
      scroller.setAttribute('aria-valuemax', total - 1);
      if (total && previousTotal !== total) {
        style.width = (100 / total) + '%';
        // Force a reflow otherwise the pagination bar is not resized after
        // rebooting the device (see bug 822186)
        scroller.getBoundingClientRect();
        previousTotal = total;
      }

      style.MozTransform = 'translateX(' + current * dir + '%)';
    },

    handleEvent: function pb_handleEvent(evt) {
      if (evt.type != 'keypress' || !evt.ctrlKey)
        return;

      switch (evt.keyCode) {
        case evt.DOM_VK_RIGHT:
          GridManager.goToNextPage();
          break;
        case evt.DOM_VK_LEFT:
          GridManager.goToPreviousPage();
          break;
      }
    }
  };
}());
