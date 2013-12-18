(function() {
  'use strict';

  function SearchResult(data) {
    this.title = data.title;
    this.url = data.url;

    this.query = data.query;

    var iconData = data.iconData || {};
    this.iconData = {
      'MIMEType': iconData.MIMEType,
      'data': iconData.data
    };
  }

  SearchResult.prototype = {

  };

  Evme.SearchResult = SearchResult;
})();
