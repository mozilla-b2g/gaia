'use strict';
/* global CategoryCollection */
/* global CollectionsDatabase */
/* global CollectionIcon */
/* global Promise */
/* global QueryCollection */
/* global Suggestions */

(function(exports) {

  var _ = navigator.mozL10n.get;
  var eme = exports.eme;

  function getBackground(collection) {
    var src;
    var options = collection.categoryId ? {categoryId: collection.categoryId}
                                        : {query: collection.query};

    return eme.api.Search.bgimage(options).then(function success(response) {
      var image = response.response.image;
      if (image) {
        src = image.data;
        if (/image\//.test(image.MIMEType)) {  // base64 image data
          src = 'data:' + image.MIMEType + ';base64,' + image.data;
        }
      }

      return {
        src: src,
        source: response.response.source,
        checksum: response.checksum || null
      };
    });
  }

  function HandleCreate(activity) {

    var request;
    var loading = document.getElementById('loading');
    var cancel = document.getElementById('cancel');
    var maxIconSize = activity.source.data.maxIconSize;

    CollectionIcon.init(maxIconSize);
    var numAppIcons = CollectionIcon.numAppIcons;

    cancel.addEventListener('click', function() {
      // TODO request should always have an 'abort' method
      // but sometimes it doesn't. find out why!
      // "TypeError: request.abort is not a function"
      // {file: "app://collection.gaiamobile.org/js/activities.js" line: 20}
      request.abort && request.abort();
      activity.postResult(false);
    });

    // filter installed categories
    CollectionsDatabase.getAllCategories().then(function doRequest(installed) {
      // TODO send existingExperienceIds instead of filtering on client side
      // (when supported in Partners API)
      request = eme.api.Categories.list().then(
        function success(response) {
          loading.style.display = 'none';

          var data = response.response;
          var categories = data.categories.filter(function filter(category) {
            return installed.indexOf(category.categoryId) === -1;
          });

          Suggestions.load(categories).then(
            function select(selected) {
              eme.log('resolved with', selected);
              var dataReady;

              if (Array.isArray(selected)) {
                // collections from categories
                // we have the web app icons in the response
                dataReady = Promise.resolve(
                  CategoryCollection.fromResponse(selected, data));
              } else {
                // collection from custom query
                // we make another request to get web app icons
                dataReady = new Promise(function getIcons(resolve) {
                  eme.api.Apps.search({query: selected, limit: numAppIcons})
                    .then(function success(response) {
                      var webicons =
                        response.response.apps.slice(0,numAppIcons).map(
                          function each(app) {
                            return app.icon;
                        });

                      var collection = new QueryCollection({
                        query: selected,
                        webicons: webicons
                      });

                      resolve([collection]);
                    }, noIcons)
                    .catch(noIcons);

                    function noIcons(e) {
                      eme.log('noIcons', e);
                      resolve([new QueryCollection({query: selected})]);
                    }
                });
              }

              // congrats! you have the webapps icons!
              // but you are still not done,
              // it's time to get the background images
              dataReady.then(function success(collections) {
                var iconsReady = [];
                collections.forEach(function doIcon(collection) {
                  var promise =
                    getBackground(collection)
                    .then(function setBackground(bgObject) {
                      collection.background = bgObject;
                      return collection.renderIcon();
                    }, function noBackground() {
                      return collection.renderIcon();
                    });

                  iconsReady.push(promise);
                });

                Promise.all(iconsReady).then(function then() {
                  // TOOD
                  // better use colleciton.save instead but it calles db.put
                  // not sure if `put` works for new objects
                  var trxs = collections.map(CollectionsDatabase.add);
                  Promise.all(trxs).then(done, done);
                }).catch(function _catch(ex) {
                  eme.log('caught exception', ex);
                  activity.postResult(false);
                });
              });

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

    }, activity.postError);
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
