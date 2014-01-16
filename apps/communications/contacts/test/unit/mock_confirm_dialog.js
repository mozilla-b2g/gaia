'use strict';

var MockConfirmDialog = {
  showing: false,
  title: null,
  text: null,
  noObject: null,
  yesObject: null,
  show: function(title, text, no, yes) {
    this.showing = true;
    this.title = title;
    this.text = text;
    this.noObject = no;
    this.yesObject = yes;
  },
  hide: function() {
    this.showing = false;
    this.title = null;
    this.text = null;
    this.button = null;
  },
  executeNo: function() {
    if (this.noObject && this.noObject.callback) {
      this.noObject.callback();
    }
  },
  executeYes: function() {
    if (this.yesObject && this.yesObject.callback) {
      this.yesObject.callback();
    }
  }
};
