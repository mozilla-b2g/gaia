(function(window) {
  'use strict';

  var LocalProvider = Calendar.Provider.Local;
  var Template = Calendar.Template;

  var Cal = Template.create({
    item: function() {
      var id = this.h('_id');
      var l10n = '';
      var name = '';

      // localize only the default calendar; there is no need to set the name,
      // the [data-l10n-id] will take care of setting the proper value
      if (id && LocalProvider.calendarId === id) {
        l10n = 'data-l10n-id="calendar-local"';
      } else {
        name = this.h('name');
      }

      var checked = this.bool('localDisplayed', 'checked');

      return `<li id="calendar-${id}" class="calendar-id-${id}">
          <div class="gaia-icon icon-calendar-dot calendar-text-color"></div>
          <label class="pack-checkbox">
            <input value="${id}" type="checkbox" ${checked} />
            <span ${l10n} class="name">${name}</span>
          </label>
        </li>`;
    }
  });

  Calendar.ns('Templates').Calendar = Cal;

}(this));

