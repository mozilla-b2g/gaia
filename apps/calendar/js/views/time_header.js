define(function(require, exports, module) {
'use strict';

var View = require('view');
var core = require('core');
var dateFormat = require('date_format');
var router = require('router');

var SETTINGS = /settings/;

function TimeHeader() {
  View.apply(this, arguments);
  this.controller = core.timeController;
  this.controller.on('scaleChange', this);

  this.element.addEventListener('action', (e) => {
    e.stopPropagation();
    var path = window.location.pathname;
    if (SETTINGS.test(path)) {
      router.resetState();
    } else {
      router.show('/settings/');
    }
  });
}
module.exports = TimeHeader;

TimeHeader.prototype = {
  __proto__: View.prototype,

  selectors: {
    element: '#time-header',
    title: '#time-header h1'
  },

  scales: {
    month: 'multi-month-view-header-format',
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
    var position = this.controller.position;
    if (type === 'week') {
      var lastWeekday = this._getLastWeekday();
      if (position.getMonth() !== lastWeekday.getMonth()) {
        // when displaying dates from multiple months we use a different
        // format to avoid overflowing
        return this._localeFormat(position, 'multiMonth') + ' ' +
          this._localeFormat(lastWeekday, 'multiMonth');
      }
      // if it isn't "multiMonth" we use "month" instead
      type = 'month';
    }

    return this._localeFormat(position, type || 'month');
  },

  _getLastWeekday: function(){
    // we display 5 days at a time, controller.position is always the day on
    // the left of the view
    var position = this.controller.position;
    return new Date(
      position.getFullYear(),
      position.getMonth(),
      position.getDate() + 4
    );
  },

  _localeFormat: function(date, scale) {
    return dateFormat.localeFormat(
      date,
      navigator.mozL10n.get(this.scales[scale])
    );
  },

  _updateTitle: function() {
    var con = core.timeController;
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

});
