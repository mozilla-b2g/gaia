'use strict';

/* globals addMixin, DetailsViewMixin, DebugMixin */
/* exported AppletDetailsView */

(function(exports) {
  var AppletDetailsView = function(id, applet) {
    addMixin(this, DetailsViewMixin);
    addMixin(this, DebugMixin);

    this.initDetailsView(id, applet);
  };

  AppletDetailsView.prototype = {
    _template:
      '<ul class="details">' +
        '<li id="aid"><p class="label">AID</p><p class="value"></p></li>' +
        '<li class="details-more">' +
          '<p class="details-note">' +
            'More details read from the applet can be presented here' +
          '</p>' +
        '</li>' +
      '</ul>',

    _render: function(applet) {
      this._el.querySelector('#aid .value')
        .textContent = applet.aid;
    },
  };

  exports.AppletDetailsView = AppletDetailsView;
}((typeof exports === 'undefined') ? window : exports));
