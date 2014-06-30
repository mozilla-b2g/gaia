/* globals NavbarManager, KeypadManager */

/* exported ActivityHandler */

'use strict';

var ActivityHandler = {
  currentActivity: null,
  isPickMode: false,

  get currentlyHandling() {
    return !!this.currentActivity;
  },

  get activityName() {
    return this.currentActivity && this.currentActivity.source.name;
  },

  get activityData() {
    return this.currentActivity && this.currentActivity.source.data;
  },

  get multiPickParam() {
    return this.currentActivity && this.currentActivity.source.data.multipick;
  },

  handle: function ah_handle(activity) {
    // XXX: Workaround here until the bug 787415 is fixed
    this.currentActivity = activity;

    switch (activity.source.name) {
      case 'dial':
        var number = this.activityData.number;
        if (number) {
          KeypadManager.updatePhoneNumber(number, 'begin', false);
          window.location.hash = '#keyboard-view';
        } else {
          window.location.hash = '#contacts-view';
          NavbarManager._contactsHome();
        }
        break;
      case 'pick':
        this.isPickMode = true;
        if (!this.multiPickParam) {
          NavbarManager.hide();
        }
        window.location.hash = '#call-log-view';
        break;
    }
  },

  postPickSuccess: function ah_postPickSuccess(result) {
    this.currentActivity.postResult(result);
    this.currentActivity = null;
    this.isPickMode = false;
  },

  postCancel: function ah_postCancel() {
    this.currentActivity.postError('canceled');
    this.currentActivity = null;
    this.isPickMode = false;
  }
};
