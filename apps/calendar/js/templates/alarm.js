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
      if (trigger != 'none') {
        trigger = Math.abs(trigger);
      }

      function translate(unit, name) {
        var value = Math.round(trigger / unit);
        var key = 'alarm-' + name + (value > 1 ? 's' : '') + '-before';
        return navigator.mozL10n.get(key, {value: value});
      }

      if (trigger == 'none')
        description = navigator.mozL10n.get('none');
      else if (trigger == 0)
        description = navigator.mozL10n.get('alarm-at-event-standard');
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
      var options = layouts[this.arg('layout') || 'standard'];

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
            trigger: options[i]
          }) +
        '</option>';
      }

      if (!foundSelected && /^-?\d+$/.test(trigger)) {
        content += '<option value="' + trigger + '" selected>' +
          Calendar.Templates.Alarm.description.render({
            trigger: trigger
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
