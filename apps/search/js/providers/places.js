(function() {

  'use strict';

  // We current re sync from scratch every time and store the last 50
  // urls in memory
  var results = {};
  var urls = [];
  var MAX_URLS = 50;

  // Maximum number of results to show show for a single query
  var MAX_RESULTS = 5;

  // Name of the datastore we pick up places from
  var STORE_NAME = 'places';

  // The last revision that we synced from the datastore, we sync
  // every time the search app gains focus
  var lastRevision = 0;

  // Is there a sync in progress
  var syncing = false;

  function doSync() {
    if (syncing) return;
    syncing = true;
    navigator.getDataStores(STORE_NAME).then(function(stores) {
      var cursor = stores[0].sync(lastRevision);
      function cursorResolve(task) {
        lastRevision = task.revisionId;
        switch (task.operation) {
          // First implementation simply syncs recently used links
          // and searches most recent, this will eventually be used
          // to build an index
          case 'update':
          case 'add':
            if (!task.data.url.startsWith('app://')) {
              results[task.data.url] = task.data;
              if (!(task.data.url in urls)) {
                urls.unshift(task.data.url);
              }
            }
            while (urls.length > MAX_URLS) {
              var url = urls.pop();
              delete results[url];
            }
            break;
          case 'clear':
          case 'remove':
            break;
          case 'done':
            syncing = false;
            break;
        }
        if (syncing) {
          cursor.next().then(cursorResolve);
        }
      }
      cursor.next().then(cursorResolve);
    });
  }

  doSync();

  function matchesFilter(value, filter) {
    return !value || !filter || value.match(new RegExp(filter, 'i')) !== null;
  }

  function Places() {}

  Places.prototype = {

    __proto__: Provider.prototype,

    name: 'Places',

    click: function(e) {
      var target = e.target;
      Search.close();
      window.open(target.dataset.url, '_blank', 'remote=true');
    },

    search: function(input) {
      this.clear();
      var matched = 0;
      var fragment = document.createDocumentFragment();
      for (var url in results) {

        var result = results[url];
        if (!(matchesFilter(result.title, input) ||
              matchesFilter(result.url, input))) {
          continue;
        }

        var div = document.createElement('div');
        var nameText = document.createElement('span');
        div.className = 'result';
        div.dataset.url = result.url;
        nameText.textContent = result.title || result.url;
        div.appendChild(nameText);
        fragment.appendChild(div);

        if (++matched > MAX_RESULTS) {
          break;
        }
      }
      this.container.appendChild(fragment.cloneNode(true));
    },

    sync: doSync
  };

  Search.provider(new Places());

}());
