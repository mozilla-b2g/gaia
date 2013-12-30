(function() {

  'use strict';

  function Suggestions(eme) {
  }

  Suggestions.prototype = {

    __proto__: Provider.prototype,

    name: 'Suggestions',

    init: function(config) {
      Provider.prototype.init.apply(this, arguments);
      eme.openPort();
    },

    click: function(e) {
      var suggestion = e.target && e.target.dataset.suggestion;
      if (suggestion) {
       Search.setInput(suggestion);
      }
    },

    search: function(input, type) {
      this.clear();

      setTimeout(function nextTick() {
        eme.port.postMessage({
          method: eme.API.SUGGEST,
          input: input,
          type: type
        });
      }.bind(this));
    },

    clear: function() {
      this.container.innerHTML = '';
    },

    onmessage: function(msg) {
      var data = msg.data;
      if (!data) {
        return;
      }

      this.clear();
      var suggestions = data.suggestions;
      if (suggestions) {
        var ul = document.createElement('ul');
        var rendered = 0;

        suggestions.forEach(function render(searchSuggestion) {
          // The E.me API can return the query as a suggestion
          // Filter out exact matches
          if (searchSuggestion.text === searchSuggestion.query) {
            return;
          }

          rendered++;
          var li = document.createElement('li');
          li.dataset.suggestion = li.textContent = searchSuggestion.text;
          ul.appendChild(li);
        });

        if (rendered) {
          this.container.appendChild(ul);
        }
      }
    }

  };

  Search.provider(new Suggestions(window.eme));

}());
