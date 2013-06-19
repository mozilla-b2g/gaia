/**
 * EventMutations are a simple wrapper for a
 * set of idb transactions that span multiple
 * stores and calling out to the time controller
 * at appropriate times so it can cache the information.
 *
 *
 * Examples:
 *
 *
 *    // create an event
 *    var mutation = Calendar.EventMutations.create({
 *      // this class does not handle/process events
 *      // only persisting the records. Busytimes will
 *      // automatically be recreated.
 *      event: event
 *    });
 *
 *    // add an optional component
 *    // mutation.icalComponent = component;
 *
 *    mutation.commit(function(err) {
 *      if (err) {
 *        // handle it
 *      }
 *
 *      // success event/busytime/etc.. has been created
 *    });
 *
 *
 *    // update an event:
 *    // update shares an identical api but will
 *    // destroy/recreate associated busytimes with event.
 *    var mutation = Calendar.EventMutations.update({
 *      event: event
 *    });
 *
 *    mutation.commit(function() {
 *
 *    });
 *
 *
 */
Calendar.EventMutations = (function() {

  var Calc = Calendar.Calc;

  /**
   * Create a single instance busytime for the given event object.
   *
   * @param {Object} event to create busytime for.
   */
  function createBusytime(event) {
    return {
      _id: event._id + '-' + uuid.v4(),
      eventId: event._id,
      calendarId: event.calendarId,
      start: event.remote.start,
      end: event.remote.end
    };
  }

  function Create(options) {
    if (options) {
      for (var key in options) {
        if (options.hasOwnProperty(key)) {
          this[key] = options[key];
        }
      }
    }
  }

  Create.prototype = {

    commit: function(callback) {
      var alarmStore = Calendar.App.store('Alarm');
      var eventStore = Calendar.App.store('Event');
      var busytimeStore = Calendar.App.store('Busytime');
      var componentStore = Calendar.App.store('IcalComponent');

      var controller = Calendar.App.timeController;

      var trans = eventStore.db.transaction(
        eventStore._dependentStores,
        'readwrite'
      );

      trans.oncomplete = function commitComplete() {
        callback(null);
      };

      trans.onerror = function commitError(e) {
        callback(e.target.error);
      };

      eventStore.persist(this.event, trans);

      if (!this.busytime) {
        this.busytime = createBusytime(this.event);
      }

      busytimeStore.persist(this.busytime, trans);

      if (this.icalComponent) {
        componentStore.persist(this.icalComponent, trans);
      }

      controller.cacheEvent(this.event);
      controller.cacheBusytime(
        busytimeStore.initRecord(this.busytime)
      );

      var alarms = this.event.remote.alarms;
      if (alarms && alarms.length) {
        var i = 0;
        var len = alarms.length;
        var now = Date.now();

        var alarmTrans = alarmStore.db.transaction(
          ['alarms'],
          'readwrite'
        );

        for (; i < len; i++) {

          var alarm = {
            startDate: {
              offset: this.busytime.start.offset,
              utc: this.busytime.start.utc + (alarms[i].trigger * 1000)
            },
            eventId: this.busytime.eventId,
            busytimeId: this.busytime._id
          };

          var alarmDate = Calc.dateFromTransport(this.busytime.end).valueOf();
          if (alarmDate < now) {
            continue;
          }

          alarmStore.persist(alarm, alarmTrans);
        }
      }
    }

  };

  function Update() {
    Create.apply(this, arguments);
  }

  Update.prototype = {
    commit: function(callback) {
      var busytimeStore = Calendar.App.store('Busytime');

      var self = this;

      // required so UI knows to refresh even in the
      // case where the start/end times are the same.
      busytimeStore.removeEvent(this.event._id, function(err) {
        if (err) {
          callback(err);
          return;
        }

        Create.prototype.commit.call(self, callback);
      });
    }
  };

  return {
    create: function createMutation(option) {
      return new Create(option);
    },

    update: function updateMutation(option) {
      return new Update(option);
    }
  };

}());
