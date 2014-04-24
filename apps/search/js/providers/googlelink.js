/* global Provider */

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
        window.open(e.target.dataset.url, '_blank', 'remote=true');
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
