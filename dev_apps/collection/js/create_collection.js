'use strict';
/* global Promise */

(function(exports) {

  var
  _ = navigator.mozL10n.get,
  eme = exports.eme;

  eme.init();

  function HandleCreate(activity) {

    var
    request,
    loading = document.getElementById('loading'),
    cancel = document.getElementById('cancel');

    cancel.addEventListener('click', function() {
      // TODO request should always have an 'abort' method
      // but sometimes it doesn't. find out why!
      // "TypeError: request.abort is not a function" {file: "app://collection.gaiamobile.org/js/activities.js" line: 20}
      request.abort && request.abort();
      activity.postResult(false);
    });

    request = eme.api.Categories.list().then(
      function success(response) {
        loading.style.display = 'none';

        var data = response.response;
        var suggest = Suggestions.load(data.categories, data.locale);
        suggest.then(
          function select(selected) {
            eme.log('resolved with', selected);

            if (Array.isArray(selected)) {
              // collections from categories
              var
              collections =
                CategoryCollection.prototype.fromResponse(selected, data),
              trxs = collections.map(CollectionsDatabase.add);

              // TODO
              // store a batch of collections at once. possible?
              Promise.all(trxs).then(done, done);
            } else {
              // collection from custom query
              var collection = new QueryCollection({query: selected});
              CollectionsDatabase.add(collection).then(done, done);
            }

            function done() {
              activity.postResult(true);
            }
          },
          function cancel(reason) {
            eme.log('rejected with', reason);
            activity.postResult(false);
          });

    }, function error(reason) {
      eme.log('create-collection: error', reason);
      activity.postError(_(reason === 'network error' ?
                                 'network-error-message' : undefined));
    }).catch(function fail(ex) {
      eme.log('create-collection: failed', ex);
      activity.postError();
    });
  }

  navigator.mozSetMessageHandler('activity', function onActivity(activity) {
    if (activity.source.name === 'create-collection') {
      HandleCreate(activity);
    }
  });

  // exporting handler so we can trigger it from testpage.js
  // without mozActivities since we can't debug activities in app manager
  exports.HandleCreate = HandleCreate;

}(window));
