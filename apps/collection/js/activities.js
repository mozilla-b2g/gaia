'use strict';

/* global CollectionEditor */

(function(exports) {

  var Activities = {
    'update-collection': function(activity) {
      CollectionEditor.init({
        data: activity.source.data,
        onsaved: function() {
          activity.postResult('updated');
        },
        oncancelled: function() {
          activity.postError('cancelled');
        }
      });
    }
  };

  navigator.mozSetMessageHandler('activity', function onActivity(activity) {
    var name = activity.source.name;
    Activities[name](activity);
  });

  exports.Activities = Activities;

}(window));
