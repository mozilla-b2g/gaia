define(function(require, exports, module) {
'use strict';

var Calc = require('calc');
var View = require('view');
var nextTick = require('next_tick');

function ViewSelector(opts) {
  View.call(this, opts);
}
module.exports = ViewSelector;

ViewSelector.prototype = {
  __proto__: View.prototype,

  selectors: {
    element: '#view-selector'
  },

  render: function() {
    this._syncTodayDate();
    this.delegate(this.element, 'click', 'a', this);
  },

  handleEvent: function(event, target) {
    if (target.matches('[role="tab"]')) {
      this._toggleActiveTabOnClick(event);
    } else {
      this._moveToTodayOnClick(event);
    }
  },

  _moveToTodayOnClick: function(event) {
    var date = new Date();
    this.app.timeController.move(date);
    this.app.timeController.selectedDay = date;

    event.preventDefault();
  },

  // FIXME: this should be handled by the router (Bug 1021445)
  // Handle aria-selected attribute for tabs.
  _toggleActiveTabOnClick: function(event) {
    var tabs = this.element.querySelectorAll('[role="tab"]');
    Array.from(tabs).forEach(tab => {
      if (tab !== event.target) {
        tab.setAttribute('aria-selected', false);
        return;
      }
      nextTick(() => tab.setAttribute('aria-selected', true));
    });
  },

  _showTodayDate: function() {
    var icon = this.element.querySelector('.icon-calendar-today');
    icon.innerHTML = (new Date()).getDate();
  },

  // FIXME: this should be handled by month view after we fix Bug 1118850
  _setPresentDate: function() {
    var id = Calc.getDayId(new Date());
    var presentDate = document.querySelector(
      '#month-view [data-date="' + id + '"]'
    );
    var previousDate = document.querySelector('#month-view .present');

    if (previousDate) {
      previousDate.classList.remove('present');
      previousDate.classList.add('past');
    }
    if (presentDate) {
      presentDate.classList.add('present');
    }
  },

  // FIXME: this should be replaced when we abstract the way we listen for
  // date/time changes (Bug 1118850)
  _syncTodayDate: function() {
    this._showTodayDate();
    this._setPresentDate();

    var now = new Date();
    var midnight = new Date(
      now.getFullYear(), now.getMonth(), now.getDate() + 1,
      0, 0, 0
    );

    var timeout = midnight.getTime() - now.getTime();
    setTimeout(() => {
      this._syncTodayDate();
    }, timeout);
  }
};

});
