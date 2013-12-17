(function() {
  'use strict';

  var iconFormat = Evme.Utils.getIconsFormat();

  function SearchClient() {
    // make a Search/apps API call
    this.search = function search(options) {
      Evme.DoATAPI.search({
        'query': options.query
      }, function success(apiData) {
        var response = apiData.response;
        var query = response.query;
        var apps = response.apps;

        apps.forEach(function(app) {
          if (app.icon) {
            sendResult(query, app);
          } else {
            // icon form cache
            Evme.IconManager.get(app.id, function onIcon(cachedIcon) {
              app.icon = cachedIcon;
              sendResult(query, app);
            });
          }

          // cache the icon
          Evme.IconManager.add(app.id, app.icon, iconFormat);
        });
      });
    };

    function sendResult(query, app) {
      var result = new Evme.SearchResult({
        'title': app.name,
        'url': app.appUrl,
        'iconData': app.icon,
        'query': query
      });
      Evme.SearchHandler.onSearchResult(query, result);
    }
  }

  Evme.SearchClient = new SearchClient();
})();
