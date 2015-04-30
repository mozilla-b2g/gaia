define(function(require, exports, module) {
'use strict';

var Calc = require('common/calc');
var create = require('template').create;
var dateFormat = require('date_format');

var l10n = navigator.mozL10n;

module.exports = create({
  time: function() {
    var time = this.arg('time');
    var format = Calc.getTimeL10nLabel(this.h('format'));
    var displayTime = dateFormat.localeFormat(time, l10n.get(format));

    return `<span data-l10n-date-format="${format}"
                  data-date="${time}">${displayTime}</span>`;
  },

  hour: function() {
    var hour = this.h('hour');
    var format = Calc.getTimeL10nLabel(this.h('format'));
    var className = this.h('className');
    // 0ms since epoch as base date to avoid issues with daylight saving time
    var date = new Date(0);
    date.setHours(hour, 0, 0, 0);

    var l10nLabel = l10n.get(format);
    if (this.arg('addAmPmClass')) {
      l10nLabel = l10nLabel.replace(
        /\s*%p\s*/,
        '<span class="ampm" aria-hidden="true">%p</span>'
      );
    }

    var displayHour = dateFormat.localeFormat(date, l10nLabel);
    // remove leading zero
    displayHour = displayHour.replace(/^0/, '');
    var l10nAttr = (hour === Calc.ALLDAY) ?
      'data-l10n-id="hour-allday"' :
      `data-l10n-date-format="${format}"`;
    return `<span class="${className}" data-date="${date}" ${l10nAttr}>
              ${displayHour}
            </span>`;
  }
});

});
