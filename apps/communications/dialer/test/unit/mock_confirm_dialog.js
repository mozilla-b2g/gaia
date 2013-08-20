'use strict';

var MockConfirmDialog = {
  showing: false,
  title: null,
  text: null,
  button: null,
  show: function(title, text, button) {
    this.showing = true;
    this.title = title;
    this.text = text;
    this.button = button;
  },
  hide: function() {
    this.showing = false;
    this.title = null;
    this.text = null;
    this.button = null;
  }
};
