/*
 *  Module: Pagination bar
 *
 *  Product: Open Web Device
 *
 *  Copyright(c) 2012 Telef—nica I+D S.A.U.
 *
 *  LICENSE: Apache 2.0
 *
 *  @author Cristian Rodriguez
 *
 */
var owd = window.owd || {};

if (!owd.PaginationBar) {

  (function(doc) {
    'use strict';

    var style, percentage = '%';

    owd.PaginationBar = {

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

    /* One more page when the carousel is displayed */
    if (owdConfig.homescreen === 'TEF') {
      owd.PaginationBar.oldUpdate = owd.PaginationBar.update;

      owd.PaginationBar.update = function(current, total) {
        owd.PaginationBar.oldUpdate(current + 1, total + 1);
      }
    }

  }(document));
}
