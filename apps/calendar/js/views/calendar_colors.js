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

    prefix: 'calendar-id-',

    _initEvents: function() {
      // handle changes in calendar
      var store = Calendar.App.store('Calendar');
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
      var store = Calendar.App.store('Calendar');
      var key;

      for (key in store.cached) {
        this.updateRule(store.cached[key]);
      }
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
      if (item instanceof Calendar.Models.Calendar) {
        return this.prefix + item._id;
      } else {
        return this.prefix + item;
      }
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

      if (id in this.colorMap) {
        map = this._ruleMap[id];
        var bgStyle = map.bg.style;
        var displayStyle = map.display.style;

        bgStyle.backgroundColor = color;

        if (!calendar.localDisplayed) {
          displayStyle.setProperty('display', 'none');
        } else {
          displayStyle.setProperty('display', 'inherit', 'important');
        }

      } else {
        var idx = this._styles.cssRules.length;
        this.colorMap[id] = color;
        map = this._ruleMap[id] = {};

        var bgBlock = '.' + id + '.calendar-color, ';
        bgBlock += '.' + id + ' .calendar-color ';
        bgBlock += '{ background-color: ' + color + '; }';

        this._styles.insertRule(bgBlock, idx);

        map.bg = rules[idx++];

        var displayBlock = '.' + id + '.calendar-display';

        if (!calendar.localDisplayed) {
          displayBlock += '{ display: none; }';
        } else {
          displayBlock += '{ display: inherit; }';
        }

        this._styles.insertRule(
          displayBlock,
          idx
        );

        map.display = rules[idx];
      }
    },

    /**
     * Removes color rule associated
     * with given id.
     */
    removeRule: function(id) {
      id = this.getId(id);
      if (id in this.colorMap) {
        delete this.colorMap[id];

        var idx = this._ruleMap[id];
        delete this._ruleMap[id];
        this._styles.deleteRule(idx);
      }
    }

  };

  return Colors;

}());
