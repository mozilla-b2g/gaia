'use strict';
/* global Search, eme, Promise */

requireApp('search/js/eme/eme.js');
requireApp('search/test/unit/mock_search.js');
requireApp('search/js/providers/provider.js');
requireApp('search/js/providers/bgimage.js');

suite('search/providers/bgimage', function() {

  var fakeElement, stubById, subject;

  setup(function(done) {
    fakeElement = document.createElement('div');
    fakeElement.style.cssText = 'height: 100px; display: block;';
    stubById = this.sinon.stub(document, 'getElementById')
                          .returns(fakeElement.cloneNode(true));
    requireApp('search/js/providers/bgimage.js', function() {
      subject = Search.providers.BGImage;
      subject.init();
      done();
    });
  });

  teardown(function() {
    stubById.restore();
  });

  suite('init', function() {
    test('calls eme.init', function() {
      var emeStub = this.sinon.stub(eme, 'init');
      subject.init();
      assert.ok(emeStub);
    });
  });

  suite('search', function() {
    test('calls clear', function() {
      var clearStub = this.sinon.stub(subject, 'clear');
      subject.search();
      assert.ok(clearStub.calledOnce);
    });
  });

  suite('clear', function() {
    test('removes styles', function() {
      document.body.classList.add('bgimage');
      document.body.style.backgroundImage = 'url(foo)';
      subject.clear();
      assert.equal(document.body.style.backgroundImage, '');
      assert.ok(!document.body.classList.contains('bgimage'));
    });
  });

  suite('fetchImage', function() {
    function promise() {
      return new Promise(function done() {});
    }

    setup(function() {
      eme.api = {
        Search: {
          bgimage: function() {
            return promise();
          }
        }
      };
    });

    test('calls clear', function() {
      var clearStub = this.sinon.stub(subject, 'clear');
      subject.search();
      assert.ok(clearStub.calledOnce);
    });

    test('calls clear', function() {
      var clearStub = this.sinon.stub(subject, 'clear');
      subject.search();
      assert.ok(clearStub.calledOnce);
    });

    test('make api call', function() {
      var stub = this.sinon.stub(eme.api.Search, 'bgimage');
      stub.returns(promise());
      subject.fetchImage();
      assert.ok(stub.calledOnce);
    });

    test('returns if eme.api.Search is null', function() {
      var currSearchApi = eme.api.Search;
      eme.api.Search = null;
      subject.fetchImage();
      eme.api.Search = currSearchApi;
    });
  });

  suite('formatImage', function() {
    test('returns image string', function(done) {
      var stub = this.sinon.stub(eme.api.Search, 'bgimage');
      var response = new Promise(function _resolve(resolve) {
        resolve({
          response: {
            image: 'somestr'
          }
        });
        setTimeout(function() {
          assert.equal(document.body.style.backgroundImage,
            'url("somestr")');
          done();
        });
      });
      stub.returns(response);
      subject.fetchImage();
      Promise.resolve(response);
    });

    test('returns data attribute for image/url', function(done) {
      var stub = this.sinon.stub(eme.api.Search, 'bgimage');
      var response = new Promise(function _resolve(resolve) {
        resolve({
          response: {
            image: {
              MIMEType: 'image/url',
              data: 'stubimgtype'
            }
          }
        });
        setTimeout(function() {
          assert.equal(document.body.style.backgroundImage,
            'url("stubimgtype")');
          done();
        });
      });
      stub.returns(response);
      subject.fetchImage();
      Promise.resolve(response);
    });

    test('returns null', function(done) {
      var stub = this.sinon.stub(eme.api.Search, 'bgimage');
      var response = new Promise(function _resolve(resolve) {
        resolve({
          response: {
            image: {
              MIMEType: ''
            }
          }
        });
        setTimeout(function() {
          assert.equal(document.body.style.backgroundImage,
            'url("null")');
          done();
        });
      });
      stub.returns(response);
      subject.fetchImage();
      Promise.resolve(response);
    });

    test('returns a data url', function(done) {
      var stub = this.sinon.stub(eme.api.Search, 'bgimage');
      var response = new Promise(function _resolve(resolve) {
        resolve({
          response: {
            image: {
              MIMEType: 'mime',
              data: 'stubimgtype'
            }
          }
        });
        setTimeout(function() {
          assert.equal(document.body.style.backgroundImage,
            'url("data:mime;base64,stubimgtype")');
          done();
        });
      });
      stub.returns(response);
      subject.fetchImage();
      Promise.resolve(response);
    });
  });
});
