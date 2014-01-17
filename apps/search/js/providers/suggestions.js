(function() {

  'use strict';

  var ANNOTATION_REGEX = /\[(.+?)\]/g;
  function deannotate(match, p1) {
    return p1;
  };

  function getSuggestionText(item) {
    return item.replace(ANNOTATION_REGEX, deannotate);
  };

  function Suggestions(eme) {
  }

  Suggestions.prototype = {

    __proto__: Provider.prototype,

    name: 'Suggestions',

    init: function(config) {
      Provider.prototype.init.apply(this, arguments);
      eme.init();
    },

    click: function(e) {
      var suggestion = e.target && e.target.dataset.suggestion;
      if (suggestion) {
       Search.setInput(suggestion);
      }
    },

    search: function(input) {
      this.clear();
      if (!eme.api.Search) {
        return;
      }

      this.request = eme.api.Search.suggestions({
        'query': input
      });

      this.request.then((function success(data) {
        var items = data.response;
        if (items && items.length) {
          this.render(input, items);
        }
      }).bind(this), function reject(reason) {
        // handle errors
      });
    },

    render: function(input, items) {
      var ul = document.createElement('ul');
      var results = [];

      items.forEach(function each(item) {
        var text = getSuggestionText(item);
        // The E.me API can return the query as a suggestion
        // Filter out exact matches
        if (text !== input) {
          var li = document.createElement('li');
          li.dataset.suggestion = li.textContent = text;
          ul.appendChild(li);
        }
      });

      this.clear();
      if (ul.childNodes.length) {
        this.container.appendChild(ul);
      }
    }

  };

  Search.provider(new Suggestions(window.eme));

}());
