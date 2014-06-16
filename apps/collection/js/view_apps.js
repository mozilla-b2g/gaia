'use strict';
/* global eme */

(function(exports) {

  function ViewApps(collection) {

    var grid = document.getElementById('grid');
    var elements = {
      offline: document.getElementById('offline'),
      offlineMessage: document.getElementById('offline-message')
    };

    var options = collection.categoryId ? {categoryId: collection.categoryId}
                                        : {query: collection.query};


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

      eme.api.Apps.search(options)
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

          // XXX force layout or else grid isn't displayed
          grid.clientLeft;
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
  }

  exports.ViewApps = ViewApps;

}(window));
