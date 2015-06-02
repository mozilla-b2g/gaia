(function(module, ns) {

  function DeviceInteraction(exampleCmds, subject) {
    var cmdResult, type;

    subject = subject;
    commands = exampleCmds;

    setup(function() {
      cmdResult = null;
    });

    function driver() {
      if (subject().client) {
        return subject().client.driver;
      }
      return subject().driver;
    }

    return {

      commandCallback: function commandCallback(error, data) {
        commandCallback.value = data;
        commandCallback.error = error;
      },

      issues: function issues() {
        var args = Array.prototype.slice.call(arguments),
            cmd = args.shift(),
            result,
            commandCallback = this.commandCallback;

        setup(function() {
          if (!subject()) {
            throw new Error('DeviceInteraction must be provided a subject');
          }

          args.push(commandCallback);
          if (!(cmd in subject())) {
            throw new Error('client does not have method ' + cmd);
          }
          result = subject()[cmd].apply(subject(), args);
        });

        test('should be chainable', function() {
          assert.strictEqual(result, subject());
        });

        return this;
      },

      shouldSend: function shouldSend(options) {
        var key;
        for (key in options) {
          if (options.hasOwnProperty(key)) {
            (function(option, value) {
              test('should send ' + option, function() {
                var sent = driver().sent[0];
                if (!(option in sent)) {
                  throw new Error(
                    option + ' was never sent as part of command to server'
                  );
                }
                assert.deepEqual(sent[option], value);
              });
            }(key, options[key]));
          }
        }
        return this;
      },

      serverResponds: function serverResponds(type, options) {
        setup(function() {
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
        test('should receive the ' + key + ' from response', function() {
          if (cmdResult[key] === undefined) {
            throw new Error(
              key + ' should not be undefined for test mocks use a real value'
            );
          }
          assert.strictEqual(commandCallback.value, cmdResult[key]);
        });
        return this;
      }
    };
  }

  module.exports = DeviceInteraction;

}.apply(
  this,
  (this.Marionette) ?
    [Marionette('support/device-interaction'), Marionette] :
    [module, require('../../lib/marionette/marionette')]
));
