'use strict';
/* global eme */
/* global GridIconRenderer */

(function(exports) {

  function ViewApps(collection) {

    var grid = document.getElementById('grid');
    var elements = {
      loading: document.getElementById('loading'),
      offline: document.getElementById('offline'),
      offlineMessage: document.getElementById('offline-message'),
      content: document.getElementById('content')
    };
    var contentHeight = elements.content.offsetHeight;

    var options = {
      limit: 16,
      first: 0
    };
    if (collection.categoryId) {
      options.categoryId = collection.categoryId;
    } else {
      options.query = collection.query;
    }

    // render pinned apps first
    collection.webResults = [];
    collection.render(grid);

    queueRequest();

    function queueRequest() {
      if (navigator.onLine) {
        makeRequest();
      } else {
        onOffline();
      }

      addListeners();
    }

    function makeRequest() {
      loading();

      eme.api.Apps.search(options)
        .then(function success(searchResponse) {
          var results = [];
          var paging = searchResponse.response.paging;
          var hasMore = paging.first+paging.limit < paging.max;

          searchResponse.response.apps.forEach(function each(webapp) {
            results.push({
              id: webapp.id, // e.me app id (int)
              name: webapp.name,
              url: webapp.appUrl,
              icon: webapp.icon,
              renderer: GridIconRenderer.TYPE.CLIP
            });
          });

          onResponse();

          // no results - no rendering
          if (!results.length) {
            return;
          }

          // XXX force layout or else grid isn't displayed
          grid.clientLeft;
          collection.webResults = collection.webResults.concat(results);
          collection.renderWebResults(grid, {
            newItems: results,
            firstItems: options.first === 0,
            from: grid.getItems().length
          });

          if (hasMore) {
            // detect scroll reached bottom
            elements.content.addEventListener('scroll', onScroll);
            onScroll();
          }

        }, onResponse);
    }

    function onScroll() {
      var gridHeight = grid.scrollHeight;
      var scrollTop = elements.content.scrollTop;
      var bottomVisible = scrollTop > gridHeight - contentHeight;

      console.log(
        bottomVisible,
        scrollTop,
        gridHeight - contentHeight,
        gridHeight,
        contentHeight
      );

      if (bottomVisible) {
        elements.content.removeEventListener('scroll', onScroll);
        loadMore();
      }
    }

    function onOffline() {
      loading(false);

      var msg = navigator.mozL10n.get('offline-webresults', {
        collectionName: collection.name
      });
      elements.offlineMessage.innerHTML = msg;
      elements.offline.classList.add('show');
    }

    function loadMore() {
      options.first += options.limit;
      queueRequest();
    }

    function loading(should) {
      if (should !== false) {
        elements.loading.classList.add('show');
      } else {
        elements.loading.classList.remove('show');
      }
      elements.loading.classList.remove('showHidden');
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
