Calendar.ns('Views').CalendarColors = (function() {

  function Colors() {
    this.colorMap = Object.create(null);
    this._ruleMap = Object.create(null);

    // create style sheet for us to play with
    var sheet = document.createElement('style');
    sheet.type = 'text/css';
    sheet.id = '_dynamic-calendar-styles';

    document.head.appendChild(sheet);

    this._styles = document.styleSheets[document.styleSheets.length - 1];
    this._initEvents();
  }

  Colors.prototype = {
    __proto__: Calendar.View.prototype,

    _initEvents: function() {
      // handle changes in calendar
      var store = Calendar.App.store('Calendar');
      store.on('persist', this);
      store.on('remove', this);
      store.on('preRemove', this);
    },

    handleEvent: function(e) {
      switch (e.type) {
        case 'persist':
          // 1 is the model
          this.updateRule(e.data[1]);
          break;
        case 'preRemove':
          this.hideCalendar(e.data[0]);
          break;
        case 'remove':
          // 0 is an id of a model
          this.removeRule(e.data[0]);
          break;
      }
    },

    render: function() {
      var calendarStore = Calendar.App.store('Calendar');

      calendarStore.all(function(err, calendars) {
        if (err) {
          console.log('Error fetch calendars in CalendarColors');
        }

        var id;
        for (id in calendars) {
          this.updateRule(calendars[id]);
        }

        if (this.onrender) {
          this.onrender();
        }

      }.bind(this));

    },

    /**
     * Returns prefixed calendar id used
     * in css classes, etc...
     *
     * Uses _id field when given a model
     *
     * @param {Calendar.Models.Calendar|String} item model or string.
     */
    getId: function(item) {
      var id;
      if (item instanceof Calendar.Models.Calendar) {
        id = item._id;
      } else {
        id = item;
      }
      return this.calendarId(String(id));
    },

    hideCalendar: function(id) {
      this.updateRule({
        _id: id,
        localDisplayed: false,
        color: '#CCC'
      });
    },

    /**
     * associates a color with a
     * calendar/calendar id with a color.
     *
     * @param {Calendar.Model.Calendar} calendar model.
     */
    updateRule: function(calendar) {
      var id = this.getId(calendar);
      var styles = this.colorMap[id];
      var color = calendar.color;
      var rules = this._styles.cssRules;
      var map;

      // Check for an existing color rule
      if (id in this.colorMap) {

        // when found we can simply mutate
        // the properties on the rules.
        map = this._ruleMap[id];

        var bgStyle = map.bg.style;
        var displayStyle = map.display.style;

        bgStyle.backgroundColor = color;
        bgStyle.borderColor = color;

        if (!calendar.localDisplayed) {
          displayStyle.setProperty('display', 'none');
        } else {
          displayStyle.setProperty('display', 'inherit', 'important');
        }

      } else {

        // increment index for rule...
        var ruleId = this._styles.cssRules.length;

        // We need to store the ids of created
        // rules for deletion later on.
        var ruleIds = [ruleId, ruleId + 1];
        this.colorMap[id] = color;

        map = this._ruleMap[id] = {
          ruleIds: ruleIds
        };

        // calendar coloring
        var bgBlock = '.' + id + '.calendar-color ';
        bgBlock += '{';
        // some visual elements like busy bars work better with background
        bgBlock += '  background-color: ' + color + ';';
        // others like the event views work better with borders
        bgBlock += '  border-color: ' + color + ';';
        bgBlock += '}';

        // insert rule save it for later so we don't
        // need to lookup the id
        // XXX: Better to not save the rule definition?
        this._styles.insertRule(bgBlock, ruleId);
        map.bg = rules[ruleId];

        // Increment the rule id so we can
        // use the incremented value for the next rule.
        ruleId += 1;

        var displayBlock = '.' + id + '.calendar-display';

        if (!calendar.localDisplayed) {
          displayBlock += '{ display: none; }';
        } else {
          displayBlock += '{ display: inherit; }';
        }

        this._styles.insertRule(
          displayBlock,
          ruleId
        );

        map.display = rules[ruleId];
      }
    },

    /**
     * CSSRuleList is a zero based array like
     * object. When we remove an item from
     * the rule list we need to adjust the saved indexes
     * of all values above the one we are removing.
     */
    _adjustRuleIds: function(above) {
      var key;

      function subtract(item) {

        if (item > above) {
          return item - 1;
        }
        return item;
      }

      for (key in this._ruleMap) {
        var map = this._ruleMap[key];
        map.ruleIds = map.ruleIds.map(subtract);
      }
    },

    /**
     * Removes color rule associated
     * with given id.
     */
    removeRule: function(id) {
      var map;

      var idOffset = 0;

      id = this.getId(id);
      if (id in this.colorMap) {
        delete this.colorMap[id];
        map = this._ruleMap[id];
        delete this._ruleMap[id];

        map.ruleIds.forEach(function(idx) {
          this._adjustRuleIds(idx);
          idx = idx - idOffset;

          // XXX: this is probably a slow way to do this
          // but given this will only happen when a calendar
          // is removed it should be fine.
          this._styles.deleteRule(idx);
          idOffset += 1;
        }, this);
      }
    }

  };

  return Colors;

}());
