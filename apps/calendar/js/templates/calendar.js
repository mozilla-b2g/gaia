define(function(require, exports, module) {
'use strict';

var create = require('template').create;
var localCalendarId = require('common/constants').localCalendarId;

module.exports = create({
  item: function() {
    var id = this.h('_id');
    var color = this.h('color');
    var l10n = '';
    var name = '';

    // localize only the default calendar; there is no need to set the name
    // the [data-l10n-id] will take care of setting the proper value
    if (id && localCalendarId === id) {
      // localize the default calendar name
      l10n = 'data-l10n-id="calendar-local"';
    } else {
      name = this.h('name');
    }

    var checked = this.bool('localDisplayed', 'checked');

    return `<li id="calendar-${id}" role="presentation">
        <div class="gaia-icon icon-calendar-dot" style="color:${color}"
             aria-hidden="true"></div>
        <gaia-checkbox class="invisible" value="${id}" ${checked}/>
          <label ${l10n} class="name" dir="auto">${name}</label>
        </gaia-checkbox>
      </li>`;
  }
});

});
