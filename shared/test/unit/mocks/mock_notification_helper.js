'use strict';
/* exported MockNotificationHelper */

var MockNotificationHelper = {
  send: function(titleL10n, options) {
    this.mOptions = options;
    this.mTitleL10n = titleL10n;
    var self = this;

    var notification = {
      addEventListener: function(type, cb) {
        self.mEvents[type] = cb;
      },
      close: sinon.stub()
    };
    sinon.spy(notification, 'addEventListener');

    return Promise.resolve(notification);
  },

  getIconURI: function nc_getIconURI(app, entryPoint) {
    var result = '' + app.name;
    if (entryPoint) {
      result += '/' + entryPoint;
    }
    return result;
  },

  mEmit: function(type) {
    this.mEvents[type]();
  },
  mEvents: {},
  mTitleL10n: null,
  mOptions: null,
  mTeardown: function teardown() {
    this.mTitleL10n = null;
    this.mOptions = null;
    this.mEvents = {};
  }
};
