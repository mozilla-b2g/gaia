define(function(require, exports, module) {
'use strict';

var create = require('template').create;

module.exports = create({
  busy: function() {
    return '<span class="' +
              'busytime-' + this.h('_id') +
              ' busy-length-' + this.h('length') +
              ' busy-' + this.h('start') +
              ' calendar-id-' + this.h('calendarId') + '">' +
            '&nbsp;' +
          '</span>';
  },

  weekDaysHeader: function() {
    return '<header id="month-days" role="presentation">' +
        '<ol role="row">' +
          this.s('value') +
        '</ol>' +
      '</header>';
  },

  weekDaysHeaderDay: function() {
    return '<li data-l10n-id="' + this.h('l10n') + '" role="columnheader">' +
        this.h('dayName') +
      '</li>';
  },

  week: function() {
    return '<ol role="row">' +
        this.s('value') +
      '</ol>';
  },

  day: function() {
    var date = this.h('date');
    var dateString = this.s('dateString');
    var id = this.s('id');
    var l10nStateId = this.l10nId('state');
    var state = this.s('state');

    return `<li role="gridcell" tabindex="0" id="${id}"
      aria-describedby="${id}-busy-indicator ${id}-description"
      data-date="${dateString}" class="${state}">
        <span class="day" role="button">${date}</span>
        <div id="${id}-busy-indicator"
          class="busy-indicator" aria-hidden="true"></div>
        <span id="${id}-description" aria-hidden="true"
          data-l10n-id="${l10nStateId}"></span>
      </li>`;
  }
});

});
