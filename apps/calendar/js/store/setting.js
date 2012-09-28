Calendar.ns('Store').Setting = (function() {

  function Setting() {
    Calendar.Store.Abstract.apply(this, arguments);
  }

  Setting.prototype = {
    __proto__: Calendar.Store.Abstract.prototype,

    _store: 'settings',

    /**
     * Default option values.
     */
    defaults: {
      syncFrequency: 15
    },

    /**
     * Frequency to sync the calendar.
     * Accepted values:
     *
     *  null (never)
     *  numeric (in minutes)
     *
     * @return {Null|Numeric} number of minutes.
     */
    get syncFrequency() {
      var name = 'syncFrequency';
      if (name in this.cached) {
        return this.cached[name].value;
      } else {
        return this.defaults[name];
      }
    },

    /**
     * Persist a setting change.
     *
     * In addition to updating the value of the setting
     * it will also update the updatedAt & createdAt properties
     * of the record.
     *
     * Calling this function will also emit a 'change' event
     * prior to fully persisting the record to the database.
     *
     * Example:
     *
     *    var settingStore;
     *
     *    settingStore.set('syncFrequency', 15, function() {
     *      // done
     *    });
     *
     *    // somewhere else in the app:
     *
     *    settingStore.on('syncFrequencyChange', function(value) {
     *      // value === 15
     *    });
     *
     * @param {String} key name of setting.
     * @param {Object} value any object that IndexedDb can store.
     * @param {IDBTransaction} [trans] idb transaction optional.
     * @param {Function} [callback] optional callback.
     */
    set: function(key, value, trans, callback) {
      if (typeof(trans) === 'function') {
        callback = trans;
        trans = null;
      }

      var cached = this.cached[key];
      var record;

      if (cached) {
        cached.value = value;
        cached.updatedAt = new Date();
        record = cached;
      } else {
        var created = new Date();
        record = {
          _id: key,
          createdAt: created,
          updatedAt: created,
          value: value
        };
      }

      this.emit(key + 'Change', value, record);
      this.persist(record, trans, callback);
    }

  };

  return Setting;

}());
