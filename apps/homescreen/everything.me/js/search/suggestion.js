(function() {
  'use strict';

  var ANNOTATION_REGEX = /\[(.+?)\]/g;

  function SearchSuggestion(data) {
    this.query = data.query;
    this.annotated = data.annotated;
    this.text = this.annotated.replace(ANNOTATION_REGEX, deannotate);
  };

  SearchSuggestion.prototype = {

  };

  function deannotate(match, p1) {
    return p1;
  };

  Evme.SearchSuggestion = SearchSuggestion;
})();
