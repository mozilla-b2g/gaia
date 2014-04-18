'use strict';

function FakeForm(client, origin) {
  this.client = client;
  this.origin = origin;
}

module.exports = FakeForm;

FakeForm.Selectors = {
  'textInputElement': 'input#text_input'
};

function findElement(client, name) {
  return client.findElement(FakeForm.Selectors[name]);
}

FakeForm.prototype = {
  client: null,

  get textInputElement() {
    return findElement(this.client, 'textInputElement');
  },

  launch: function() {
    this.client.apps.launch(this.origin);
    this.client.apps.switchToApp(this.origin);
  },

  close: function() {
    this.client.apps.close(this.origin);
  },

  backToApp: function() {
    this.client.switchToFrame();
    this.client.apps.switchToApp(this.origin);
  }
};
