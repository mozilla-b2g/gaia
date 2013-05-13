describe('marionette/drivers/httpd-polling', function() {

  var subject,
      requests,
      lastRequest,
      connectionId = 100,
      url = 'http://fake/marionette',
      Xhr,
      Abstract,
      Httpd;


  cross.require(
    'marionette/drivers/abstract',
    'Marionette.Drivers.Abstract', function(obj) {
      Abstract = obj;
    }
  );

  cross.require(
    'marionette/xhr',
    'Marionette.Xhr', function(obj) {
      Xhr = obj;
    }
  );

  cross.require(
    'marionette/drivers/httpd-polling',
    'Marionette.Drivers.HttpdPolling', function(obj) {
      Httpd = obj;
    }
  );

  function connect() {
    beforeEach(function(done) {
      subject.connect(function() {
        done();
      });
      requests[0].xhr.respond({ id: connectionId });
      requests[1].xhr.respond({
        messages: [
          { id: connectionId, response: exampleCmds.connect() }
        ]
      });
      expect(subject.connectionId).to.be(connectionId);
    });
  }

  before(function() {
    var xhrClass = Xhr.prototype.xhrClass;
    Xhr.prototype._xhrClass = xhrClass;
    Xhr.prototype.xhrClass = FakeXhr;
  });

  after(function() {
    Xhr.prototype.xhrClass = Xhr.prototype._xhrClass;
    delete Xhr.prototype._xhrClass;
  });

  beforeEach(function() {
    requests = [];
    subject = new Httpd({
      proxyUrl: url,
      server: 'localhost',
      port: 2828
    });

    lastRequest = null;
    subject._request = function() {
      lastRequest = Httpd.prototype._request.apply(this, arguments);
      requests.push(lastRequest);
      return lastRequest;
    };

  });

  describe('initialization', function() {
    it('should set url', function() {
      expect(subject.proxyUrl).to.be(url);
    });

    it('should set port', function() {
      expect(subject.port).to.be(2828);
    });

    it('should set server', function() {
      expect(subject.server).to.be('localhost');
    });

    it('should be an instance of the abstract', function() {
      expect(subject).to.be.a(Abstract);
    });
  });

  describe('._connect', function() {

    describe('when successful', function() {
      var connectRequest;
      connect();

      beforeEach(function() {
        connectRequest = requests[0];
      });

      it('should make request for connection', function() {
        expect(connectRequest.method).to.be('POST');
        expect(connectRequest.data).to.eql({
          server: subject.server,
          port: subject.port
        });
      });

      it('should be ready', function() {
        expect(subject.ready).to.be(true);
      });

      xit('should be waiting for a response', function() {
        expect(requests[1].waiting).to.be(true);
      });

      describe('._pollingRequest', function() {

        it('should be created', function() {
          expect(subject._pollingRequest).to.be.a(Xhr);
        });

        it('should poll with get to proxy', function() {
          expect(subject._pollingRequest.url).to.contain(
            subject.proxyUrl + '?' + subject.connectionId
          );
          expect(subject._pollingRequest.method).to.eql('GET');
          expect(subject._pollingRequest.waiting).to.be(true);
        });

      });

    });

  });

  describe('._onQueueResponse', function() {
    var response, queue, pollingRequest;

    connect();

    beforeEach(function() {
      pollingRequest = requests[1];
    });

    beforeEach(function() {

      response = [];
      subject._onDeviceResponse = function(data) {
        response.push(data);
        Httpd.prototype._onDeviceResponse.apply(this, arguments);
      };

      queue = {
        messages: [
          { id: 1, response: exampleCmds.getMarionetteIDResponse() },
          { id: 2, response: exampleCmds.newSessionResponse() }
        ]
      };

      pollingRequest.xhr.respond(queue);
    });

    it('should requeue', function() {
      expect(pollingRequest.waiting).to.be(true);
    });

    it('should send each message to _onDeviceResponse', function() {
      expect(response).to.eql(queue.messages);
    });

    describe('when _pollingRequest if null', function() {
      it('should not fail', function() {
        subject._pollingRequest = null;
        subject._onQueueResponse({}, { status: 200 });
      });
    });

  });

  describe('._sendCommand', function() {
    var cmd, cmdResponse,
        put, get;

    connect();

    beforeEach(function(done) {
      cmd = exampleCmds.newSession();
      //this will in then call _sendCommand
      subject.send(cmd, function(data) {
        cmdResponse = data;
        done();
      });

      //requests
      get = requests[1];
      put = requests[2];

      //put request
      put.xhr.respond({}, 201);

      //get request
      get.xhr.respond({
        messages: [{
          id: subject.connectionId,
          response: exampleCmds.newSessionResponse()
        }]
      });
    });

    it('should send command in put', function() {
      expect(put.data).to.eql(cmd);
    });

    it('should receive response to command', function() {
      expect(cmdResponse).to.eql(exampleCmds.newSessionResponse());
    });

  });


  describe('._close', function() {
    var aborted;

    connect();

    beforeEach(function() {
      subject._pollingRequest.abort = function() {
        aborted = true;
      };

      subject.close();
    });

    it('should abort pending gets and remove _pollingRequest', function() {
      expect(aborted).to.be(true);
      expect(subject._pollingRequest).not.to.be.ok();
    });

    it('should send DELETE request', function() {
      expect(lastRequest.method).to.be('DELETE');
      expect(lastRequest.url).to.contain(subject.connectionId);
    });
  });

  describe('._request', function() {

    var responseData,
        response = { id: 1 };

    describe('without a connectionId', function() {
      var data = {
          server: 'localhost',
          port: 2828
        };

      beforeEach(function(done) {

        subject._request('POST', data, function(data, xhr) {
          responseData = data;
          done();
        });

        lastRequest.xhr.respond(response);
      });

      it('should be a post', function() {
        expect(lastRequest.method).to.be('POST');
        expect(lastRequest.data).to.eql(data);
        expect(lastRequest.url).to.be(subject.proxyUrl);
      });

      it('should receive parsed response', function() {
        expect(responseData).to.eql(response);
      });

    });

    describe('with a connectionId', function() {

      var now = Date.now,
          time = now();

      afterEach(function() {
        Date.now = now;
      });

      beforeEach(function(done) {
        Date.now = function() {
          return time;
        };

        subject.connectionId = 10;
        subject._request('GET', function(data) {
          responseData = data;
          done();
        });
        lastRequest.xhr.respond(response);
      });

      it('should be a get', function() {
        expect(lastRequest.method).to.be('GET');
        expect(lastRequest.data).to.be(null);
      });

      it('should append connectionId to url', function() {
        expect(lastRequest.url).to.eql(
          subject.proxyUrl + '?' + subject.connectionId + '=' + time
        );
      });

      it('should receive parsed response', function() {
        expect(responseData).to.eql(response);
      });

    });

  });

});
