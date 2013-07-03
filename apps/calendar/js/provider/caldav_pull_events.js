Calendar.ns('Provider').CaldavPullEvents = (function() {

  var Calc = Calendar.Calc;
  var debug = Calendar.debug('pull events');

  /**
   * Event synchronization class for caldav provider.
   *
   * Options:
   *  - app: current calendar app (Calendar.App by default)
   *  - account: (Calendar.Models.Account) required
   *  - calendar: (Calendar.Models.Calendar) required
   *
   * Example:
   *
   *    // instance of a service stream
   *    var stream;
   *
   *    var pull = new Calendar.Provider.CaldavPullEvents(stream, {
   *      calendar: calendarModel,
   *      account: accountModel,
   *      app: Calendar.App
   *    });
   *
   *    stream.request(function() {
   *      // stream is complete here the audit of
   *      // events can be made. They are flushed
   *      // to the cache where possible but not actually
   *      // persisted in the database.
   *
   *      // assuming we are ready commit the changes
   *      pull.commit(function(err) {
   *        // all changes have been committed at this point.
   *      });
   *    });
   *
   * @param {Calendar.Responder} stream event emitter usually
   *                                    a service stream.
   * @param {Object} options options for instance (see above).
   */
  function PullEvents(stream, options) {
    if (options.calendar) {
      this.calendar = options.calendar;
    } else {
      throw new Error('.calendar option must be given');
    }

    if (options.account) {
      this.account = options.account;
    } else {
      throw new Error('.account option must be given');
    }

    if (options.app) {
      this.app = options.app;
    } else {
      this.app = Calendar.App;
    }

    stream.on('event', this);
    stream.on('component', this);
    stream.on('occurrence', this);
    stream.on('missingEvents', this);
    //stream.request(function(){});
    this.icalQueue = [];
    this.eventQueue = [];
    this.busytimeQueue = [];
    this.alarmQueue = [];

    // for commitIncrementally, used to groupd objects by similar eventIds
    this.eventAllQueue = [];
    this.eventGroupQueue = [undefined,[],[],[]];
    this.eventCount = 0;
    this.storedEventCount = null;

    this.eventGroup = Object.create(null);
    this.eventGroup.event = null;
    this.eventGroup.icals = [];
    this.eventGroup.busies = [];
    this.eventGroup.alarms = [];
    this.commitLock = false;
    this.occurrenceDone = false;
    this.componentDone = false;
    this.eventDone = false;
    this.queueOfHandleEvents = [];
    /*this.eventStore = this.app.store('Event');
      this.icalComponentStore = this.app.store('IcalComponent');
      this.calendarStore = this.app.store('Calendar');
      this.busytimeStore = this.app.store('Busytime');
      this.alarmStore = this.app.store('Alarm');*/


    this._busytimeStore = this.app.store('Busytime');

    // Catch account events to watch for mid-sync removal
    this._accountStore = this.app.store('Account');
    this._accountStore.on('remove', this._onRemoveAccount.bind(this));

    this._aborted = false;
    this._trans = null;
  }

  PullEvents.prototype = {

    eventQueue: null,
    busytimeQueue: null,

    /**
     * Get db id for busytime.
     *
     * @param {Object} busytime service sent busytime.
     */
    busytimeIdFromRemote: function(busytime) {
      var eventId = this.eventIdFromRemote(busytime, !busytime.isException);

      return busytime.start.utc + '-' +
             busytime.end.utc + '-' +
             eventId;
    },

    /**
     * Get db id for event.
     *
     * @param {Object} event service sent event or '.remote'
     *                       property in db event.
     *
     * @param {Boolean} ignoreException when true will ignore
     *                                  recurrence exceptions.
     *
     * @return {String} database object id.
     */
    eventIdFromRemote: function(event, ignoreException) {
      var id = event.eventId || event.id;

      if (!ignoreException && event.recurrenceId) {
        id += '-' + event.recurrenceId.utc;
      }

      return this.calendar._id + '-' + id;
    },

    /**
     * Format an incoming event.
     *
     * @param {Object} event service sent event.
     */
    formatEvent: function(event) {
      // get id or parent id we ignore the exception
      // rules here so children (exceptions) can lookup
      // their parents id.
      var id = this.eventIdFromRemote(event, true);

      var result = Object.create(null);
      result.calendarId = this.calendar._id;
      result.remote = event;

      if (event.recurrenceId) {
        result.parentId = id;
        // don't ignore the exceptions
        result._id = this.eventIdFromRemote(event);
      } else {
        result._id = id;
      }

      return result;
    },

    /**
     * Formats and tags busytime sent from service.
     *
     * @param {Object} time service sent busytime.
     */
    formatBusytime: function(time) {
      var eventId = this.eventIdFromRemote(time, !time.isException);
      var id = eventId + '-' + uuid.v4();
      var calendarId = this.calendar._id;

      time._id = id;
      time.calendarId = calendarId;
      time.eventId = eventId;

      if (time.alarms) {
        var i = 0;
        var len = time.alarms.length;
        var alarm;

        for (; i < len; i++) {
          alarm = time.alarms[i];
          alarm.eventId = eventId;
          alarm.busytimeId = id;
        }
      }

      return this._busytimeStore.initRecord(time);
    },

    handleOccurrenceSync: function(item) {
      var alarms;

      if ('alarms' in item) {
        alarms = item.alarms;
        delete item.alarms;

        if (alarms.length) {
          var i = 0;
          var len = alarms.length;
          var now = Date.now();

          for (; i < len; i++) {
            var alarm = {
              startDate: {},
              eventId: item.eventId,
              busytimeId: item._id
            };

            // Copy the start object
            for (var j in item.start) {
              alarm.startDate[j] = item.start[j];
            }
            alarm.startDate.utc += (alarms[i].trigger * 1000);

            var alarmDate = Calc.dateFromTransport(item.end);
            if (alarmDate.valueOf() < now) {
              continue;
            }
            this.alarmQueue.push(alarm);
          }
        }
      }

      this.app.timeController.cacheBusytime(item);
      this.busytimeQueue.push(item);
    },

    handleComponentSync: function(component) {
      component.eventId = this.eventIdFromRemote(component);
      component.calendarId = this.calendar._id;

      if (!component.lastRecurrenceId) {
        delete component.lastRecurrenceId;
      }

      this.icalQueue.push(component);
    },

    handleEventSync: function(event) {
      var exceptions = event.remote.exceptions;
      delete event.remote.exceptions;

      var id = event._id;
      var token = event.remote.syncToken;

      // clear any busytimes that could possibly be
      // related to this event as we will be adding new
      // ones as part of the sync.
      this._busytimeStore.removeEvent(id);
      // remove details of past cached events....
      this.app.timeController.removeCachedEvent(event._id);
      this.app.timeController.cacheEvent(event);

      this.eventQueue.push(event);

      var component = event.remote.icalComponent;
      delete event.remote.icalComponent;

      // don't save components for exceptions.
      // the parent has the ical data.
      if (!event.remote.recurrenceId) {
        this.icalQueue.push({
          data: component,
          eventId: event._id
        });
      }

      if (exceptions) {
        for (var i = 0; i < exceptions.length; i++) {
          this.handleEventSync(this.formatEvent(exceptions[i]));
        }
      }
    },


    handleOccurrenceSyncSpecial: function(item) {
      var alarms;

      if ('alarms' in item) {
        alarms = item.alarms;
        delete item.alarms;

        if (alarms.length) {
          var i = 0;
          var len = alarms.length;
          var now = Date.now();

          for (; i < len; i++) {
            var alarm = {
              startDate: {},
              eventId: item.eventId,
              busytimeId: item._id
            };

            // Copy the start object
            for (var j in item.start) {
              alarm.startDate[j] = item.start[j];
            }
            alarm.startDate.utc += (alarms[i].trigger * 1000);

            var alarmDate = Calc.dateFromTransport(item.end);
            if (alarmDate.valueOf() < now) {
              continue;
            }
            this.alarmQueue.push(alarm);

            this.eventGroup.alarms.push(alarm);
            //this.eventGroupQueue[3].push(alarm);
          }
        }
      }

      this.app.timeController.cacheBusytime(item);
      this.busytimeQueue.push(item);
      this.eventGroup.busies.push(item);
      this.occurrenceDone = true;
      //this.eventGroupQueue[2].push(item);
      return 'done';
    },

     handleComponentSyncSpecial: function(component) {
      component.eventId = this.eventIdFromRemote(component);
      component.calendarId = this.calendar._id;

      if (!component.lastRecurrenceId) {
        delete component.lastRecurrenceId;
      }

      this.icalQueue.push(component);
      //this.eventGroupQueue[1].push(component);
      this.eventGroup.icals.push(component);
      this.componentDone = true;
      return 'done';
    },

    handleEventSyncSpecial: function(event) {
      var exceptions = event.remote.exceptions;
      delete event.remote.exceptions;

      var id = event._id;
      var token = event.remote.syncToken;

      // clear any busytimes that could possibly be
      // related to this event as we will be adding new
      // ones as part of the sync.
      this._busytimeStore.removeEvent(id);
      // remove details of past cached events....
      this.app.timeController.removeCachedEvent(event._id);
      this.app.timeController.cacheEvent(event);

      this.eventQueue.push(event);

      //this.eventGroupQueue[0] = event;
      this.eventGroup.event = event;

      //this.eventDone = true;

      var component = event.remote.icalComponent;
      delete event.remote.icalComponent;

      // don't save components for exceptions.
      // the parent has the ical data.
      if (!event.remote.recurrenceId) {
        this.icalQueue.push({
          data: component,
          eventId: event._id
        });
        this.eventGroup.icals.push({
          data: component,
          eventId: event._id
        });


        this.componentDone = true;
      }

      if (exceptions) {
        for (var i = 0; i < exceptions.length; i++) {
          this.handleEventSyncSpecial(this.formatEvent(exceptions[i]));
        }
      }
      else {
        return 'done';
      }
    },

    /**
     * Account removal event handler. Aborts the rest of sync processing, if
     * the account deleted is the subject of the current sync.
     *
     * @param {String} database object id.
     */
    _onRemoveAccount: function(id) {
      if (id === this.account._id) {
        // This is our account, so abort the sync.
        this.abort();
      }
    },

    /**
     * Abort the sync. After this, further events will be ignored and commit()
     * will do nothing.
     */
    abort: function() {
      if (this._aborted) {
        // Bail, if already aborted.
        return;
      }
      // Flag that the sync should be aborted.
      this._aborted = true;
      if (this._trans) {
        // Attempt to abort the in-progress commit transaction
        this._trans.abort();
      }
    },

    handleEventOriginal: function(event) {
      if (this._aborted) {
        // Ignore all events, if the sync has been aborted.
        return;
      }

      var data = event.data;

      switch (event.type) {
        case 'missingEvents':
          this.removeList = data[0];
          break;
        case 'occurrence':
          var occur = this.formatBusytime(data[0]);
          this.handleOccurrenceSync(occur);
          break;
        case 'component':
          this.handleComponentSync(data[0]);
          break;
        case 'event':
          var event = this.formatEvent(data[0]);
          this.handleEventSync(event);
          break;
      }
    },

    handleEvent: function(event) {
      //while (this.commitLock === true)  {
        //continue;
        //this.queueOfHandleEvents.push(event);
        //return;
        if (event.type === 'event') {
          this.queueOfHandleEvents.push(event);
        }
      //}
      //if (this.commitLock === false)  {
        //this.commitLock = true;
        if (this._aborted) {
          // Ignore all events, if the sync has been aborted.
          return;
        }
        //if (this.queueOfHandleEvents.length != 0)  {
        //event = this.queueOfHandleEvents.splice(0,1)[0];
          //event = event[0];
        //}
        
        var self = this;
        var data = event.data;

        
            if (event.type === 'missingEvents') {
              this.removeList = data[0];
              //return;
              //break;
            }
            if (event.type === 'occurrence')  {
              var occur = this.formatBusytime(data[0]);
              var done = this.handleOccurrenceSyncSpecial(occur);
              if (done === 'done') {
                //return;
                //break;
              }
            }
            if (event.type === 'component')  {
              var done = this.handleComponentSyncSpecial(data[0]);
              if (done === 'done') {
                //return;
                //break;
              }
            }
            
            if (event.type === 'event') {
                var event = self.formatEvent(data[0]);
                  var done = self.handleEventSyncSpecial(event);
                  if (done === 'done')  {
                      self.eventDone = true;
                            //return;
                            //break;
                          }
                    //var eG = self.eventGroup;
                    //var thirddone = self.findByEventId(eG.event,eG);

                    /*self.commitSpecial5(self.eventGroup,function(err){
                        self.resetEventGroup();
                        var event = self.formatEvent(data[0]);
                        var done = self.handleEventSyncSpecial(event);
                          if (done === 'done')  {
                            return;
                          }
                        //}
                      },null);*/
                  }
              /*if (self.componentDone === true && self.occurrenceDone === true) {
                    var eG = self.eventGroup;
                    self.commitSpecial5(eG,function(err){
                      var seconddone = self.resetEventGroup();
                      if (seconddone === 'done') {
                        self.componentDone = false;
                        self.occurrenceDone = false;
                        
                        var event = self.formatEvent(data[0]);
                        var done = self.handleEventSyncSpecial(event);
                        if (done === 'done') {
                          return;
                        }

                      }
                    });
                  }

              else {  
                var seconddone = self.resetEventGroup();
                  if (seconddone === 'done') { 
                    var event = self.formatEvent(data[0]);
                    var done = self.handleEventSyncSpecial(event);
                  
                    if (done === 'done') {
                      
                      return;
                    }
                  }
                }
              }*/
        
              //break;
          //}
      //}
        //setTimeout(function(){ self.syncCommits();},3000);
        //if (self.occurrenceDone === true && self.eventDone === true && self.componentDone === true) {
          self.syncCommits();
        //}

    },


    syncCommits: function() {
      var self = this;
      if (self.occurrenceDone === true && self.eventDone === true && self.componentDone === true) {
        var eG = self.findByEventId2(self.eventGroup);
        self.commitSpecial5(eG,function(err){
          var done = self.resetEventGroup();
          if (done === 'done')  {
            return;
          }
        },null);
      }
    },


    findByEventId: function(eG) {
      var event = this.queueOfHandleEvents.splice(0,1)[0];
      var temp = Object.create(null);
      temp.event = event;
      var id = event._id;
      temp.icals = [];
      temp.busies = [];
      temp.alarms = [];
      //for (var i = 0 ; i < eG.length ; i++)  {
          
          var self = this;

          for (var j = 0 ; j < this.icalQueue.length ; j++)  {
            var ical = this.icalQueue[j];
            if (ical.eventId === id) {
              temp.icals.push(ical);
            }
          }
          for (var k = 0 ; k < this.busytimeQueue.length ; k++)  {
              var busy = this.busytimeQueue[k];
              if (busy.eventId === id) {
                temp.busies.push(busy);
              }
          }
          for (var l = 0 ; l < this.alarmQueue.length ; l++)  {
            var alarm = this.alarmQueue[l];
            if (alarm.eventId === id) {
              temp.alarms.push(alarm);
            }
          }
        return temp;              
          
        //}



    },



    findByEventId2: function(eG) {
      event = eG.event;//this.queueOfHandleEvents.splice(0,1)[0];
      var temp = Object.create(null);
      temp.event = event;
      var id = event._id;
      temp.icals = [];
      temp.busies = [];
      temp.alarms = [];
      //for (var i = 0 ; i < eG.length ; i++)  {
          
          

          for (var j = 0 ; j < eG.icals.length ; j++)  {
            var ical = eG.icals[j];
            if (ical.eventId === id) {
              temp.icals.push(ical);
            }
          }
          for (var k = 0 ; k < eG.busies.length ; k++)  {
              var busy = eG.busies[k];
              if (busy.eventId === id) {
                temp.busies.push(busy);
              }
          }
          for (var l = 0 ; l < eG.alarms.length ; l++)  {
            var alarm = eG.alarms[l];
            if (alarm.eventId === id) {
              temp.alarms.push(alarm);
            }
          }
        return temp;              
          
        //}



    },

    resetEventGroup: function() {
      this.eventGroup = Object.create(null);
      this.eventGroup.event = null;
      this.eventGroup.icals = [];
      this.eventGroup.busies = [];
      this.eventGroup.alarms = [];
      this.occurrenceDone = false;
      this.componentDone = false;
      this.eventDone = false;
      return 'done';
    },

    commitSuper: function(callback) {
      this._trans = null;
      callback(null);
    },

    /**
     * Commit all pending records incrementally with objects grouped by eventIds.
     *
     *
     * @param {Object} eventGroup object containg a single event and its related 
     * busytimes,alarms and ical components.
     * @param {Function} callback fired when transaction completes.
     * @param {String} type of call to this function can be 'start' or 'recurse'.
     */
    commitSpecial5: function(eventGroup,callback,type) {

      var eventStore = this.app.store('Event');
      var icalComponentStore = this.app.store('IcalComponent');
      var calendarStore = this.app.store('Calendar');
      var busytimeStore = this.app.store('Busytime');
      var alarmStore = this.app.store('Alarm');

      var trans = calendarStore.db.transaction(
        ['calendars', 'events', 'busytimes', 'alarms', 'icalComponents'],
        'readwrite'
      );
      var calendar = this.calendar;
      var account = this.account;

      this._trans = trans;
      /*if (this._aborted) {
        // Commit nothing, if sync was aborted.
        return callback && callback(null);
      }*/

      var self = this;

      if (type === null)  {
        var event = eventGroup.event;
        debug('add event', event);
        eventStore.persist(event, trans);

        eventGroup.icals.forEach(function(ical) {
          debug('add component', ical);
          icalComponentStore.persist(ical, trans);
        });

        eventGroup.busies.forEach(function(busy) {
          debug('add busytime', busy);
          busytimeStore.persist(busy, trans);
        });

        eventGroup.alarms.forEach(function(alarm) {
          debug('add alarm', alarm);
          alarmStore.persist(alarm, trans);
        });
      }

      if (this.removeList) {
        this.removeList.forEach(function(id) {
          eventStore.remove(id, trans);
        });
      }

      function handleError(e) {
        if (e && e.type !== 'abort') {
          console.error('Error persisting sync results', e);
        }

        // if we have an event preventDefault so we don't trigger window.onerror
        if (e && e.preventDefault) {
          e.preventDefault();
        }

        self._trans = null;
        callback && callback(e);
      }

      trans.addEventListener('error', handleError);
      trans.addEventListener('abort', handleError);


      trans.addEventListener('complete', function() {
        self._trans = null;
        callback && callback(null);
      });

      return trans;
    },

    /**
     * Commit all pending records.
     *
     *
     * @param {IDBTransaction} [trans] optional transaction.
     * @param {Function} callback fired when transaction completes.
     */
    commit: function(trans, callback) {
      var eventStore = this.app.store('Event');
      var icalComponentStore = this.app.store('IcalComponent');
      var calendarStore = this.app.store('Calendar');
      var busytimeStore = this.app.store('Busytime');
      var alarmStore = this.app.store('Alarm');

      if (typeof(trans) === 'function') {
        callback = trans;
        trans = calendarStore.db.transaction(
          ['calendars', 'events', 'busytimes', 'alarms', 'icalComponents'],
          'readwrite'
        );
      }

      if (this._aborted) {
        // Commit nothing, if sync was aborted.
        return callback && callback(null);
      }

      var calendar = this.calendar;
      var account = this.account;

      // Stash a reference to the transaction, in case we still need to abort.
      this._trans = trans;

      var self = this;

      this.eventQueue.forEach(function(event) {
        debug('add event', event);
        eventStore.persist(event, trans);
      });

      this.icalQueue.forEach(function(ical) {
        debug('add component', ical);
        icalComponentStore.persist(ical, trans);
      });

      this.busytimeQueue.forEach(function(busy) {
        debug('add busytime', busy);
        busytimeStore.persist(busy, trans);
      });

      this.alarmQueue.forEach(function(alarm) {
        debug('add alarm', alarm);
        alarmStore.persist(alarm, trans);
      });

      if (this.removeList) {
        this.removeList.forEach(function(id) {
          eventStore.remove(id, trans);
        });
      }

      function handleError(e) {
        if (e && e.type !== 'abort') {
          console.error('Error persisting sync results', e);
        }

        // if we have an event preventDefault so we don't trigger window.onerror
        if (e && e.preventDefault) {
          e.preventDefault();
        }

        self._trans = null;
        callback && callback(e);
      }

      trans.addEventListener('error', handleError);
      trans.addEventListener('abort', handleError);


      trans.addEventListener('complete', function() {
        self._trans = null;
        callback && callback(null);
      });

      return trans;
    }

  };

  return PullEvents;

}());
