/* global Marionette, assert */
(function(module, ns) {
  'use strict';

  function DeviceInteraction(exampleCmds, subject) {
    var commands = exampleCmds;
    var expectedResponse;

    setup(function() {
      expectedResponse = null;
    });

    function driver() {
      if (subject().client) {
        return subject().client.driver;
      }
      return subject().driver;
    }

    return {

      commandCallback: function commandCallback(error, value) {
        commandCallback.error = error;
        commandCallback.value = value;
      },

      withProtocol: function(version) {
        setup(function() {
          subject().protocol = version;
        });
        return this;
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
        var check = function(option, value) {
          test('should send ' + option, function() {
            var sent = driver().sent[0];
            if (!(option in sent)) {
              throw new Error(
                  option + ' was never sent as part of command to server');
            }
            assert.deepEqual(sent[option], value);
          });
        };

        for (var key in options) {
          if (options.hasOwnProperty(key)) {
            check(key, options[key]);
          }
        }

        return this;
      },

      serverResponds: function serverResponds(type, options) {
        setup(function() {
          if (!(type in commands)) {
            throw new Error('No such example command: ' + type);
          }
          expectedResponse = commands[type](options);
          driver().respond(expectedResponse);
        });
        return this;
      },

      callbackReceives: function callbackReceives(key) {
        var commandCallback = this.commandCallback;

        if (key) {
          test('should receive ' + key + ' in response', function() {
            if (typeof expectedResponse[key] == 'undefined') {
              throw new Error(key + ' should not be undefined ' +
                  'for test mocks use a real value');
            }
            assert.strictEqual(commandCallback.value, expectedResponse[key]);
          });
        } else {
          test('should receive whole body response', function() {
            assert.strictEqual(commandCallback.value, expectedResponse);
          });
        }

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
