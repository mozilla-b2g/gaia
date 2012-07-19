(function(window) {

  function Account() {
    Calendar.Store.Abstract.apply(this, arguments);
  }

  Account.prototype = {
    __proto__: Calendar.Store.Abstract.prototype,

    _store: 'accounts',

    _createModel: function(obj, id) {
      if (!(obj instanceof Calendar.Models.Account)) {
        obj = new Calendar.Models.Account(obj);
        obj.connect();
      }

      if (typeof(id) !== 'undefined') {
        obj._id = id;
      }

      return obj;
    },

    /**
     * Checks if provider type is used
     * in any of the cached records.
     *
     * @param {String} type (like Local).
     */
    presetActive: function(type) {
      var key;

      for (key in this._cached) {
        if (this._cached[key].preset === type) {
          return true;
        }
      }

      return false;
    }

  };

  Calendar.ns('Store').Account = Account;

}(this));
