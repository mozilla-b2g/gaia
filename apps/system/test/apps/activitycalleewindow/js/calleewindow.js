'use strict';

navigator.mozSetMessageHandler('activity', function(activity) {
  alert('successfully launch app through window activity');
  activity.postResult('successMsg');
});
