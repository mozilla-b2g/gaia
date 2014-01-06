'use strict';

requireApp('search/js/eme/eme.js');
requireApp('search/test/unit/mock_search.js');
requireApp('search/js/providers/provider.js');
requireApp('search/js/providers/app_provider.js');

suite('search/providers/webresults', function() {

  var fakeElement, stubById, clock, subject;

  setup(function(done) {
    clock = sinon.useFakeTimers();
    fakeElement = document.createElement('div');
    fakeElement.style.cssText = 'height: 100px; display: block;';
    stubById = this.sinon.stub(document, 'getElementById')
                          .returns(fakeElement.cloneNode(true));
    requireApp('search/js/providers/webresults.js', function() {
      subject = Search.providers.WebResults;
      done();
    });
  });

  teardown(function() {
    stubById.restore();
    clock.restore();
  });

  suite('init', function() {
    test('opens the eme port', function() {
      var stub = this.sinon.stub(eme, 'openPort');
      subject.init();
      assert.ok(stub.calledOnce);
    });
  });

  suite('click', function() {
    test('calls browser', function() {
      var stub = this.sinon.stub(Search, 'browse');
      subject.click({
        target: {
          dataset: {
            url: 'http://mozilla.org'
          }
        }
      });
      assert.ok(stub.calledWith('http://mozilla.org'));
    });
  });

  suite('search', function() {

    setup(function() {
      eme.port = {
        postMessage: function() {}
      };
    });

    test('clears results', function() {
      var stub = this.sinon.stub(subject, 'clear');
      subject.search();
      assert.ok(stub.calledOnce);
    });

    test('eme port receives message', function() {
      var stub = this.sinon.stub(eme.port, 'postMessage');
      subject.search();
      clock.tick(1); // Next tick
      assert.ok(stub.calledOnce);
    });
  });

  suite('onmessage', function() {
    test('renders text in result', function() {
      subject.onmessage({data: {
        results: [{title: 'mozilla'}]
      }});
      var container = subject.container;
      assert.notEqual(container.innerHTML.indexOf('mozilla'), -1);
    });
  });

});
