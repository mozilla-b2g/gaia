/* globals Calendar */
Calendar.ns('Views').TimeHeader = (function() {
  'use strict';

  var SETTINGS = /settings/;

  function TimeHeader() {
    Calendar.View.apply(this, arguments);
    this.controller = this.app.timeController;
    this.controller.on('scaleChange', this);

    this.settings.addEventListener('click', function settingsClick(e) {
      e.stopPropagation();
      var path = window.location.pathname;
      if (SETTINGS.test(path)) {
        Calendar.App.resetState();
      } else {
        Calendar.App.router.show('/settings/');
      }
    });
  }

  TimeHeader.prototype = {
    __proto__: Calendar.View.prototype,

    selectors: {
      element: '#time-header',
      title: '#time-header h1',
      settings: '#time-header .settings'
    },

    scales: {
      month: 'month-view-header-format',
      day: 'day-view-header-format',
      // when week starts in one month and ends
      // in another, we need both of them
      // in the header
      multiMonth: 'multi-month-view-header-format'
    },

    handleEvent: function(e) {
      // respond to all events here but
      // we add/remove listeners to reduce
      // calls
      switch (e.type) {
        case 'yearChange':
        case 'monthChange':
        case 'dayChange':
        case 'weekChange':
          this._updateTitle();
          break;
        case 'scaleChange':
          this._updateScale.apply(this, e.data);
          break;
      }
    },

    get settings() {
      return this._findElement('settings');
    },

    get title() {
      return this._findElement('title');
    },

    _scaleEvent: function(event) {
      switch (event) {
        case 'month':
          return 'monthChange';
        case 'year':
          return 'yearChange';
        case 'week':
          return 'weekChange';
      }

      return 'dayChange';
    },

    _updateScale: function(newScale, oldScale) {
      if (oldScale) {
        this.controller.removeEventListener(
          this._scaleEvent(oldScale),
          this
        );
      }

      this.controller.addEventListener(
        this._scaleEvent(newScale),
        this
      );

      this._updateTitle();
    },

    getScale: function(type) {
      // If we are creating header for the week view
      if (type === 'week') {
        var scale = '';
        var firstWeekday = this.controller.position;
        // We check if current week ends in the current month.
        // We check only 5 days ahead (so even if last two days
        // are in the next month we don't care about that - we have
        // only 5 days visible, and it looks odd when for example we
        // have Sep 26-30 because 31 & Oct 1 are hidden, and
        // we use "Sep 2012 Oct 2012" as a header).
        var lastWeekday = new Date(
                firstWeekday.getFullYear(),
                firstWeekday.getMonth(),
                firstWeekday.getDate() + 4
              );
        if (firstWeekday.getMonth() !== lastWeekday.getMonth()) {
          scale = this._localeFormat(firstWeekday, 'multiMonth') + ' ' +
            this._localeFormat(lastWeekday, 'multiMonth');
        } else {
          scale = this._localeFormat(lastWeekday, 'month');
        }
        return scale;
      }

      return this._localeFormat(this.controller.position, type || 'month');
    },

    _localeFormat: function(date, scale) {
      return this.app.dateFormat.localeFormat(
        date,
        navigator.mozL10n.get(this.scales[scale])
      );
    },

    _updateTitle: function() {
      var con = this.app.timeController;
      var title = this.title;

      title.dataset.l10nDateFormat =
        this.scales[con.scale] || this.scales.month;

      title.dataset.date = con.position.toString();

      title.textContent = this.getScale(
        con.scale
      );
    },

    render: function() {
      this._updateScale(this.controller.scale);
    }
  };

  return TimeHeader;
}());
