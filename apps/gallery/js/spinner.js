/* global $ */
/* exported Spinner */

'use strict';

var Spinner = {
  show: function show() {
    $('spinner').classList.remove('hidden');
  },

  hide: function hide() {
    $('spinner').classList.add('hidden');
  }
};
