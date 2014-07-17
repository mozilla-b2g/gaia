define(function(require) {
  'use strict';

  var Template = require('template');
  var LocalProvider = require('provider/local');

  var Cal = Template.create({
    item: function() {
      var id = this.h('_id');
      var l10n = '';
      var name = '';

      // hack localize the only default calendar
      if (id && LocalProvider.calendarId === id) {
        // localize the default calendar name
        l10n = 'data-l10n-id="calendar-local"';
        name = navigator.mozL10n.get('calendar-local');
      } else {
        name = this.h('name');
      }

      return '<li id="calendar-' + id + '" class="calendar-id-' + id + '">' +
          '<div class="gaia-icon icon-calendar-dot calendar-text-color">' +
          '</div>' +
          '<label class="pack-checkbox">' +
            '<input ' +
              'value="' + id + '" ' +
              'type="checkbox" ' +
              this.bool('localDisplayed', 'checked') + ' />' +
            '<span ' + l10n + ' class="name">' + name + '</span>' +
          '</label>' +
        '</li>';
    }
  });

  return Cal;

});
