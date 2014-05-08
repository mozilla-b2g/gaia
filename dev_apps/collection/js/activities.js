'use strict';

(function() {

  var Activities = {
    'create-collection': function(activity) {
      alert('Creating collection!');

      // Build and save a fake collection object
      var collection = {
        id: Date.now() + '',
        name: 'Folder ' + (Date.now() + '').substr(10)
      };

      CollectionsDatabase.add(collection).then(done, done);

      function done() {
        activity.postResult(true);
      }
    },

    'update-collection': function(activity) {
      alert('Updating collection!');
    },

    'remove-collection': function(activity) {
      alert('Removing collection!');
    },

    'view-collection': function(activity) {
      document.getElementById('close').addEventListener('click', function() {
        activity.postResult(true);
      });
    },
  };

  navigator.mozSetMessageHandler('activity', function onActivity(activity) {
    var name = activity.source.name;
    Activities[name](activity);
  });

}());
