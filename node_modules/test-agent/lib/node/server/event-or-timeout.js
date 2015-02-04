function EventOrTimeout(options) {
  var key;
  if (typeof(options) === 'undefined') {
    options = {};
  }


  for (key in options) {
    if (options.hasOwnProperty(key)) {
      this[key] = options[key];
    }
  }

  if (!this.timeout) {
    throw new Error(
      'You must pass a non-zero numeric value for timeout'
    );
  }

  if (!this.event) {
    throw new Error(
      'You must pass an event to watch for'
    );
  }
}

EventOrTimeout.prototype = {

  timeoutHandler: function() {
    throw new Error(
      'Did not receive an "' + this.event + '" ' +
      'within the set timeout of "' + this.timeout + '"'
    );
  },

  enhance: function(server) {
    var self = this,
        timeout;

    timeout = setTimeout(function() {
      self.timeoutHandler();
    }, this.timeout);

    server.once(this.event, function() {
      clearTimeout(timeout);
    });
  }

};

module.exports = EventOrTimeout;
