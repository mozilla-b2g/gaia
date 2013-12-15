(function() {

  'use strict';

  function Contacts() {
    this.name = 'Contacts';
  }

  Contacts.prototype = {

    init: function() {

    },

    click: function(target) {
      Search.close();
      var activity = new MozActivity({
        name: 'open',
        data: {
          type: 'webcontacts/contact',
          params: {
            'id': target.dataset.contactId
          }
        }
      });
    },

    search: function(input) {
      this.results = document.createElement('section');
      Search.suggestions.appendChild(this.results);

      var options = {
        filterValue: input,
        filterBy: ['givenName'],
        filterOp: 'startsWith'
      };

      var request = navigator.mozContacts.find(options);

      request.onsuccess = (function() {
        var results = request.result;
        if (!results.length) {
          return;
        }

        var fragment = document.createDocumentFragment();
        for (var i = 0; i < results.length; i++) {
          var result = results[i];
          for (var j = 0; j < result.name.length; j++) {
            var div = document.createElement('div');
            div.className = 'result';
            div.dataset.provider = this.name;
            div.dataset.contactId = result.id;
            div.textContent = result.name[j];
            fragment.appendChild(div);
          }
        }
        this.results.appendChild(fragment.cloneNode(true));
      }).bind(this);

      request.onerror = function() {
      };
    }
  };

  Search.provider(new Contacts());

}());
