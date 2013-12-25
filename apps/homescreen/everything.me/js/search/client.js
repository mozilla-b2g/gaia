(function() {
  'use strict';

  var iconFormat = Evme.Utils.getIconsFormat();

  // number of results to return
  var NUM_RESULTS = 16;

  // number of suggestions to return
  var NUM_SUGGESTIONS = 4;

  function SearchClient() {

    // Search/apps
    this.search = function search(options) {

      var searchPromise = new window.Promise(function done(resolve, reject) {
        Evme.DoATAPI.search({
          'query': options.query,
          'limit': NUM_RESULTS
        }, function success(apiData) {
          var response = apiData.response;
          var query = response.query;
          var apps = response.apps;
          var pending = apps.length;

          // results ready with icon
          var resultsReady = [];

          // results without icon (not ready)
          var resultsMissing = [];

          apps.forEach(function(app) {
            var result = new Evme.SearchResult({
              'title': app.name,
              'url': app.appUrl,
              'iconData': app.icon,
              'appId': app.id
            });

            if (app.icon) {
              // cache the icon
              Evme.IconManager.add(app.id, app.icon, iconFormat);
            }

            result.getIcon().then(
              function resolve(result) {
                addResult(result);
                if (--pending === 0) {
                  getMissingIcons();
                }
              },
              function reject(result) {
                resultsMissing.push(result);
                if (--pending === 0) {
                  getMissingIcons();
                }
              });
          });

          function addResult(result) {
            resultsReady.push(result);

            if (resultsReady.length === apps.length) {
              resolve(resultsReady);
            }
          }

          function getMissingIcons() {
            var ids = Evme.Utils.pluck(resultsMissing, 'appId');

            if (!ids.length) {
              return;
            }

            Evme.SearchClient.requestIcons(ids).then(
              function resolve(icons) {
                resultsMissing.forEach(function addIcon(resultMissing) {
                  resultMissing.setIconData(icons[resultMissing.appId]);
                  addResult(resultMissing);
                });
              },
              function reject(reason) {
                resultsMissing.forEach(function each(resultMissing) {
                  resultMissing.setDefaultIcon();
                  addResult(resultMissing);
                });
              });
          }
        });
      });

      return searchPromise;

    };

    // Search/suggestions
    this.suggestions = function suggestions(options) {
      var query = options.query;

      var suggestPromise = new window.Promise(function done(resolve, reject) {
        Evme.DoATAPI.suggestions({
          'query': query,
          'limit': NUM_SUGGESTIONS
        }, function success(data) {
          var items = data.response || [];
          if (items.length) {
            var suggestions = items.map(function each(item) {
              return new Evme.SearchSuggestion({
                'query': query,
                'annotated': item
              });
            });
            resolve(suggestions);
          }
        });
      });

      return suggestPromise;
    };

    // App/icons
    this.requestIcons = function requestIcons(ids) {
      var iconsPromise = new window.Promise(function done(resolve, reject) {
        Evme.DoATAPI.icons({
          'ids': ids.join(','),
          'iconFormat': iconFormat
        }, function onSuccess(data) {
          var icons = data.response || [];
          if (icons.length) {
            resolve(icons);
            Evme.IconManager.addIcons(icons, iconFormat);
          } else {
            reject('missingIcons failed');
          }
        });
      });

      return iconsPromise;
    };


  } // SearchClient

  Evme.SearchClient = new SearchClient();

})();
