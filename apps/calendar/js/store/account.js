(function(window) {
  if (typeof(Calendar) === 'undefined') {
    Calendar = {};
  }

  if (typeof(Calendar.Store) === 'undefined') {
    Calendar.Store = {};
  }

  function Account() {
    Calendar.Store.Abstract.apply(this, arguments);
    this._accounts = {};
  }

  Account.prototype = {
    __proto__: Calendar.Store.Abstract.prototype,

    add: function() {},
    all: function() {},
    remove: function() {}
  };

  Calendar.Store.Account = Account;

}(this));
