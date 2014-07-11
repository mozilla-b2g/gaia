'use strict';
/* global CollectionIcon */
/* global eme */
/* global NativeInfo */
/* global Promise */
/* global CollectionsDatabase */

(function(exports) {

  function ViewApps(collection) {

    var grid = document.getElementById('grid');
    var elements = {
      offline: document.getElementById('offline'),
      offlineMessage: document.getElementById('offline-message')
    };

    var options = {
      limit: 24
    };
    if (collection.categoryId) {
      options.categoryId = collection.categoryId;
    } else {
      options.query = collection.query;
    }

    loading();

    // XXX: Override the grid render method default options
    var _grid = grid._grid;
    var defaultGridRender = _grid.render;
    grid._grid.render = function(options) {
      options = options || {};
      options.skipDivider = true;
      defaultGridRender.call(_grid, options);
      var items = _grid.items;
      var offset = 0;
      if (items.length) {
        var item = items[items.length - 1];
        offset = item.y + item.pixelHeight;
      }
      elements.offline.style.marginTop = offset + 'px';
    };

    // Start by showing pinned apps
    // Update Collection from db
    // Render grid for the first time
    // Go get web results
    NativeInfo.setup()
    // Ensure homeIcons are initialized
    .then(() => collection.homeIcons.init())
    .then(() => collection.refresh())
    .then(() => listenForAddToCollection())
    .then(() => collection.render(grid))
    .then(() => {
      loading(false);
      queueRequest();
    });

    CollectionIcon.init(grid.maxIconSize);

    function listenForAddToCollection() {
      return new Promise(function doListenForAddToCollection(resolve) {
        CollectionsDatabase.addEventListener('updated', function onUpdate(e) {
          var data = e.target;

          if (collection.categoryId !== data.categoryId) {
            // Other collection was updated
            return;
          }

          // "add-to-collection" activity puts the icon in the first position
          var item = data.pinned[0];
          if (item && !grid.getIcon(item.identifier)) {
            // The icon is not rendered so this event has been dispatched
            // because of an "add-to-collection" activity
            collection.prependItemToGrid(item, grid);
          }
        });

        resolve();
      });
    }

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
        collectionName: collection.localizedName
      });
      elements.offlineMessage.innerHTML = msg;
      elements.offline.classList.add('show');
    }

    function makeRequest() {
      loading();

      eme.init()
      .then(() => eme.api.Apps.search(options))
      .then(function success(response) {
        onResponse();

        collection.addWebResults(response.response.apps);
        collection.renderWebResults(grid);

      }, onOffline);
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
