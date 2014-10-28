define(function(require, exports, module) {
'use strict';

var create = require('template').create;
var dateFormat = require('date_format');

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

var Alarm = create({
  reminder: function() {
    var alarmContent = '';
    var alarms = this.arg('alarms');
    var isAllDay = this.arg('isAllDay');

    var i = 0;
    var alarm;
    while ((alarm = alarms[i])) {
      i++;
      alarmContent += Alarm.description.render({
        trigger: alarm.trigger,
        layout: isAllDay ? 'allday' : 'standard'
      });
    }

    return alarmContent;
  },

  description: function() {
    var {id, data} = getL10n(this.arg('trigger'), this.arg('layout'));
    var args = JSON.stringify(data);
    var description = navigator.mozL10n.get(id, data);

    return `<div role="listitem" data-l10n-id="${id}"
      data-l10n-args=\'${args}\'>
        ${description}
      </div>`;
  },

  // builds a list of <option>
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
      selected = false;

      // trigger option 'selected' by normalizing imported dates
      if (layout === 'allday') {
        if (options[i] === (trigger + MORNING)) {
          trigger += MORNING;
        }
      }

      if (!selected && trigger && options[i] === trigger) {
        selected = true;
        foundSelected = true;
      }

      content += Alarm.option.render({
        selected: selected,
        layout: layout,
        value: options[i]
      });
    }

    // foundSelected is used in cases where user is editing an event that has
    // a custom reminder value (X minutes/hours/days before event) and that
    // is an option that we don't support internally on the calendar app.
    // we always add a new <option> using the custom value and mark it as
    // selected.
    if (!foundSelected && /^-?\d+$/.test(trigger)) {
      content += Alarm.option.render({
        selected: true,
        layout: layout,
        value: trigger
      });
    }

    return content;
  },

  option: function() {
    var _ = navigator.mozL10n.get;

    var layout = this.arg('layout');
    var value = this.arg('value');
    var selected = this.arg('selected');

    var l10n = getL10n(value, layout);

    var content = [
      '<option',
      'value="' + value + '"',
      (selected ? 'selected' : ''),
      'data-l10n-id="' + l10n.id + '"',
      'data-l10n-args=\'' + JSON.stringify(l10n.data) + '\'>',
      _(l10n.id, l10n.data) + '</option>'
    ].join(' ');

    return content;
  },

  picker: function() {
    return '<span class="button icon icon-dialog">' +
      '<select name="alarm[]">' +
        Alarm.options.render(this.data) +
      '</select>' +
    '</span>';
  }
});

function getL10n(trigger, layout) {
  if (trigger === 'none') {
    return {
      id: trigger,
      data: {}
    };
  }

  // Format the display text based on a zero-offset trigger
  if (layout === 'allday') {
    var options = layouts.allday;
    if (options.indexOf(trigger) !== -1) {
      trigger -= MORNING;
    }
  }

  if (trigger === 0) {
    return {
      id: 'alarm-at-event-' + layout,
      data: {}
    };
  }

  var affix = trigger > 0 ? 'after' : 'before';
  var parts = dateFormat.relativeParts(trigger);

  for (var i in parts) {
    // we only use the first part (biggest value)
    return {
      id: i + '-' + affix,
      data: {
        value: parts[i]
      }
    };
  }
}
module.exports = Alarm;

});
