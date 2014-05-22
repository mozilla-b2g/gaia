'use strict';

/* global NavbarManager, KeypadManager */
/* exported ActivityHandler */

var ActivityHandler = {
  currentActivity: null,
  isPickMode: false,

  get currentlyHandling() {
    return !!this.currentActivity;
  },

  get activityName() {
    if (!this.currentActivity) {
      return null;
    }

    return this.currentActivity.source.name;
  },

  get activityData() {
    if (!this.currentActivity) {
      return null;
    }

    return this.currentActivity.source.data;
  },

  get multiPickParam() {
    if (!this.currentActivity.source.data.multipick) {
      return null;
    }

    return this.currentActivity.source.data.multipick;
  },

  handle: function ah_handle(activity) {
    this.currentActivity = activity;

    switch (this.activityName) {
      case 'dial':
        var number = this.activityData.number;
        if (number) {
          KeypadManager.updatePhoneNumber(number, 'begin', false);
          if (window.location.hash != '#keyboard-view') {
            window.location.hash = '#keyboard-view';
          }
        } else {
          if (window.location.hash != '#contacts-view') {
            window.location.hash = '#contacts-view';
          }
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
      default:
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
