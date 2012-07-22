'use strict';

var UssdUI = {
  get message() {
    delete this.message;
    return this.message = document.getElementById('message');
  },

  get answer() {
    delete this.answer;
    return this.answer = document.getElementById('answer');
  },

  init: function uui_init() {
    this._origin = document.location.protocol + '//' +
      document.location.host;
    window.addEventListener('message', this);
  },

  close: function uui_close() {
    window.opener.postMessage({
      type: 'close'
    }, this._origin);

    window.close();
  },

  showAnswer: function uui_showAnswer() {
    this.message.hidden = true;
    this.answer.hidden = false;
  },

  reply: function uui_reply() {
    var field = this.answer.querySelector('input');
    var number = field.value;

    if (number) {
      field.value = '';
      this.message.textContent = '...';
      this.message.hidden = false;
      this.answer.hidden = true;

      window.opener.postMessage({
        type: 'reply',
        number: number
      }, this._origin);
    }
  },

  handleEvent: function ph_handleEvent(evt) {
    this.message.textContent = evt.data;
  }
};

UssdUI.init();
