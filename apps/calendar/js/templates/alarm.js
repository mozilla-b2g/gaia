(function(window) {

  var MINUTE = 60;
  var HOUR = 3600;
  var DAY = 86400;
  var WEEK = 604800;
  var MORNING = HOUR * 9;

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
      0 + MORNING,
      0 - DAY + MORNING,
      0 - DAY * 2 + MORNING,
      0 - WEEK + MORNING,
      0 - WEEK * 2 + MORNING
    ]
  };

  var Alarm = Calendar.Template.create({

    /**
     * Generates a human readable form of an alarm
     * based on the relative time to that alarm.
     */
    description: function() {

      var description = '';
      var trigger = this.arg('trigger');
      var _ = navigator.mozL10n.get;

      if (trigger == 'none') {
        return _('none');
      }

      // Format the display text based on a zero-offset trigger
      if (this.arg('layout') == 'allday') {
        var options = layouts['allday'];
        if (options.indexOf(trigger) !== -1) {
          trigger -= MORNING;
        }
      }

      if (trigger == 0) {
        description = _('alarm-at-event-' + this.arg('layout'));
      } else {
        var affix = trigger > 0 ? 'after' : 'before';
        var parts = Calendar.App.dateFormat.relativeParts(trigger);

        for (var i in parts) {
          description += _(i + '-' + affix, {value: parts[i]});
          // For now only display the first time part that we get
          break;
        }
      }

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

        //trigger option 'selected' by normalizing imported dates
        if (layout == 'allday') {
          if (options[i] == (trigger + MORNING)) {
            trigger += MORNING;
          }
        }

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
