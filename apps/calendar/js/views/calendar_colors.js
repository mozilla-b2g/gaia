define(function(require) {
  'use strict';

  var Parent = require('view');
  var app = require('app');
  var CalendarModel = require('models/calendar');

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
    __proto__: Parent.prototype,

    _initEvents: function() {
      // handle changes in calendar
      var store = app.store('Calendar');
      store.on('persist', this);
      store.on('remove', this);
    },

    handleEvent: function(e) {
      switch (e.type) {
        case 'persist':
          // 1 is the model
          this.updateRule(e.data[1]);
          break;
        case 'remove':
          // 0 is an id of a model
          this.removeRule(e.data[0]);
          break;
      }
    },

    render: function() {
      var calendarStore = app.store('Calendar');

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
      if (item instanceof CalendarModel) {
        id = item._id;
      } else {
        id = item;
      }
      return this.calendarId(String(id));
    },

    /**
     * associates a color with a
     * calendar/calendar id with a color.
     *
     * @param {Calendar.Model.Calendar} calendar model.
     */
    updateRule: function(calendar) {
      var id = this.getId(calendar);
      var method = id in this.colorMap ? '_updateRules' : '_createRules';
      this[method](calendar, id, calendar.color);
    },

    _updateRules: function(calendar, id, color) {
      var map = this._ruleMap[id];

      var bgStyle = map.background.style;
      var borderStyle = map.border.style;
      var textStyle = map.text.style;

      bgStyle.backgroundColor = this._hexToBackgroundColor(color);
      borderStyle.borderColor = color;
      textStyle.color = color;
    },

    _createRules: function(calendar, id, color) {
      // We need to store the ids of created rules for deletion later on.
      var map = this._ruleMap[id] = {
        ruleIds: []
      };
      this.colorMap[id] = color;

      // calendar coloring
      var bg = 'background-color: ' + this._hexToBackgroundColor(color) + ';';
      map.background = this._insertRule(id, 'calendar-bg-color', bg);

      var border = 'border-color: ' + color + ';';
      map.border = this._insertRule(id, 'calendar-border-color', border);

      var textColor = 'color: ' + color + ';';
      map.text = this._insertRule(id, 'calendar-text-color', textColor);
    },

    _hexToBackgroundColor: function(hex) {
      // we need 20% opacity for background; it's simpler to use rgba than to
      // create a new layer and set opacity:20%
      var rgb = this._hexToChannels(hex);
      return 'rgba(' +
        rgb.r + ',' +
        rgb.g + ',' +
        rgb.b + ', 0.2)';
    },

    _hexToChannels: function(hex) {
      hex = hex.replace(/#/, '');
      // we slice in case calendar hex also includes opacity (#rrggbbaa)
      hex = hex.slice(0, 6);
      if (hex.length === 3) {
        // expand "abc" into "aabbcc"
        hex = hex.replace(/(\w)/g, '$1$1');
      }
      var val = parseInt(hex, 16);
      return {
        r: val >> 16,
        g: val >> 8 & 0xFF,
        b: val & 0xFF
      };
    },

    _insertRule: function(calendarId, className, body) {
      // affects root element and child elements as well
      var block = ('.%calId.%className, .%calId .%className { %body }')
        .replace(/%calId/g, calendarId)
        .replace(/%className/g, className)
        .replace(/%body/g, body);

      // increment index for rule...
      var ruleId = this._styles.cssRules.length;
      this._styles.insertRule(block, ruleId);

      // store the rule into cache
      var map = this._ruleMap[calendarId];
      map.ruleIds.push(ruleId);

      return this._styles.cssRules[ruleId];
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

});
