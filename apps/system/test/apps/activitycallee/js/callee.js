'use strict';

navigator.mozSetMessageHandler('activity', function(activity) {
  window.alert('hi');
  activity.postResult('hi');
});
