(function(window) {

  var Cal = Calendar.Template.create({
    item: function() {
      var id = this.h('_id');
      var l10n = '';

      // hack localize the only default calendar
      if (id && Calendar.Provider.Local.calendarId === id) {
        // localize the default calendar name
        l10n = 'data-l10n-id="calendar-local"';
      }

      return '<li id="calendar-' + id + '">' +
          '<div class="calendar-id-' + id + ' calendar-color"></div>' +
          '<label class="pack-checkbox">' +
            '<input ' +
              'value="' + id + '" ' +
              'type="checkbox" ' +
              this.bool('localDisplayed', 'checked') + ' />' +
            '<span ' + l10n + ' class="name">' + this.h('name') + '</span>' +
          '</label>' +
        '</li>';
    }
  });

  Calendar.ns('Templates').Calendar = Cal;

}(this));

