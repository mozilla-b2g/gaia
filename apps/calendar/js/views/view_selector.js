define(function(require, exports, module) {
'use strict';

var View = require('view');
var nextTick = require('next_tick');
var timeObserver = require('time_observer');

function ViewSelector(opts) {
  View.call(this, opts);
  this._showTodayDate = this._showTodayDate.bind(this);
}
module.exports = ViewSelector;

ViewSelector.prototype = {
  __proto__: View.prototype,

  selectors: {
    element: '#view-selector'
  },

  render: function() {
    this._showTodayDate();
    this.delegate(this.element, 'click', 'a', this);
    timeObserver.on('day', this._showTodayDate);
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
  }
};

});
