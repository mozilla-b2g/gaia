'use strict';
/* global Promise */

(function(exports) {

  var Activities = {
    'update-collection': function(activity) {
      alert('Updating collection!');
    }
  };

  navigator.mozSetMessageHandler('activity', function onActivity(activity) {
    var name = activity.source.name;
    Activities[name](activity);
  });

  exports.Activities = Activities;

}(window));
