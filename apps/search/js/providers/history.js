(function() {

  'use strict';

  var results = [];
  var MAX_URLS = 50;
  var STORE_NAME = 'places';

  navigator.getDataStores(STORE_NAME).then(function(stores) {
    var cursor = stores[0].sync(0);
    function cursorResolve(task) {
      switch (task.operation) {
      // First implementation simply syncs recently used links
      // and searches most recent, this will eventually be used
      // to build an index
      case 'update':
      case 'add':
        results.unshift(task.data);
        if (results.length > MAX_URLS) {
          results.length = MAX_URLS;
        }
        break;

      case 'done':
      case 'clear':
      case 'remove':
        break;
      }

      cursor.next().then(cursorResolve);
    }
    cursor.next().then(cursorResolve);
  });

  function matchesFilter(uri, filter) {
    return !uri || !filter || uri.match(new RegExp(filter, 'i')) !== null;
  }

  function History() {
    this.name = 'History';
  }

  History.prototype = {

    init: function(config) {
      this.container = config.container;
      this.container.addEventListener('click', this.click);
    },

    click: function(e) {
      var target = e.target;
      Search.close();
      window.open(target.dataset.url, '_blank', 'remote=true');
    },

    search: function(input) {
      this.clear();
      var fragment = document.createDocumentFragment();
      for (var i = 0; i < results.length; i++) {
        var result = results[i];
        if (!(matchesFilter(result.title, input) ||
              matchesFilter(result.url, input))) {
          break;
        }
        var div = document.createElement('div');
        var nameText = document.createElement('span');
        div.className = 'result';
        div.dataset.url = result.url;
        nameText.textContent = result.title;
        div.appendChild(nameText);
        fragment.appendChild(div);
      }
      this.container.appendChild(fragment.cloneNode(true));
    },

    clear: function() {
      this.container.innerHTML = '';
    }
  };

  Search.provider(new History());

}());
