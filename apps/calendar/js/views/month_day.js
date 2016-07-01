define(function(require, exports, module) {
'use strict';

var Calc = require('common/calc');
var core = require('core');

// MonthDay represents a single day inside the Month view grid.
function MonthDay(options) {
  this.container = options.container;
  this.date = options.date;
  this.month = options.month;
  this._updateBusyCount = this._updateBusyCount.bind(this);
}
module.exports = MonthDay;

MonthDay.prototype = {

  container: null,
  date: null,
  element: null,
  month: null,
  _observer: null,

  create: function() {
    var dayId = Calc.getDayId(this.date);
    var id = 'month-view-day-' + dayId;
    var state = Calc.relativeState(this.date, this.month);
    var l10nStateId = state.replace(/\s/g, '-');
    var date = this.date.getDate();

    // we don't care about future/past states for l10n unless it's on
    // a different month (Bug 1092729)
    if (l10nStateId === 'future' || l10nStateId === 'past') {
      l10nStateId = '';
    } else {
      l10nStateId += '-description';
    }

    var el = document.createElement('li');
    el.setAttribute('role', 'gridcell');
    el.id = id;
    el.tabindex = 0;
    el.setAttribute(
      'aria-describedby',
      `${id}-busy-indicator ${id}-description`
    );
    el.dataset.date = dayId;
    el.className = state;
    el.classList.add('month-day');
    el.innerHTML = `<span class="day" role="button">${date}</span>
      <div id="${id}-busy-indicator" class="busy-indicator"
        aria-hidden="true"></div>
      <span id="${id}-description" aria-hidden="true"
        data-l10n-id="${l10nStateId}"></span>`;

    this.element = el;
    this.container.appendChild(el);
  },

  activate: function() {
    this._observer = core.bridge.observeDay(this.date);
    this._observer.listen(this._updateBusyCount);
  },

  deactivate: function() {
    this._observer && this._observer.cancel();
  },

  destroy: function() {
    this.deactivate();
    this.container = this.element = null;
  },

  _updateBusyCount: function(data) {
    var count = Math.min(3, data.amount);
    var holder = this.element.querySelector('.busy-indicator');

    if (count > 0) {
      holder.setAttribute('data-l10n-id', 'busy');
      holder.setAttribute('data-l10n-args', JSON.stringify({n: count}));
    } else {
      holder.removeAttribute('data-l10n-id');
      holder.removeAttribute('data-l10n-args');
    }

    var diff = count - holder.childNodes.length;
    if (diff === 0) {
      return;
    }

    if (diff > 0) {
      var dot;
      while (diff--) {
        dot = document.createElement('div');
        dot.className = 'gaia-icon icon-calendar-dot';
        holder.appendChild(dot);
      }
      return;
    }

    // difference < 0
    while (diff++) {
      holder.removeChild(holder.firstChild);
    }
  }
};

});
