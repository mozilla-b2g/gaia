describe('marionette/xhr', function() {
  var subject,
      Xhr;

  cross.require(
    'marionette/xhr',
    'Marionette.Xhr',
    function(obj) {
      Xhr = obj;
    }
  );

   beforeEach(function() {
    subject = new Xhr({
      method: 'POST'
    });
  });

  describe('initialization', function() {

    it('should set options on instance', function() {
      expect(subject.method).to.be('POST');
    });

  });

  describe('.abort', function() {
    describe('when there is an xhr object', function() {
      var aborted;

      beforeEach(function() {
        aborted = false;
        subject.xhr = {
          abort: function() {
            aborted = true;
          }
        };
        subject.abort();
      });

      it('should call abort on the xhr object', function() {
        expect(aborted).to.be(true);
      });
    });

    describe('when there is no xhr object', function() {
      it('should not fail', function() {
        subject.xhr = null;
        subject.abort();
      });
    });
  });

  describe('.send', function() {

    var data = { a: true, b: false },
        url = 'http://foo',
        xhr,
        responseData,
        responseXhr;

    function callback(done, data, xhr) {
      responseXhr = xhr;
      responseData = data;
      done();
    }

    function request(options) {
      options.xhrClass = FakeXhr;
      subject = new Xhr(options);
    }

    function opensXHR() {
      it('should create xhr', function() {
        expect(subject.xhr).to.be.a(FakeXhr);
      });

      it('should set headers', function() {
        expect(subject.xhr.headers).to.eql(subject.headers);
      });

      it('should parse and send data', function() {
        expect(subject.xhr.sendArgs[0]).to.eql(JSON.stringify(subject.data));
      });

      it('should open xhr', function() {
        expect(subject.xhr.openArgs).to.eql([
          subject.method,
          subject.url,
          subject.async
        ]);
      });
    }

    beforeEach(function() {
      responseXhr = null;
      responseData = null;
    });

    describe('when xhr is a success and responds /w json', function() {
      var response = { works: true}, cb;

      beforeEach(function(done) {
        var xhr;
        request({
          data: data,
          url: url,
          method: 'PUT'
        });

        cb = callback.bind(this, done);
        subject.send(cb);

        //should be waiting inbetween requests
        expect(subject.waiting).to.be(true);

        xhr = subject.xhr;
        xhr.responseHeaders['content-type'] = 'application/json';
        xhr.readyState = 4;
        xhr.responseText = JSON.stringify(response);
        xhr.onreadystatechange();
      });

      it('should not be waiting after response', function() {
        expect(subject.waiting).to.be(false);
      });

      it('should send callback parsed data and xhr', function() {
        expect(responseXhr).to.be(subject.xhr);
        expect(responseData).to.eql(response);
      });


      opensXHR();
    });

  });



});
