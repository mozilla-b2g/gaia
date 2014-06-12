'use strict';
/* global eme */

(function(exports) {

  function ViewApps(collection) {

    var grid = document.getElementById('grid');
    var elements = {
      offline: document.getElementById('offline'),
      offlineMessage: document.getElementById('offline-message')
    };
    var requestParams = {
      query: collection.query,
      categoryId: collection.categoryId,
      iconFormat: getIconFormat()
    };

    // render pinned apps first
    collection.render(grid);

    if (navigator.onLine) {
      makeRequest();
    } else {
      onOffline();
    }

    addListeners();

    function onOffline() {
      loading(false);

      var msg = navigator.mozL10n.get('offline-webresults', {
        collectionName: collection.name
      });
      elements.offlineMessage.innerHTML = msg;
      elements.offline.classList.add('show');
    }

    function makeRequest() {
      loading();

      eme.api.Apps.search(requestParams)
        .then(function success(searchResponse) {
          var results = [];

          searchResponse.response.apps.forEach(function each(webapp) {
            results.push({
              id: webapp.id, // e.me app id (int)
              name: webapp.name,
              url: webapp.appUrl,
              icon: webapp.icon,
              clipIcon: true
            });
          });

          onResponse();

          grid.clientLeft; // force layout or else grid isn't displayed
          collection.webResults = results;
          collection.render(grid);

        }, onResponse);
    }

    function loading(should) {
      document.body.dataset.loading = should !== false;
      elements.offline.classList.remove('show');
    }

    function onResponse() {
      loading(false);
      removeListeners();
    }

    function addListeners() {
      window.addEventListener('online', makeRequest);
      window.addEventListener('offline', onOffline);
    }

    function removeListeners() {
      window.removeEventListener('online', makeRequest);
      window.removeEventListener('offline', onOffline);
    }

    function getIconFormat() {
      return 20;
    }
  }

  exports.ViewApps = ViewApps;

}(window));
