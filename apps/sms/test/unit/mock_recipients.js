'use strict';

function MockRecipients(setup) {
  this.setup = setup;
  this.recipientsList = document.getElementById(setup.inner);
  this.length = 0;
  this.events = {
    add: [],
    remove: []
  };
  this.valid = [];
  this.all = [];
  this.inputValue = '';
}

MockRecipients.prototype.add = function(contact) {
  var span = document.createElement('span');
  span.dataset.number = contact.number;
  span.textContent = contact.number;
  this.recipientsList.appendChild(span);
  this.length++;
  this.valid.push(contact.number);
  this.all.push(contact.number);
  this.emit('add', this.length, contact);
  return this;
};

MockRecipients.prototype.remove = function(phone) {
  var index = this.valid.indexOf(phone);
  if (index != -1) {
    this.valid.splice(this.valid.indexOf(phone), 1);
    this.all.splice(this.all.indexOf(phone), 1);
    this.length--;
    this.emit('remove', this.length);
  }
  return this;
};

MockRecipients.prototype.render = function() {
  return this;
};

MockRecipients.prototype.focus = function() {
  return this;
};

MockRecipients.prototype.update = function() {
  return this;
};

MockRecipients.prototype.visible = function() {
  return this;
};

MockRecipients.prototype.on = function(event, callback) {
  this.events[event].push(callback);
  return this;
};

MockRecipients.prototype.off = function() {
  return this;
};

MockRecipients.prototype.emit = function(type) {
  var handlers = this.events;
  var args = [].slice.call(arguments, 1);
  var handler, stack;

  if (!handlers[type]) {
    throw new Error('Invalid event type: ' + type);
  }

  stack = handlers[type].slice();

  if (stack.length) {
    while ((handler = stack.pop())) {
      handler.apply(null, args);
    }
  }

  return this;
};


MockRecipients.View = function() {};

MockRecipients.View.isFocusable = true;
