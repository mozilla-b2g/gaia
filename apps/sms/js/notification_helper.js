'use strict';

// Keeping a reference on all the active notification
// to avoid weird GC issues.
// See https://bugzilla.mozilla.org/show_bug.cgi?id=755402

var NotificationHelper = {
  _referencesArray: [],

  getIconURI: function nc_getIconURI(app) {
    var icons = app.manifest.icons;
    if (!icons)
      return null;

    var sizes = Object.keys(icons).map(function parse(str) {
      return parseInt(str, 10);
    });
    sizes.sort(function(x, y) { return y - x; });

    var HVGA = document.documentElement.clientWidth < 480;
    var index = sizes[HVGA ? sizes.length - 1 : 0];
    return app.installOrigin + icons[index];
  },

  send: function nc_send(title, body, icon, clickCB, closeCB) {
    if (!('mozNotification' in navigator))
      return;

    var notification = navigator.mozNotification.createNotification(title,
                                                                    body, icon);

    notification.onclick = (function() {
      if (clickCB)
        clickCB();

      this._forget(notification);
    }).bind(this);

    notification.onclose = (function() {
      if (closeCB)
        closeCB();

      this._forget(notification);
    }).bind(this);

    notification.show();
    this._keep(notification);
  },

  _keep: function nc_keep(notification) {
    this._referencesArray.push(notification);
  },
  _forget: function nc_forget(notification) {
    this._referencesArray.splice(referencesArray.indexOf(notification), 1);
  }
};
