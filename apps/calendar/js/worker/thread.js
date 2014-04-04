((typeof(Calendar) === 'undefined') ? Calendar = {} : '');

// expose window globally in this
// context if not available.
if (typeof(window) === 'undefined') {
  this.window = this;
}

Calendar.Thread = function Thread(worker) {
  Calendar.Responder.call(this);
  this.worker = worker;
  this.roles = {};

  this._initEvents();
};

Calendar.Thread.prototype = {

  __proto__: Calendar.Responder.prototype,

  send: function() {
    this.worker.postMessage(Array.prototype.slice.call(arguments));
  },

  addRole: function(name) {
    this.roles[name] = new Calendar.Responder();
  },

  _remoteEmitter: function(id) {
    var self = this;
    return {
      emit: function emitRemote() {
        var args = Array.prototype.slice.call(arguments);
        self.worker.postMessage([id + ' stream'].concat(args));
      }
    };
  },

  _initEvents: function() {
    var self = this;

    this.worker.addEventListener('message', function(e) {
      self.respond(e.data);
    }, false);

    this.on('_dispatch', function(data) {
      // data.id
      // data.type
      // data.role
      // data.payload

      var callback = self._requestCallback.bind(
        self, data.id
      );

      var payload = data.payload;

      if (data.role) {
        if (data.role in self.roles) {
          if (data.type && data.type === 'stream') {
            self.roles[data.role].respond(
              data.payload,
              self._remoteEmitter(data.id),
              callback
            );
          } else {
            self.roles[data.role].respond(
              data.payload, callback
            );
          }
        } else {
          //TODO: respond with error
          console.log(
            'ERORR: ' + data.role + ' is not available.'
          );
        }
      } else {
        self.respond(data.payload, callback);
      }
    });
  },

  _wrapError: function(err) {
    var errorObject = {};

    errorObject.stack = err.stack || '';
    errorObject.message = err.message || err.toString();
    errorObject.type = err.type || 'Error';
    errorObject.constructorName = err.constructor.name || 'Error';

    if (err.name) {
      errorObject.name = err.name;
    }

    if (err.code) {
      errorObject.code = err.code;
    }

    return errorObject;
  },

  _requestCallback: function(id) {
    var args = Array.prototype.slice.call(arguments, 1);
    args.unshift(id + ' end');

    if (args[1] instanceof Error) {
      args[1] = this._wrapError(args[1]);
    }

    this.worker.postMessage(args);
  },

  console: function console(name) {

    var TIME_REGEX = /\?time\=(\d+)/g;

    return {

      log: function() {
        // create stack
        var stack;

        try {
          throw new Error();
        } catch (e) {
          stack = e.stack.replace(TIME_REGEX, '');
        }

        var parts = stack.split('\n');
        parts.shift();

        var event = {
          stack: parts,
          name: name,
          message: Calendar.format.apply(this, arguments)
        };

        postMessage(['log', event]);
      }

    };
  }

};
