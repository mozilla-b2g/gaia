(function() {

  'use strict';

  function WebResults(eme) {
    this.name = 'WebResults';
  }

  WebResults.prototype = {

    init: function(config) {
      var self = this;

      this.container = config.container;
      this.container.addEventListener('click', this.click);

      eme.openPort();
    },

    click: function(e) {
      var url = e.target && e.target.dataset.url;
      if (url) {
        Search.browse(url);
      }
    },

    search: function(input, type) {
      this.clear();

      setTimeout(function nextTick() {
        eme.port.postMessage({
          method: eme.API.SEARCH,
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

      var results = data.results;
      if (results) {
        var frag = document.createDocumentFragment();

        results.forEach(function render(searchResult) {
          var el = document.createElement('div');
          el.dataset.url = searchResult.url;

          var img = document.createElement('img');
          img.src = searchResult.icon;
          el.appendChild(img);

          var title = document.createTextNode(searchResult.title);
          el.appendChild(title);

          frag.appendChild(el);
        });

        this.container.appendChild(frag);
      }
    }

  };

  Search.provider(new WebResults(window.eme));

}());
