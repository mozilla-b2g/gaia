Calendar.ns('Provider').Mock = (function() {

  var Parent = Calendar.Provider.Abstract;

  function accountGeneric(mockName) {
    return function(account, callback) {
      var result;

      // next tick is scheduled before _resolveStage intentionally
      Calendar.nextTick(function() {
        callback.apply(
          null,
          this._resolveStaged(mockName, account) || [null, {}]
        );
      }.bind(this));
    }
  }

  function accountStaging(mockName) {
    return function() {
      var args = Array.slice(arguments);
      var user = args.shift();

      function matcher(object) {
        return object.user === user;
      }

      return this._stage(mockName, matcher, args);
    }
  }

  var stageEvents = {
    onbefore: function() {},
    onafter: function() {}
  };

  function Mock() {
    Parent.apply(this, arguments);

    // mock call storage
    this._stageObjects = Object.create(null);
  }

  Mock.prototype = {
    __proto__: Parent.prototype,

    // opt-into sync by default
    canSync: true,

    _stage: function(name, matcher, args) {
      if (!(this._stageObjects[name])) {
        this._stageObjects[name] = [];
      }

      var handler = Object.create(stageEvents);

      this._stageObjects[name].push({
        matches: matcher,
        args: args,
        handler: handler
      });

      return handler;
    },

    /**
     * Used to find staged objects.
     * The found object must be saved as
     * this method will also remove any found item.
     *
     * Stops at first found item that matches condition.
     *
     *    var stagedValue = this._resolveStaged('type', input) || someDefault;
     *
     */
    _resolveStaged: function(name, input) {
      var list = this._stageObjects[name];
      if (!list) {
        return null;
      }

      var i = 0;
      var len = list.length;

      for (; i < len; i++) {
        if (list[i].matches(input)) {
          // remove and return args
          var item = list.splice(i, 1)[0];
          var args = item.args;
          var handler = item.handler;

          handler.onbefore(args);

          Calendar.nextTick(
            handler.onafter.bind(null, args)
          );

          return args;
        }
      }

      return null;
    },

    /**
     * Stage a getAccount call.
     *
     * @param {String} user name to stage information for.
     * @param {Object|Null} err given to callback.
     * @param {Object|Null} object given to callback.
     */
    stageGetAccount: accountStaging('getAccount'),
    stageFindCalendars: accountStaging('findCalendars'),

    stageSyncEvents: function(user, calendarRemoteId, err) {
      err = err || null;

      function matcher(args) {
        return (
          args[0].user === user &&
          args[1].remote.id === calendarRemoteId
        );
      }

      return this._stage('syncEvents', matcher, err);
    },

    stageEventCapabilities: function() {
      var args = Array.slice(arguments);
      var id = args.shift();

      function matcher(event) {
        return event._id === id;
      }

      return this._stage('eventCapabilities', matcher, args);
    },

    stageCalendarCapabilities: function() {
      var args = Array.slice(arguments);
      var id = args.shift();

      function matcher(calendar) {
        return calendar._id === id;
      }

      return this._stage('calendarCapabilities', matcher, args);
    },

    /**
     * Stage findCalendars call.
     *
     *
     * provider.stageFindCalendars(
     *  accountModel.user,
     *  err || null,
     *  {
     *    remoteId: { id: 'remoteId', ... },
     *    ...
     *  }
     * );
     */
    findCalendars: accountGeneric('findCalendars'),

    getAccount: accountGeneric('getAccount'),

    syncEvents: function(account, calendar, callback) {
      var err;

      // first so this tick is scheduled first
      Calendar.nextTick(function() {
        callback(
          this._resolveStaged('syncEvents', [account, calendar])
        );
      }.bind(this));
    },

    calendarCapabilities: function(calendar) {
      var defaults = {
        canUpdateEvent: true,
        canCreateEvent: true,
        canDeleteEvent: true
      };

      var args =
        this._resolveStaged('calendarCapabilities', calendar) || [];

      var overrides = args[0] || {};

      for (var key in overrides) {
        defaults[key] = overrides[key];
      }

      return defaults;
    },

    eventCapabilities: function(event, callback) {
      var defaults = {
        canUpdate: true,
        canCreate: true,
        canDelete: true
      };

      Calendar.nextTick(function() {
        var args = this._resolveStaged('eventCapabilities', event) || [];
        var err = args[0] || null;
        var overrides = args[1] || {};

        for (var key in overrides) {
          defaults[key] = overrides[key];
        }

        callback(err, defaults);
      }.bind(this));
    }
  };

  return Mock;

}());
