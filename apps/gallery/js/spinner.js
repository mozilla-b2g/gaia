/* global $ */
/* exported Spinner */

'use strict';

var Spinner = {
  show: function show() {
    var spinner = $('spinner');
    spinner.removeAttribute('value'); // Spin: workaround bug 962594
    spinner.classList.remove('hidden');
  },

  hide: function hide() {
    var spinner = $('spinner');
    spinner.value = 0;                // Stop spinning: workaround bug 962594
    spinner.classList.add('hidden');
  }
};
