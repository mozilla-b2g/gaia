Calendar.ns('Controllers').Sync = (function() {

  /**
   * Handles all synchronization related
   * tasks. The intent is that this will
   * be the focal point for any view
   * to observe sync events and this
   * controller will decide when to actually
   * tell the stores when to sync.
   */
  function Sync(app) {
    this.app = app;
    Calendar.Responder.call(this);
  }

  Sync.prototype = {
    __proto__: Calendar.Responder.prototype,

    observe: function() {
      var self = this;
      var account = this.app.store('Account');

      // used instead of bind for testing reasons.
      account.on('add', function(id, data) {
        self._syncAccount(data);
      });
    },

    /**
     * Sync all accounts, calendars, events.
     */
    sync: function(callback) {
      var key;
      var self = this;
      var account = this.app.store('Account');
      var pending = 0;
      var errorList = [];

      function next(err) {
        if (err) {
          errorList.push(err);
        }

        if (!(--pending)) {
          if (callback) {
            if (errorList.length) {
              callback(errorList);
            } else {
              callback(null);
            }
          }
          self.emit('sync complete');
        }
      }

      this.emit('sync start');

      for (key in account.cached) {
        pending++;
        this._syncAccount(
          account.cached[key], next
        );
      }

      if (!pending) {
        callback();
        this.emit('sync complete');
      }
    },

    _syncAccount: function(model, callback) {
      var self = this;
      var account = this.app.store('Account');
      var calendar = this.app.store('Calendar');

      account.sync(model, function(err) {
        if (err) {
          //TODO: Implement error handling to show
          //      UI to change user/password, etc..
          callback(err);
          return;
        }

        var pending = 0;
        var cals = calendar.remotesByAccount(
          model._id
        );

        var key;
        var errorList = [];

        function next(err) {
          if (err) {
            errorList.push(err);
          }

          if (!(--pending)) {
            if (errorList.length) {
              callback(errorList);
            } else {
              callback(null);
            }
          }
        }

        for (key in cals) {
          pending++;
          calendar.sync(
            model,
            cals[key],
            next
          );
        }
      });
    }

  };

  return Sync;

}());

