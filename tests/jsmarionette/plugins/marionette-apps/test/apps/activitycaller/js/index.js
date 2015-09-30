/* global MozActivity */
(function(window) {
  'use strict';

  window.addEventListener('DOMContentLoaded', function() {
    var openActivityButton = document.getElementById('open-activity');

    openActivityButton.addEventListener('click', function() {
      var activity = new MozActivity({
        name: 'pick',
        data: {
          type: 'x-type/*'
        }
      });

      activity.onerror = function() {
        console.warn('Pick activity error %s', activity.error.name);
      };
    });
  });
})(window);
