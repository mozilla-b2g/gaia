(function(window) {
  if (typeof(Calendar) === 'undefined') {
    Calendar = {};
  }

  if (typeof(Calendar.Store) === 'undefined') {
    Calendar.Store = {};
  }

  function Account(db) {
    this.db = db;
    this._accounts = {};
    this._dirty = [];
  }

  Account.prototype = {
    __proto__: Calendar.Responder.prototype,

    add: function(id, name) {

    },

    all: function() {

    },

    remove: function() {

    }
  };

  Calendar.Store.Account = Account;

}(this));
