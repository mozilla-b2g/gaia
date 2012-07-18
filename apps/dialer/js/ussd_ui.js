'use strict';

var UssdUI = {
  get message() {
    delete this.message;
    return this.message = document.getElementById('message');
  },

  init: function uui_init() {
    window.addEventListener('message', this);
  },

  close: function uui_close() {
    window.close();
  },

  handleEvent: function ph_handleEvent(evt) {
    this.message.textContent = evt.data;
  }
};

UssdUI.init();
