(function(window) {

  var MINUTE = 60;
  var HOUR = 3600;
  var DAY = 86400;
  var WEEK = 604800;

  var layouts = {
    standard: [
      'none',
      0,
      0 - MINUTE * 5,
      0 - MINUTE * 15,
      0 - MINUTE * 30,
      0 - HOUR,
      0 - HOUR * 2,
      0 - DAY
    ],
    allday: [
      'none',
      0,
      0 - DAY,
      0 - DAY * 2,
      0 - WEEK,
      0 - WEEK * 2
    ]
  };

  var Alarm = Calendar.Template.create({

    /**
     * Generates a human readable form of an alarm
     * based on the relative time to that alarm.
     */
    description: function() {

      var description;
      var trigger = this.arg('trigger');
      var _ = navigator.mozL10n.get;

      if (trigger != 'none') {
        trigger = Math.abs(trigger);
      }

      function translate(unit, name) {
        var value = Math.round(trigger / unit);
        var key = 'alarm-' + name + (value > 1 ? 's' : '') + '-before';
        return _(key, {value: value});
      }

      if (trigger == 'none')
        description = _('none');
      else if (trigger == 0)
        description = _('alarm-at-event-' + this.arg('layout'));
      else if (trigger < HOUR)
        description = translate(MINUTE, 'minute');
      else if (trigger < DAY)
        description = translate(HOUR, 'hour');
      else if (trigger < WEEK)
        description = translate(DAY, 'day');
      else
        description = translate(WEEK, 'week');

      return description;
    },

    options: function() {
      var content = '';
      var selected;
      var foundSelected = false;

      var trigger = this.arg('trigger');
      var layout = this.arg('layout') || 'standard';
      var options = layouts[layout];

      var i = 0;
      var iLen = options.length;

      for (; i < iLen; i++) {
        selected = '';
        if (!selected && trigger && options[i] == trigger) {
          selected = ' selected';
          foundSelected = true;
        }

        content += '<option value="' + options[i] + '"' + selected + '>' +
          Calendar.Templates.Alarm.description.render({
            trigger: options[i],
            layout: layout
          }) +
        '</option>';
      }

      if (!foundSelected && /^-?\d+$/.test(trigger)) {
        content += '<option value="' + trigger + '" selected>' +
          Calendar.Templates.Alarm.description.render({
            trigger: trigger,
            layout: layout
          }) +
        '</option>';
      }

      return content;
    },

    picker: function() {
      return '<span class="button icon icon-dialog">' +
        '<select name="alarm[]">' +
          Calendar.Templates.Alarm.options.render(this.data) +
        '</select>' +
      '</span>';
    }
  });

  Calendar.ns('Templates').Alarm = Alarm;
}(this));
