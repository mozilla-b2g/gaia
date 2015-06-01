/* global assert, helper */
'use strict';
suite('marionette/command-stream', function() {

  var subject, socket,
      Responder,
      CommandStream;

  helper.require('responder', function(obj) {
    Responder = obj;
  });

  helper.require('command-stream', function(obj) {
    CommandStream = obj;
  });

  setup(function() {
    socket = new Responder();
    subject = new CommandStream(socket);
  });

  suite('initialization', function() {
    test('should save socket', function() {
      assert.strictEqual(subject.socket, socket);
    });

    test('should be an event emitter', function() {
      assert.instanceOf(subject.on, Function);
    });
  });

  suite('socket event: data', function() {

    var calledWith, data;

    setup(function() {
      data = {};

      subject.on('command', function() {
        calledWith = Array.prototype.slice.call(arguments);
      });

      subject.socket.emit('data', new Buffer(subject.stringify(data)));
    });

    test('should call add', function() {
      assert.deepEqual(calledWith, [data]);
    });

  });

  suite('.stringify', function() {
    var command = {works: true},
        result;

    function shouldStringify() {
      test('should return json (n:json)', function() {
        var string = JSON.stringify(command);
        assert.strictEqual(result, String(string.length) + ':' + string);
      });
    }

    suite('when given an object', function() {
      setup(function() {
        result = subject.stringify(command);
      });

      shouldStringify();
    });

    suite('when given a string', function() {
      setup(function() {
        command = 'some random string';
        result = subject.stringify(command);
      });

      shouldStringify();
    });
  });

  suite('.send', function() {

    var calledWith = [], data = {uniq: true};

    function sendsToSocket(fnName) {
      setup(function() {
        subject.socket[fnName] = function() {
          calledWith = Array.prototype.slice.call(arguments);
        };
        subject.send(data);
      });

      test('should write to socket', function() {
        assert.strictEqual(calledWith[0], subject.stringify(data));
      });
    }


    suite('when using socket.send', function() {
      sendsToSocket('send');
    });

    suite('when using socket.write', function() {
      sendsToSocket('write');

      test('should write in utf8', function() {
        assert.strictEqual(calledWith[1], 'utf8');
      });
    });

  });

  suite('.add', function() {

    var commands = [],
        chunks = {},
        commandList = {
          success: {'from': 'someX'},
          fail: {'from': 'zya'}
        };


    function add(string, log) {
      var buffer = new Buffer(string);
      subject.add(buffer);
    }

    function emitsCommand(name, index) {

      index = index || 0;
      name = name || 'success';

      test('should emit ' + name + ' command at #' + index + '', function() {
        assert.deepEqual(commands[index], commandList[name]);
      });
    }

    function hasCommands(number) {
      test('should have ' + String(number) + ' of commands', function() {
        assert.strictEqual(commands.length, number);
      });
    }

    setup(function() {
      commands = [];
      Object.keys(commandList).forEach(function(key) {
        chunks[key] = subject.stringify(commandList[key]);
      });

      subject.on(subject.commandEvent, function(response) {
        commands.push(response);
      });
    });

    suite('when given the entire command', function() {
      setup(function() {
        add(chunks.success);
      });

      emitsCommand('success', 0);
      hasCommands(1);
    });

    suite('when given single command in multiple chunks', function() {

      setup(function() {
        add(chunks.success.slice(0, 1));
        add(chunks.success.slice(1, 2));
        add(chunks.success.slice(2));
      });

      emitsCommand('success', 0);
      hasCommands(1);

    });

    suite('when given multiple commands in two chunks', function() {
      setup(function() {
        var chunk = chunks.success + chunks.fail,
            piece1,
            piece2,
            half = Math.floor(chunk.length / 2);

        piece1 = chunk.slice(0, half);
        piece2 = chunk.slice(half);
        //sanity check
        assert.strictEqual(piece1 + piece2, chunk);

        add(piece1);
        add(piece2);
      });

      emitsCommand('success', 0);
      emitsCommand('fail', 1);
      hasCommands(2);

    });

    suite('when given both commands in one chunk', function() {
      setup(function() {
        add(chunks.fail + chunks.success);
      });

      emitsCommand('fail', 0);
      emitsCommand('success', 1);
      hasCommands(2);

    });

  });

});

