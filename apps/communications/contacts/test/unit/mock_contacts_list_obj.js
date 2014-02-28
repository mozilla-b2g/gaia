'use strict';

var MockContactsListObj = {
    init: function() {},
    load: function() {},
    refresh: function() {},
    refreshFb: function() {},
    getContactById: function() {},
    getAllContacts: function() {},
    handleClick: function() {},
    remove: function() {},
    loaded: true,
    clearClickHandlers: function() {},
    setOrderByLastName: function() {},
    selectFromList: function(title, action, callback, 
        navigationController, transitionType) {
      var promise = {
        canceled: false,
        _selected: [],
        resolved: false,
        successCb: null,
        errorCb: null,
        resolve: function resolve(ids) {
          var self = this;
          setTimeout(function onResolve() {
            if (ids)
              self._selected = ids;
            self.resolved = true;
            if (self.successCb) {
              self.successCb(self._selected);
            }
          }, 0);
        }
      };
      action(promise);
      promise.resolve([]);
    }
};
