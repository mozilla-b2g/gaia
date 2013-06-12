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
      standardAlarmDefault: -300,
      alldayAlarmDefault: 32400,
      syncFrequency: 15,
      syncAlarm: {
        alarmId: null,
        start: null,
        end: null
      },
      showSwipeToNavigateHint: true
    },

    /** disable caching */
    _addToCache: function() {},
    _removeFromCache: function() {},

    /**
     * This method also will use the internal cache to ensure
     * callers are in a consistent state and don't require round
     * trips to the database. When the value does not exist defaults
     * are used where possible...
     *
     *
     *    settings.getValue('syncFrequency', function(err, value) {
     *      // ...
     *    });
     *
     *
     * @param {String} key name of setting.
     * @param {Function} callback usual [err, value] does not include metadata.
     */
    getValue: function(key, callback) {
      var self = this;

      if (key in this._cached) {
        Calendar.nextTick(function handleCached() {
          callback(null, self._cached[key].value);
        });

        // we have cached value exit...
        return;
      }

      this.get(key, function handleStored(err, value) {
        if (err) {
          return callback(err);
        }

        if (value === undefined && self.defaults[key] !== undefined) {
          value = { value: self.defaults[key] };
        }

        self._cached[key] = value;
        callback(null, value.value);
      });
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

      var cached = this._cached[key];
      var record;

      if (cached && cached._id) {
        cached.value = value;
        cached.updatedAt = new Date();
        record = cached;
      } else {
        var created = new Date();
        this._cached[key] = record = {
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
