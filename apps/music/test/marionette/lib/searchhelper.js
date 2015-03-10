/* global module */
'use strict';


var SearchHelper = {

  singleTitle: function(element) {
    return element.findElement('.list-single-title').text();
  },

  mainTitle: function(element) {
    return element.findElement('.list-main-title').text();
  },

  highlight: function(element) {
    return element.findElement('.search-highlight').text();
  }

};


module.exports = SearchHelper;
