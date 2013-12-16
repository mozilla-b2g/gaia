(function() {
  'use strict';

  function noop() {}

  function SearchClient() {
    this.search = function search(options, callback=noop) {
      Evme.DoATAPI.search({
        'query': options.query
      }, callback);
    };
  }

  Evme.SearchClient = new SearchClient();
})();
