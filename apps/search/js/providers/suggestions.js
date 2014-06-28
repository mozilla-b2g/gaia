(function() {

  'use strict';
  /* global eme, Promise, Provider, Search */

  var ANNOTATION_REGEX = /\[*(.+?)\]*/g;

  function deannotate(match, p1) {
    return p1;
  }

  function getSuggestionText(item) {
    return item.replace(ANNOTATION_REGEX, deannotate);
  }

  function Suggestions(eme) {
  }

  Suggestions.prototype = {

    __proto__: Provider.prototype,

    name: 'Suggestions',

    remote: true,

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
      return new Promise((resolve, reject) => {
        this.clear();
        if (!eme.api.Search) {
          reject();
          return;
        }

        this.request = eme.api.Search.suggestions({
          'query': input
        });

        this.request.then((data) => {
          var items = data.response;
          if (items && items.length) {
            // The E.me API can return the query as a suggestion
            // Filter this out
            var matchingIndex = items.indexOf(input);
            if (matchingIndex !== -1) {
              items.splice(matchingIndex, 1);
            }
          }
          resolve(items);
        }, (reason) => {
          reject();
        });
      });
    },

    render: function(items) {
      var ul = document.createElement('ul');
      ul.setAttribute('role', 'listbox');

      items.forEach(function each(item) {
        var text = getSuggestionText(item);
        var li = document.createElement('li');
        li.dataset.suggestion = li.textContent = text;
        li.setAttribute('role', 'option');
        // Can not simply read the text since we also have the bullet
        // character that the screen reader should avoid.
        li.setAttribute('aria-label', text);
        ul.appendChild(li);
      });

      this.clear();
      if (ul.childNodes.length) {
        this.container.appendChild(ul);
      }
    }

  };

  Search.provider(new Suggestions(window.eme));

}());
