(function(exports) {

  function DeviceInteraction(exampleCmds, subject) {
    var cmdResult, type;

    subject = subject;
    commands = exampleCmds;

    beforeEach(function() {
      cmdResult = null;
    });

    function driver() {
      if (subject().client) {
        return subject().client.driver;
      }
      return subject().driver;
    }

    return {

      commandCallback: function commandCallback(data) {
        commandCallback.value = data;
      },

      issues: function issues() {
        var args = Array.prototype.slice.call(arguments),
            cmd = args.shift(),
            result,
            commandCallback = this.commandCallback;

        beforeEach(function() {
          if (!subject()) {
            throw new Error('DeviceInteraction must be provided a subject');
          }

          args.push(commandCallback);
          if (!(cmd in subject())) {
            throw new Error('client does not have method ' + cmd);
          }
          result = subject()[cmd].apply(subject(), args);
        });

        it('should be chainable', function() {
          expect(result).to.be(subject());
        });

        return this;
      },

      shouldSend: function shouldSend(options) {
        var key;
        for (key in options) {
          if (options.hasOwnProperty(key)) {
            (function(option, value) {
              it('should send ' + option, function() {
                var sent = driver().sent[0];
                if (!(option in sent)) {
                  throw new Error(
                    option + ' was never sent as part of command to server'
                  );
                }
                expect(sent[option]).to.eql(value);
              });
            }(key, options[key]));
          }
        }
        return this;
      },

      serverResponds: function serverResponds(type, options) {
        beforeEach(function() {
          if (!(type in exampleCmds)) {
            throw new Error('there is no \'' + type + '\' example command');
          }
          cmdResult = commands[type](options);
          driver().respond(cmdResult);
        });
        return this;
      },

      callbackReceives: function callbackReceives(key) {
        var commandCallback = this.commandCallback;
        it('should receive the ' + key + ' from response', function() {
          if (cmdResult[key] === undefined) {
            throw new Error(
              key + ' should not be undefined for test mocks use a real value'
            );
          }
          expect(commandCallback.value).to.be(cmdResult[key]);
        });
        return this;
      }
    };
  }

  exports.DeviceInteraction = DeviceInteraction;

}(
  (typeof(window) === 'undefined') ? module.exports : window
));
