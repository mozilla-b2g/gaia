describe('marionette/client', function() {

  var subject, driver, cb, cbResponse,
      result, device, Element, Client;

  cross.require(
    'marionette/element',
    'Marionette.Element', function(obj) {
      Element = obj;
    }
  );

  cross.require(
    'marionette/client',
    'Marionette.Client', function(obj) {
      Client = obj;
    }
  );

  device = new DeviceInteraction(exampleCmds, function() {
    return subject;
  });

  function commandCallback(data) {
    commandCallback.value = data;
  }

  beforeEach(function() {
    commandCallback.value = null;
    driver = new MockDriver();
    subject = new Client(driver);
    cb = function() {
      cbResponse = arguments;
    };
  });

  describe('initialization', function() {
    it('should save .driver', function() {
      expect(subject.driver).to.be(driver);
    });
  });

  describe('.searchMethods', function() {
    it('should have a list of methods', function() {
      expect(subject.searchMethods).to.be.a(Array);
      expect(subject.searchMethods.length).to.be.greaterThan(3);
    });
  });

  describe('.send', function() {

    describe('when session: is present', function() {
      var result;
      beforeEach(function() {
        subject.session = 'session';
        subject.actor = 'actor';
        result = subject.send({ type: 'newSession' });
      });

      it('should be chainable', function() {
        expect(result).to.be(subject);
      });

      it('should add session to cmd', function() {
        expect(driver.sent[0]).to.eql({
          to: subject.actor,
          session: subject.session,
          type: 'newSession'
        });
      });
    });

    describe('when to: is not given', function() {

      describe('with an actor', function() {
        beforeEach(function() {
          subject.actor = 'foo';
          subject.send({ type: '_getActorId' }, cb);
        });

        it('should add to:', function() {
          expect(driver.sent[0]).to.eql({
            to: 'foo',
            type: '_getActorId'
          });
        });

      });

      describe('without an actor', function() {
        beforeEach(function() {
          subject.send({ type: '_getActorId' }, cb);
        });

        it('should add to:', function() {
          expect(driver.sent[0]).to.eql({
            to: 'root',
            type: '_getActorId'
          });
        });

      });

    });
  });

  describe('.startSession', function() {
    var result;

    beforeEach(function(done) {

      result = subject.startSession(function() {
        done();
      });

      driver.respond(exampleCmds.getMarionetteIDResponse());
      driver.respond(exampleCmds.newSessionResponse());
    });

    it('should be chainable', function() {
      expect(result).to.be(subject);
    });

    it('should have actor', function() {
      expect(subject.actor).to.be.ok();
    });

    it('should have a session', function() {
      expect(subject.session).to.be.ok();
    });
  });

  describe('._getActorId', function() {
    var response;

    device.
      issues('_getActorId').
      shouldSend({ type: 'getMarionetteID' }).
      serverResponds('getMarionetteIDResponse').
      callbackReceives('id');

    it('should save actor id', function() {
      expect(subject.actor).to.be(
        exampleCmds.getMarionetteIDResponse().id
      );
    });

  });

  describe('._sendCommand', function() {
    var cmd, response,
        calledTransform, result,
        cbValue;

    beforeEach(function(done) {
      cmd = exampleCmds.getUrl();
      response = exampleCmds.getUrlResponse();

      calledTransform = false;
      subject._transformResultValue = function(value) {
        calledTransform = true;
        expect(value).to.be(response.value);
        return 'foo';
      }

      result = subject._sendCommand(cmd, 'value', function(data) {
        cbValue = data;
        done();
      });

      driver.respond(response);
    });

    it('should send given command and format the result', function() {
      expect(result).to.be(subject);
    });

    it('should send command through _transformResultValue', function() {
      expect(calledTransform).to.be(true);
      expect(cbValue).to.be('foo');
    });

  });


  describe('.deleteSession', function() {
    var callsClose;

    beforeEach(function() {
      callsClose = false;
      subject.driver.close = function() {
        callsClose = true;
      };
    });

    device.
      issues('deleteSession').
      shouldSend({
        type: 'deleteSession'
      }).
      serverResponds('ok').
      callbackReceives('ok');

    it('should close the connection', function() {
      expect(callsClose).to.be(true);
    });
  });

  describe('.setSearchTimeout', function() {
    device.
      issues('setSearchTimeout', 50).
      shouldSend({
        type: 'setSearchTimeout',
        value: 50
      }).
      serverResponds('ok').
      callbackReceives('ok');
  });

  describe('.getWindow', function() {
    device.
      issues('getWindow').
      shouldSend({
        type: 'getWindow'
      }).
      serverResponds('getWindowResponse').
      callbackReceives('value');
  });

  describe('.setContext', function() {
    device.
      issues('setContext', 'chrome').
      shouldSend({
        type: 'setContext',
        value: 'chrome'
      }).
      serverResponds('ok').
      callbackReceives('ok');
  });

  describe('.getWindows', function() {
    device.
      issues('getWindows').
      shouldSend({
        type: 'getWindows'
      }).
      serverResponds('getWindowsResponse').
      callbackReceives('value');
  });

  describe('.switchToWindow', function() {
    device.
      issues('switchToWindow', '1-b2g').
      shouldSend({
        type: 'switchToWindow',
        value: '1-b2g'
      }).
      serverResponds('ok').
      callbackReceives('ok');
  });

  describe('.setScriptTimeout', function() {
    device.
      issues('setScriptTimeout', 100).
      shouldSend({
        type: 'setScriptTimeout',
        value: 100
      }).
      serverResponds('ok').
      callbackReceives('ok');
  });

  describe('.goUrl', function() {
    device.
      issues('goUrl', 'http://wow').
      shouldSend({
        type: 'goUrl',
        value: 'http://wow'
      }).
      serverResponds('ok').
      callbackReceives('ok');
  });

  describe('.getUrl', function() {
    device.
      issues('getUrl').
      shouldSend({
        type: 'getUrl'
      }).
      serverResponds('getUrlResponse').
      callbackReceives('value');
  });

  describe('.goForward', function() {
    device.
      issues('goForward').
      shouldSend({
        type: 'goForward'
      }).
      serverResponds('ok').
      callbackReceives('ok');
  });

  describe('.goBack', function() {
    device.
      issues('goBack').
      shouldSend({
        type: 'goBack'
      }).
      serverResponds('ok').
      callbackReceives('ok');
  });

  describe('script executing commands', function() {
    var calledWith,
        args = [],
        script = 'return null;';

    beforeEach(function() {
      calledWith = null;
      subject._executeScript = function() {
        calledWith = arguments;
      };
    });

    describe('.executeScript', function() {
      beforeEach(function() {
        subject.executeScript(script, commandCallback);
      });

      it('should call _executeScript', function() {
        expect(calledWith).to.eql([
          { type: 'executeScript', value: script, args: null },
          commandCallback
        ]);
      });
    });

    describe('.executeJsScript', function() {
      beforeEach(function() {
        subject.executeJsScript(script, commandCallback);
      });

      it('should call _executeScript', function() {
        expect(calledWith).to.eql([
          { type: 'executeJSScript', value: script, timeout: true, args: null },
          commandCallback
        ]);
      });
    });

    describe('.executeAsyncScript', function() {
      beforeEach(function() {
        subject.executeAsyncScript(script, commandCallback);
      });

      it('should call _executeScript', function() {
        expect(calledWith).to.eql([
          { type: 'executeAsyncScript', value: script, args: null },
          commandCallback
        ]);
      });
    });

  });

  describe('.refresh', function() {
    device.
      issues('refresh').
      serverResponds('ok').
      shouldSend({ type: 'refresh' }).
      callbackReceives('ok');
  });

  describe('.log', function() {
    device.
      issues('log', 'wow', 'info').
      shouldSend({ type: 'log', value: 'wow', level: 'info' }).
      serverResponds('ok').
      callbackReceives('ok');
  });

  describe('.getLogs', function() {
    device.
      issues('getLogs').
      shouldSend({ type: 'getLogs' }).
      serverResponds('getLogsResponse').
      callbackReceives('value');
  });

  describe('._findElement', function() {

    function receivesElement() {
      var value;

      describe('callback argument', function() {
        beforeEach(function() {
          value = device.commandCallback.value;
          if (!(value instanceof Element) && !(value instanceof Array)) {
            throw new Error('result is not an array or an Element instance');
          }

          if (!(value instanceof Array)) {
            value = [value];
          }
        });

        it('should be an instance of Marionette.Element', function() {
          value.forEach(function(el) {
            expect(el).to.be.a(Element);
            expect(el.client).to.be(subject);
            expect(el.id).to.contain('{');
          });
        });
      });
    }

    describe('simple find with defaults', function() {
      device.
        issues('_findElement', 'findElement', '#wow').
        shouldSend({
          type: 'findElement',
          value: '#wow',
          using: 'css selector'
        }).
        serverResponds('findElementResponse');

      receivesElement();
    });

    describe('find with all options', function() {
      device.
        issues('_findElement', 'findElements', 'wow', 'class name', 1).
        shouldSend({
          type: 'findElements',
          value: 'wow',
          using: 'class name',
          element: 1
        }).
        serverResponds('findElementResponse');

      receivesElement();
    });

    describe('trying to find with invalid \'using\'', function() {

      it('should fail', function() {
        expect(function() {
          subject._findElement(
            'findElement', 'wow', 'fake', function() {}
          );
        }).to.throwError(/invalid option for using/);
      });
    });

  });

  describe('element finders', function() {
    var calledWith;

    function delegatesToFind(type) {
      describe('.' + type, function() {
        beforeEach(function() {
          subject[type]('#query', commandCallback);
        });

        it('should call _findElement', function() {
          expect(calledWith).to.eql([
            type, '#query', commandCallback
          ]);
        });
      });
    }

    beforeEach(function() {
      subject._findElement = function() {
        calledWith = arguments;
      };
    });

    delegatesToFind('findElement');
    delegatesToFind('findElements');
  });

  describe('._executeScript', function() {
      var cmd = 'return window.location',
          args = [{1: true}],
          type = 'executeScript';

    describe('with args', function() {
      var request = {
        type: type,
        value: cmd,
        args: args
      };

      device.
        issues('_executeScript', request).
        shouldSend(request).
        serverResponds('getUrlResponse').
        callbackReceives('value');
    });

    describe('without args', function() {
      var request = {
        type: type,
        value: cmd
      };

      device.
        issues('_executeScript', request).
        shouldSend({
          type: type,
          value: cmd,
          args: []
        }).
        serverResponds('getUrlResponse').
        callbackReceives('value');
    });

    describe('with timeout', function() {
      var request = {
        type: 'executeJSScript',
        value: cmd,
        args: args,
        timeout: false
      };

      device.
        issues('_executeScript', request).
        shouldSend(request).
        serverResponds('getUrlResponse').
        callbackReceives('value');

    });

  });

  describe('._newSession', function() {
    var response;

    beforeEach(function(done) {
      response = exampleCmds.newSessionResponse();
      subject._newSession(function() {
        cbResponse = arguments;
        done();
      });

      driver.respond(response);
    });

    it('should send newSession', function() {
      expect(driver.sent[0].type).to.eql('newSession');
    });

    it('should save session id', function() {
      expect(subject.session).to.be(response.value);
    });

    it('should send callback response', function() {
      expect(cbResponse[0]).to.eql(response);
    });

  });

  describe('._convertFunction', function() {
    var result;
    var fn = function() { return true; };

    beforeEach(function() {
      result = subject._convertFunction(fn);
      result = result.replace(/\n|\s/g, '');
    });

    it('should format function to call immediately', function() {
      var expected;
      expected = 'return (function() { return true;}.apply(this, arguments));';
      expected = expected.replace(/\n|\s/g, '');
      expect(result).to.be(expected);
    });

    it('should not format strings', function() {
      expect(subject._convertFunction('foo')).to.be('foo');
    });

  });

  describe('._transformResultValue', function() {
    var result;
    describe('when it is an element', function() {
      beforeEach(function() {
        result = subject._transformResultValue({
          'ELEMENT': 'foo'
        });
      });

      it('should return an instance of element', function() {
        expect(result).to.be.a(Element);
        expect(result.id).to.be('foo');
      });

    });

    describe('when it is not an element', function() {
      var obj = {'foo': true};

      beforeEach(function() {
        result = subject._transformResultValue(obj);
      });

      it('should return same object', function() {
        expect(result).to.be(obj);
      });
    });
  });


  describe('._prepareArguments', function() {
    var args, result;

    beforeEach(function() {
      args = [
        new Element('{uuid}', subject),
        'wow',
        true
      ];

      result = subject._prepareArguments(args);
    });

    it('should process Marionette.Element instances into uuids', function() {
      expect(result).to.eql([
        {'ELEMENT': '{uuid}'},
        'wow',
        true
      ]);
    });

  });

});
