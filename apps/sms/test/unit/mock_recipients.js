function MockRecipients(setup) {
  this.setup = setup;
  this.recipientsList = document.getElementById(setup.inner);
  this.length = 0;
}

MockRecipients.prototype.add = function(contact) {
  var span = document.createElement('span');
  span.textContent = contact.number;
  this.recipientsList.appendChild(span);
  this.length++;
  return this;
};

MockRecipients.prototype.render = function() {
  return this;
};

MockRecipients.prototype.focus = function() {
  return this;
};

MockRecipients.prototype.on = function() {
  return this;
};

MockRecipients.prototype.off = function() {
  return this;
};

MockRecipients.prototype.emit = function() {
  return this;
};
