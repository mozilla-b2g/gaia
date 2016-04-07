'use strict';

/* global module */

var MenuAccessor = require('../shared/menu_accessors');

function ActivityChooserView(client) {
  this.client = client;
  this.menuAccessors = new MenuAccessor(client);
}

ActivityChooserView.prototype = {
  choose: function(appName) {
    this.menuAccessors.selectSystemMenuOption(appName);

    var activityApp = this.createAppViewByName(appName);
    activityApp.switchTo();

    return activityApp;
  },

  createAppViewByName: function(appName) {
    switch(appName) {
      case 'Messages Activity Caller':
        return require('../../messages_activity_caller.js').create(this.client);
      default:
        throw new Error('Unsupported app name: ' + appName);
    }
  }
};

module.exports = ActivityChooserView;
