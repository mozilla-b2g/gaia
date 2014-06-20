'use strict';
/* global eme */
/* global NativeInfo */


(function(exports) {

  // number of apps to load
  const SEARCH_LIMIT = 3 * 16;

  // number of apps to render
  const BATCH_LIMIT = 4;
  const BATCH_TIMEOUT = 500;

  function ViewApps(collection) {

    var grid = document.getElementById('grid');
    var elements = {
      offline: document.getElementById('offline'),
      offlineMessage: document.getElementById('offline-message')
    };

    var options = collection.categoryId ? {categoryId: collection.categoryId}
                                        : {query: collection.query};

    options.limit = SEARCH_LIMIT;

    loading();

    // refresh since pinned apps might have been updated
    eme.init()
    .then(() => NativeInfo.setup())
    .then(() => collection.refresh())
    .then(() => {
      loading(false);
      collection.renderPinned(grid);
      queueRequest();
    });

    function queueRequest() {
      if (navigator.onLine) {
        makeRequest();
      } else {
        onOffline();
      }

      addListeners();
    }

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
        .then(function success(response) {
          onResponse();

          var apps = response.response.apps || [];
          loadBatch(apps, 0);

        }, onResponse);
    }

    function loadBatch(allResults, from) {
      var to = from + BATCH_LIMIT;
      var results = allResults.slice(from, to);
      collection.renderWebResults(results, grid);

      if (from < allResults.length) {
        setTimeout(loadBatch.bind(null, allResults, to), BATCH_TIMEOUT);
      }
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
