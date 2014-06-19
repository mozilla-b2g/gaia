'use strict';
/* global eme */
/* global NativeInfo */


(function(exports) {

  function ViewApps(collection) {

    var grid = document.getElementById('grid');
    var elements = {
      offline: document.getElementById('offline'),
      offlineMessage: document.getElementById('offline-message')
    };

    var options = collection.categoryId ? {categoryId: collection.categoryId}
                                        : {query: collection.query};

    loading();

    // render pinned apps first
    collection.render(grid);

    // refresh since pinned apps might have been updated
    eme.init()
    .then(() => NativeInfo.setup())
    .then(() => collection.refresh())
    .then(() => {
      loading(false);
      collection.render(grid);
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

          collection.addWebResults(response.response.apps);
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
