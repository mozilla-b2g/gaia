/* global Provider, Search */

(function(exports) {

  'use strict';

  function GoogleLink() {}

  GoogleLink.prototype = {

    __proto__: Provider.prototype,

    name: 'GoogleLink',

    init: function() {
      Provider.prototype.init.apply(this, arguments);
    },

    click: function(e) {
      if (e.target.dataset.url) {
        Search.navigate(e.target.dataset.url);
      }
    },

    search: function(input, collect) {
      this.render([{
        title: input + ' - Google search',
        dataset: {
          url: 'http://google.com/search?q=' + input
        }
      }]);
    }
  };

  exports.GoogleLink = GoogleLink;

})(window);
