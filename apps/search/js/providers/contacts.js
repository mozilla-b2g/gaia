(function() {

  'use strict';

  function Contacts() {
  }

  Contacts.prototype = {

    __proto__: Provider.prototype,

    name: 'Contacts',

    click: function(e) {
      var target = e.target;

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
      var options = {
        filterValue: input,
        filterBy: ['givenName'],
        filterOp: 'startsWith'
      };

      this.clear();

      var request = navigator.mozContacts.find(options);
      request.onsuccess = (function() {
        var results = request.result;
        if (!results.length) {
          return;
        }

        var renderResults = [];
        for (var i = 0; i < results.length; i++) {
          var result = results[i];
          for (var j = 0; j < result.name.length; j++) {
            var renderObj = {
              title: result.name[j],
              dataset: {
                contactId: result.id
              }
            };

            if (result.photo) {
              renderObj.icon = result.photo[0];
            }

            renderResults.push(renderObj);
          }
        }
        this.render(renderResults);
      }).bind(this);

      request.onerror = function() {
      };
    }
  };

  Search.provider(new Contacts());

}());
