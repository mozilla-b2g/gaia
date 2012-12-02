Calendar.ns('Views').DayBased = (function() {

  var Calc = Calendar.Calc;
  var hoursOfOccurance = Calendar.Calc.hoursOfOccurance;
  var OrderedMap = Calendar.Utils.OrderedMap;

  const MINUTES_IN_HOUR = 60;

  /**
   * Ordered map for storing relevant
   * details of day based views.
   */
  function DayBased() {
    Calendar.View.apply(this, arguments);

    if (!this.timespan && this.date) {
      this.timespan = Calc.spanOfDay(this.date);
    }

    this._resetHourCache();
    this.controller = this.app.timeController;
  }

  DayBased.prototype = {
    __proto__: Calendar.View.prototype,

    /**
     * Signifies the state of view.
     * We increment the change token
     * each time we switch days.
     *
     * This can be used to avoid race conditions
     * by storing a reference to the token locally
     * then comparing it with the global state of
     * the view.
     */
    _changeToken: 0,

    classType: 'day-events',

    /**
     * Render all day events outside of flow.
     */
    outsideAllDay: true,

    /**
     * When true will render all hours of the day
     * (empty of events or not) on initial render.
     */
    renderAllHours: true,

    /**
     * Template to use for generating html.
     * Must be a subclass of template and must provide:
     *
     *    hour:
     *      - hour: numeric hour (0, 1, 23, 24, etc..)
     *      - displayHour: localized hour (12am, etc..)
     *      - items: html content for hour.
     *      - classes: classes/flags for hour
     *
     *    event:
     *      - calendarId
     *      - eventId
     *      - title
     *      - location
     *      - attendees
     */
    template: Calendar.Templates.Day,

    /**
     * Date that this view represents.
     */
    date: null,

    /**
     * Range of time this view will cover.
     *
     * @type {Calendar.Timespan}
     */
    timespan: null,

    /**
     * Contains list of all rendered hours
     * and the details of those hours.
     */
    hours: null,

    /**
     * Contains a map of all rendered
     * busytime ids and which hours they occur at.
     */
    _idsToHours: null,


    get element() {
      return this._element;
    },

    get events() {
      return this._eventsElement;
    },

    /** private **/

    /**
     * Reset the hour cache.
     */
    _resetHourCache: function() {
      this._idsToHours = Object.create(null);
      this.overlaps = new Calendar.Utils.Overlap();
      this.hours = new OrderedMap([], Calc.compareHours);
    },

    /**
     * Remove the current timespan observer.
     */
    _removeTimespanObserver: function() {
      if (this.timespan) {
        this.controller.removeTimeObserver(
          this.timespan,
          this
        );
      }
    },

    /**
     * Starts the process of loading records for display.
     *
     * @param {Object|Array} busytimes list or single busytime.
     */
    _loadRecords: function(busytimes) {
      // we want to fail loudly if nothing is given.
      busytimes = (Array.isArray(busytimes)) ? busytimes : [busytimes];

      // keep local record of original
      // token if this changes we know
      // we have switched dates.
      var token = this._changeToken;
      var self = this;

      this.controller.findAssociated(busytimes, function(err, list) {
        if (self._changeToken !== token) {
          // tokens don't match we don't
          // care about these results anymore...
          return;
        }

        list.forEach(function(record) {
          this.add(record.busytime, record.event);
        }, self);
      });
    },

    /**
     * Creates a record for a given hour.
     * NOTE- this usually needs to be called
     * after creating the hour.
     *
     * @param {Numeric} hour current hour.
     * @param {Object} busytime object.
     * @param {Object} record usually an event.
     */
    _createRecord: function(hour, busytime, record) {
      var hourRecord = this.hours.get(hour);
      var id = busytime._id;

      if (!hourRecord) {
        hourRecord = this.createHour(hour);
      }

      if (!record) {
        throw new Error('must pass a event');
      }

      var eventRecord = true;

      if (id in this._idsToHours) {
        // existing event
        this._idsToHours[id].push(hour);
      } else {
        // new event
        this._idsToHours[id] = [hour];

        var html = this._renderEvent(busytime, record);
        var eventArea = hourRecord.element;
        var records = hourRecord.records;
        var idx = records.insertIndexOf(busytime._id);

        if (this.template.hourEventsSelector) {
          eventArea = eventArea.querySelector(
            this.template.hourEventsSelector
          );
        }


        // we ignore insertion order for now as the overlap &
        // placement logic can handle those things.
        eventArea.insertAdjacentHTML('beforeend', html);
        var el = eventArea.lastChild;

        if (hour !== Calendar.Calc.ALLDAY) {
          this._assignPosition(busytime, el);
          this.overlaps.add(busytime, el);
        } else {
          /**
           * Because we have two types of events (hourly & allday)
           * we need to store the elements differently.
           * The all day events we store here but the hourly
           * events are stored in the overlap container.
           *
           * TODO: maybe it makes sense to have a single container
           *       that contains both sets of elements.
           */
          eventRecord = { element: el };
        }
      }

      // hour flags
      var calendarId = this.calendarId(busytime);
      hourRecord.flags.push(calendarId);
      hourRecord.element.classList.add(calendarId);

      // increment count of event per-hour (hour -> [events] counter)
      return hourRecord.records.set(id, eventRecord);
    },

    /**
     * Inject a html string into a element based on its
     * position in the hour records.
     *
     * @param {String} html template string.
     * @param {HTMLElement} element dom element to inject html into.
     * @param {Array} records used to determine the position that snippet should
     *                        be inserted into the parent element.
     * @param {Numeric} idx current index used with records to position snippet.
     * @return {HTMLElement} inserted dom element.
     */
    _insertElement: function(html, element, records, idx) {
      var el;
      var len = records.length;

      if (!element.children.length || idx === 0) {
        element.insertAdjacentHTML(
          'afterbegin', html
        );
        el = element.firstChild;
      } else {
        var lastElement = records[idx - 1][1];
        lastElement.element.insertAdjacentHTML(
          'afterend', html
        );
        el = lastElement.element.nextElementSibling;
      }

      return el;
    },

    /**
     * Assigns an elements its height and top offset based on its busytime.
     *
     * @param {Object} busytime full busytime object.
     * @param {HTMLElement} element target to apply top/height to.
     */
    _assignPosition: function(busytime, element) {
      var topOffset = 0;
      var height = 0;

      // cache dates
      var start = busytime.startDate;
      var end = busytime.endDate;

      // check if start time is on same date.
      var startMin = 0;
      var startHour = 0;
      if (Calendar.Calc.isSameDate(this.date, busytime.startDate)) {
        startMin = start.getMinutes();
        startHour = start.getHours();
      }

      // check if end time is on same date.
      var endMin = 59;
      var endHour = 23;
      if (Calendar.Calc.isSameDate(this.date, busytime.endDate)) {
        endHour = end.getHours();
        endMin = end.getMinutes();
      }

      // the % of the way we are through the first hour.
      var offsetPercent = (startMin / MINUTES_IN_HOUR) * 100;
      if (offsetPercent) {
        // assign top offset as percentage
        element.style.top = String(offsetPercent) + '%';
      }

      // Calculate duration in hours, with minutes as decimal part
      var hoursDuration = (endHour - startHour) +
                          ((endMin - startMin) / MINUTES_IN_HOUR);

      // If this event is less than a full hour, tweak the classname so that
      // some alternate styles for a tiny event can apply (eg. hide details)
      if (hoursDuration < 1) {
        element.className += ' partial-hour';
      }

      return this._assignHeight(element, hoursDuration);
    },

    /**
     * Assigns an elements height, based on a duration in hours.
     *
     * @param {HTMLElement} element target to apply top/height to.
     * @param {Numeric} duration in hours, minutes as decimal part.
     */
    _assignHeight: function(element, hoursDuration) {
      element.style.height = (hoursDuration * 100) + '%';
    },

    /**
     * build the default elements for the view and return the parent element.
     */
    _buildElement: function() {
      // create the hidden values for element & eventsElement
      this._eventsElement = document.createElement('section');
      this._element = document.createElement('section');

      // if the allDayElement is not assigned
      if (!this.allDayElement) {
        this.allDayElement = this._eventsElement;
      }

      if (this.outsideAllDay) {
        this.allDayElement = document.createElement('section');
        this.element.appendChild(this.allDayElement);

        this.allDayElement.classList.add(Calendar.Calc.ALLDAY);
        this.allDayElement.classList.add(this.classType);
      }

      // setup/inject elements.
      this.element.appendChild(this._eventsElement);
      this.events.classList.add(this.classType);

      return this.element;
    },

    /** must be overriden */
    _renderEvent: function(busytime, event) {},

    _renderHour: function(hour) {
      return this.template.hour.render({
        displayHour: Calendar.Calc.formatHour(hour),
        hour: String(hour)
      });
    },

    /** public **/

    handleEvent: function(e) {
      switch (e.type) {
        case 'remove':
          this.remove(e.data);
          break;
        case 'add':
          this._loadRecords(e.data);
          break;
      }
    },

    removeHour: function(hour) {
      var record = this.hours.get(hour);

      // skip records that do not exist.
      if (record === null)
        return;

      var el = record.element;

      if (el) {
        el.parentNode.removeChild(el);
      }

      this.hours.remove(hour);
    },

    createHour: function(hour) {
      this.hours.indexOf(hour);

      var len = this.hours.items.length;
      var idx = this.hours.insertIndexOf(hour);

      var html = this._renderHour(hour);
      var parent = this.events;

      if (hour === Calendar.Calc.ALLDAY) {
        parent = this.allDayElement;
      }

      if (!parent)
        throw new Error('parent must be specified');

      var el = this._insertElement(
        html,
        parent,
        this.hours.items,
        idx
      );

      return this.hours.set(hour, {
        element: el,
        records: new OrderedMap(),
        flags: []
      });
    },

    /**
     * Add a busytime to the view.
     *
     * @param {Object} busytime busytime object.
     * @param {Object} event related event object.
     */
    add: function(busytime, event) {
      var hours = hoursOfOccurance(
        this.date,
        busytime.startDate,
        busytime.endDate
      );

      hours.forEach(function(hour) {
        this._createRecord(hour, busytime, event);
      }, this);
    },

    /**
     * Remove a busytime from the view.
     *
     * @param {Object} busytime busytime object.
     */
    remove: function(busytime) {
      var id = busytime._id;
      var hours = this._idsToHours[id];

      delete this._idsToHours[id];

      if (!hours)
        return;

      hours.forEach(function(number) {
        var hour = this.hours.get(number);

        var calendarClass = this.calendarId(busytime);


        // handle flags
        var flags = hour.flags;

        // we need to remove them from the list
        // then check again to see if there
        // are any more...
        var idx = flags.indexOf(calendarClass);

        if (idx !== -1)
          flags.splice(idx, 1);

        // if after we have removed the flag there
        // are no more we can remove the class
        // from the element...
        if (flags.indexOf(calendarClass) === -1) {
          hour.element.classList.remove(calendarClass);
        }

        // XXX: If renderAllHours is false we want to remove
        //      unsed hours.
        if (!this.renderAllHours && hour.records.length === 1) {
          this.removeHour(number);
        }

        var record = hour.records.get(id);

        if (typeof(record) === 'object' && record.element) {
          record.element.parentNode.removeChild(record.element);
        }

        hour.records.remove(id);
      }, this);

      // remove event from tree
      var eventEl = this.overlaps.getElement(busytime);
      if (eventEl) {
        eventEl.parentNode.removeChild(eventEl);
        // remove it from overlaps
        this.overlaps.remove(busytime);
      }

    },

    /**
     * Changes the date the view cares about
     * in reality we only manage one view at
     * a time.
     *
     * @param {Date} date used to calculate events & range.
     * @param {Boolean} clear when true clears out all elements.
     */
    changeDate: function(date, clear) {
      // It is very important that this goes here.
      // If the timespan of the view changes (as in MonthsDay view).
      // We must discard all pending async operations for the old date.
      // we do this by incrementing the "change token" here.
      this._changeToken++;

      var controller = this.controller;

      this._removeTimespanObserver();
      this.id = date.valueOf();
      this.date = Calendar.Calc.createDay(date);
      this.timespan = Calendar.Calc.spanOfDay(date);

      if (this.element) {
        this.element.dataset.date = this.date;
      }

      controller.observeTime(this.timespan, this);

      if (clear) {
        this._resetHourCache();
        // clear out all children
        this.events.innerHTML = '';
      }

      var records = this.controller.queryCache(this.timespan);

      if (records && records.length) {
        this._loadRecords(records);
      }
    },

    /**
     * Creates and returns
     *
     */
    create: function() {
      var el = this._buildElement();

      if (this.renderAllHours) {
        var hour = 0;
        this.createHour('allday');
        for (; hour < 24; hour++) {
          this.createHour(hour);
        }
      }

      this.changeDate(this.date);

      return el;
    },

    activate: function() {
      this.element.classList.add(
        this.activeClass
      );
    },

    deactivate: function() {
      this.element.classList.remove(
        this.activeClass
      );
    },

    /**
     * Remove observers and remove elements
     * from the dom.
     */
    destroy: function() {
      this._removeTimespanObserver();
      var el = this.element;

      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }

  };

  return DayBased;

}());
