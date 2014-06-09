'use strict';

/* global MozActivity */

document.getElementById('back').addEventListener('click', function() {
  document.addEventListener('visibilitychange', function() {
    // Close ourself after the activity transition is completed.
    window.close();
  });

  var activity = new MozActivity({
    name: 'configure',
    data: {
      target: 'device'
    }
  });

  activity.onerror = function() {};
});
