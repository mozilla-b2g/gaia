'use strict';
/* global CollectionIcon */
/* global CollectionsDatabase */
/* global eme */
/* global HomeIcons */
/* global NativeInfo */

(function(exports) {

  function ViewApps(collection) {

    var rendered = false;
    var grid = document.getElementById('grid');
    var elements = {
      offline: document.getElementById('offline'),
      offlineMessage: document.getElementById('offline-message')
    };

    // Items which are inserted during collection render.
    // Prepend them to the list after we're done rendering.
    var asyncItems = [];

    var options = {
      limit: 24
    };
    if (collection.categoryId) {
      options.categoryId = collection.categoryId;
    } else {
      options.query = collection.query;
    }

    loading();

    CollectionsDatabase.addEventListener('updated', function onUpdate(e) {
      var data = e.target;
      if (collection.id !== data.id) {
        // Other collection was updated
        return;
      }

      asyncItems.push(data);
      rendered && prependAsyncItems();
    });

    grid.addEventListener('gaiagrid-resize', () => {
      var layout = grid._grid.layout;
      var height = layout.offsetY + layout.gridItemHeight;
      grid.style.height = height + 'px';
    });

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
    HomeIcons.init()
    .then(() => NativeInfo.setup())
    .then(() => collection.refresh())
    .then(() => collection.render(grid))
    .then(() => {
      rendered = true;
      loading(false);
      queueRequest();
      prependAsyncItems();
    });

    CollectionIcon.init(grid.maxIconSize);

    function prependAsyncItems() {
      var data;
      while ((data = asyncItems.pop())) {
        // "add-to-collection" activity puts the icon in the first position
        var position = 0;
        var item = data.pinned[position];
        if (item && !grid.getIcon(item.identifier)) {
          // The icon is not rendered so this event has been dispatched
          // because of an "add-to-collection" activity
          collection.addItemToGrid(item, grid, position);
          return;
        }

        // "install" connection puts the icon in the last position
        position = data.pinned.length - 1;
        item = data.pinned[position];
        if (item && !grid.getIcon(item.identifier)) {
          // The icon is not rendered so this event has been dispatched
          // because of an "install" message was received
          collection.addItemToGrid(item, grid, position);
        }
      }
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
      elements.offlineMessage.textContent = msg;
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
