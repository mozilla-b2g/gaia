(function(window) {
  'use strict';

  var _ = navigator.mozL10n.get;
  var Calc = Calendar.Calc;

  var DateSpan = Calendar.Template.create({
    time: function() {
      var time = this.arg('time');
      var format = Calc.getTimeL10nLabel(this.h('format'));
      var displayTime = Calendar.App.dateFormat.localeFormat(time, _(format));

      return `<span data-l10n-date-format="${format}"
                data-date="${time}">
                ${displayTime}
              </span>`;
    },

    hour: function() {
      var hour = this.h('hour');
      var format = Calc.getTimeL10nLabel(this.h('format'));
      var className = this.h('className');
      var date = new Date();
      date.setHours(hour, 0, 0, 0);

      var l10nLabel = _(format);
      if (this.arg('addAmPmClass')) {
        l10nLabel =
          l10nLabel.replace(/\s*%p\s*/, '<span class="ampm">%p</span>');
      }
      var displayHour = Calendar.App.dateFormat.localeFormat(date, l10nLabel);

      // remove leading zero
      displayHour = displayHour.replace(/^0/, '');
      var l10n = (hour === Calendar.Calc.ALLDAY) ?
        'data-l10n-id="hour-allday"' :
        `data-l10n-date-format="${format}"`;
      return `<span class="${className}" data-date="${date}" ${l10n}>
                ${displayHour}
              </span>`;
    }
  });

  Calendar.ns('Templates').DateSpan = DateSpan;
}(this));
