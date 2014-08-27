'use strict';
/* global CategoryCollection */
/* global CollectionIcon */
/* global CollectionsDatabase */
/* global Common */
/* global NativeInfo */
/* global Promise */
/* global QueryCollection */
/* global Suggestions */

(function(exports) {

  var eme = exports.eme;

  function HandleCreate(activity) {

    const APPS_IN_ICON = Common.APPS_IN_ICON;

    var request;
    var loading = document.getElementById('loading');
    var cancel = document.getElementById('cancel');
    var maxIconSize = activity.source.data.maxIconSize;

    CollectionIcon.init(maxIconSize);

    function getWebIcons(query) {
      return eme.api.Apps.search({query: query, limit: APPS_IN_ICON})
        .then(response =>
          response.response.apps.slice(0, APPS_IN_ICON).map(app => app.icon));
    }

    function generateIcons(collections) {
      var iconTasks = collections.map(collection => {
          Common.getBackground(collection, maxIconSize)
            .then(bgObject => {
              collection.background = bgObject;
              return collection.renderIcon();
            }, () => {
              return collection.renderIcon();
            });
      });

      return Promise.all(iconTasks).then(() => collections);
    }

    function saveAll(collections) {
      var trxs = collections.map(collection => {
        return collection.save('add');
      });
      return Promise.all(trxs).then(() => collections);
    }

    function populateNativeInfo(collections) {
      var nativeTasks = [];
      collections.forEach(collection => {
        nativeTasks.push(NativeInfo.processCollection(collection));
      });
      return Promise.all(nativeTasks).then(() => collections);
    }

    /**
     * Return from the activity to the homescreen. Create a list of
     * collection IDs and post it to the homescreen so it knows what
     * collections will be created, and positions them accordingly.
     */
    function postResultIds(collections) {
      collections = collections || [];
      // Generate an array of collection IDs.
      var ids = collections.map(c => c.id);

      activity.postResult(ids);
    }

    function createCollections(selected, data) {
      var dataReady;

      eme.log('resolved with', selected);

      // We can't cancel out of this for the time being.
      document.querySelector('menu').style.display = 'none';

      // Display spinner while we're resolving and creating the
      // collections.
      loading.style.display = 'inline';


      if (Array.isArray(selected)) {
        // collections from categories
        // we have the web app icons in the response
        dataReady = Promise.resolve(
          CategoryCollection.fromResponse(selected, data));
      } else {
        // collection from custom query
        // we make another request to get web app icons
        dataReady = getWebIcons(selected)
                      .then(webicons => {
                        var collection = new QueryCollection({
                          query: selected,
                          webicons: webicons
                        });

                        return [collection];
                      })
                      .catch(e => {
                        eme.log('noIcons', e);
                        return [new QueryCollection({query: selected})];
                      });
      }

      dataReady
        .then(generateIcons)
        // XXX: We currently need to save before we populate info.
        .then(saveAll)
        .then(collections => {
          // recovery scheme: population will fail if offline
          return populateNativeInfo(collections)
            .then(generateIcons)
            .then(saveAll)
            .catch(() => {
              eme.error('NativeInfo task failed');
              return collections;
            });
        })
        .then(postResultIds)
        .catch((ex) => {
          eme.error('caught exception', ex);
          postResultIds();
        });
    }

    CollectionsDatabase.getAllCategories()
    .then(function doRequest(installed) {
      request = eme.api.Categories.list().then(
        function success(response) {
          loading.style.display = 'none';

          var data = response.response;
          var categories = data.categories.filter(function filter(category) {
            return installed.indexOf(category.categoryId) === -1;
          });

          Suggestions.load(categories)
          .then(selected => {
            createCollections(selected, data);
          }, reason => {
            eme.log('rejected with', reason);
            activity.postResult(false);
          });

      }, function error(reason) {
        eme.log('create-collection: error', reason);

        if (reason === 'network error') {
          alert(navigator.mozL10n.get('network-error-message'));
        }

        activity.postResult(false);

      }).catch(function fail(ex) {
        eme.log('create-collection: failed', ex);
        activity.postResult(false);
      });

    }, activity.postResult.bind(null, false));

    cancel.addEventListener('click', function() {
      // TODO request should always have an 'abort' method
      // but sometimes it doesn't. find out why!
      // "TypeError: request.abort is not a function"
      // {file: "app://collection.gaiamobile.org/js/activities.js" line: 20}
      request.abort && request.abort();
      activity.postResult(false);
    });

    document.body.dataset.testReady = true;
  }

  navigator.mozSetMessageHandler('activity', function onActivity(activity) {
    if (activity.source.name === 'create-collection') {
      eme.init().then(function ready() {
        HandleCreate(activity);
      });
    }
  });

  // exporting handler so we can trigger it from testpage.js
  // without mozActivities since we can't debug activities in app manager
  exports.HandleCreate = HandleCreate;

}(window));
