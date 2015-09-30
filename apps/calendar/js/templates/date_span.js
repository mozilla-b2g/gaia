define(function(require, exports, module) {
'use strict';

var Calc = require('common/calc');
var IntlHelper = require('shared/intl_helper');
var create = require('template').create;

module.exports = create({
  time: function() {
    var time = this.arg('time');
    var format = this.h('format');

    var formatter = IntlHelper.get(format);
    var displayTime = formatter.format(time);

    return `<span data-l10n-date-format="${format}"
                  data-date="${time}">${displayTime}</span>`;
  },

  hour: function() {
    var hour = this.h('hour');
    var format = this.h('format');
    var className = this.h('className');
    // 0ms since epoch as base date to avoid issues with daylight saving time
    var date = new Date(0);
    date.setHours(hour, 0, 0, 0);

    var displayHour;
    var formatter = IntlHelper.get(format);

    if (this.arg('addAmPmClass')) {
      displayHour = formatter.format(date, {
        dayperiod: '<span class="ampm" aria-hidden="true">$&</span>',
      });
    } else {
      displayHour = formatter.format(date);
    }

    var l10nAttr = (hour === Calc.ALLDAY) ?
      'data-l10n-id="hour-allday"' :
      `data-l10n-date-format="${format}"`;
    return `<span class="${className}" data-date="${date}" 
      ${l10nAttr}>${displayHour}</span>`;
  }
});

});
