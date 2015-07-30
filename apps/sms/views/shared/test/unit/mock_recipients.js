'use strict';

function MockRecipients(setup) {
  this.setup = setup;
  this.recipientsList = document.getElementById(setup.inner);
  Object.defineProperty(this, 'length', {
    get: function() {
      return this.numbersList.length;
    },
    set: function(val) {
      this.numbersList.length = val;
    }
  });

  Object.defineProperty(this, 'numbers', {
    get: function() {
      return Array.from(this.numbersList);
    }
  });

  this.events = {
    add: [],
    remove: [],
    modechange: []
  };
  this.numbersList = [];
  this.inputValue = '';
  this.list = [];
}

MockRecipients.prototype.add = function(contact) {
  var span = document.createElement('span');
  span.textContent = contact.number;
  this.recipientsList.appendChild(span);
  this.numbersList.push(contact.number);
  this.list.push(contact);
  this.emit('add', this.length, contact);
  return this;
};

MockRecipients.prototype.remove = function(phone) {
  var index = this.numbersList.indexOf(phone);
  if (index != -1) {
    this.numbersList.splice(this.numbersList.indexOf(phone), 1);
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
