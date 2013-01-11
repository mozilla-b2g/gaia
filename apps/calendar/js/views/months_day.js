Calendar.ns('Views').MonthsDay = (function() {

  var Parent = Calendar.Views.DayChild;

  function MonthsDay() {
    Parent.apply(this, arguments);
  }

  MonthsDay.prototype = {
    __proto__: Parent.prototype,

    selectors: {
      element: '#months-day-view',
      events: '.day-events',
      header: '.day-title'
    },

    get element() {
      return this._findElement('element');
    },

    get events() {
      return this._findElement('events');
    },

    get allDayElement() {
      return this.events;
    },

    get header() {
      return this._findElement('header');
    },

    _initEvents: function() {
      var self = this;
      this.controller.on('selectedDayChange', this);
      this.delegate(this.events, 'click', '[data-id]', function(e, target) {
        Calendar.App.router.show('/event/' + target.dataset.id + '/');
      });
    },

    _updateHeader: function() {
      var header = this.header;
      var formatName = 'agenda-date-format';
      var template = navigator.mozL10n.get(formatName);

      // maybe we should localize this output ?
      var format = this.app.dateFormat.localeFormat(
        this.date,
        template || '%A %e %B %Y'
      );

      header.textContent = format;
      header.dataset.date = this.date.toString();
      header.dataset.l10nDateFormat = formatName;
    },

    handleEvent: function(e) {
      Parent.prototype.handleEvent.apply(this, arguments);

      switch (e.type) {
        case 'selectedDayChange':
          this.changeDate(e.data[0], true);
          this._updateHeader();
          break;
      }
    },

    create: function() {},

    render: function() {
      this._initEvents();
      var date = Calendar.Calc.createDay(new Date());
      this.changeDate(date);
      this._updateHeader();
    }
  };

  MonthsDay.prototype.onfirstseen =
    MonthsDay.prototype.render;

  return MonthsDay;

}());
