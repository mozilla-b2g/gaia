function MockRecipients(setup) {
  this.setup = setup;
  this.recipientsList = document.getElementById(setup.inner);
  this.length = 0;
  this.events = {
    add: [],
    remove: []
  };
}

MockRecipients.prototype.add = function(contact) {
  var span = document.createElement('span');
  span.textContent = contact.number;
  this.recipientsList.appendChild(span);
  this.length++;
  this.emit('add', this.length);
  return this;
};

MockRecipients.prototype.render = function() {
  return this;
};

MockRecipients.prototype.focus = function() {
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
