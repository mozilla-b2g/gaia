/*
 * Throbber is just a loading bar at the top of the UI for
 * showing the progress of the action requested by the user.
 *
 * This is needed for low-end devices, where 'saving' or
 * *updating* a contact could take some seconds.
 */

(function(exports) {

  'use strict';

  var throbberDOM = document.getElementById('throbber');
  exports.Throbber = {
    show: function() {
      throbberDOM.classList.remove('hide');
    },
    hide: function() {
      throbberDOM.classList.add('hide');
    }
  };
}(window));
