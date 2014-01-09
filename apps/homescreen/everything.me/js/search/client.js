(function() {
  'use strict';

  var APPS_LIMIT = 10;

  var iconFormat = Evme.Utils.getIconsFormat();

  function SearchConfig(config) {
    var _config = {
      'exact': true,
      'feature': 'rtrn',
      'first': 0,
      'iconFormat': iconFormat,
      'limit': APPS_LIMIT,
      'maxNativeSuggestions': 0,
      'nativeSuggestions': false,
      'prevQuery': '',
      'query': '',
      'spellcheck': false,
      'suggest': false
    };

    for (var key in config) {
      if (config.hasOwnProperty(key)) {
        _config[key] = config[key];
      }
    }

    return _config;
  }

  function SuggestConfig(config) {
    var _config = {
      'query': '',
      'limit': 10
    };

    for (var key in config) {
      if (config.hasOwnProperty(key)) {
        _config[key] = config[key];
      }
    }

    return _config;
  }

  function EvmeClient() {
    this.prevQuery = '';

    // paging index
    this.page = 0;
  }

  EvmeClient.prototype = {

    getApps: function getApps(options) {
      // reset paging
      this.page = 0;

      return this.search(options);
    },

    getMoreApps: function getMoreApps(options) {
      // increment paging
      this.first = options.first = this.first + APPS_LIMIT;

      return this.search(options);
    },


    // Search/apps
    search: function search(options) {
      var query = options.query;

      var config = new SearchConfig({
        'query': query,
        'prevQuery': this.prevQuery
      });

      this.prevQuery = query;

      var searchPromise = new window.Promise(function done(resolve, reject) {
        Evme.DoATAPI.search(config, function success(apiData) {
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
                  getMissingIcons.bind(this)();
                }
              },
              function reject(result) {
                resultsMissing.push(result);
                if (--pending === 0) {
                  getMissingIcons.bind(this)();
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

            this.requestIcons(ids).then(
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

    },

    // Search/suggestions
    getSuggestions: function getSuggestions(options) {
      var config = new SuggestConfig(options);
      var query = options.query;

      var suggestPromise = new window.Promise(function done(resolve, reject) {
        Evme.DoATAPI.suggestions(config, function success(data) {
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
    },

    // App/icons
    requestIcons: function requestIcons(ids) {
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
    }


  }; // prototype

  Evme.Client = EvmeClient;

})();
