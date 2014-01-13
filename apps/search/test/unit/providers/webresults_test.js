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
    test('triggers eme init', function() {
      var stub = this.sinon.stub(eme, 'init');
      subject.init();
      assert.ok(stub.calledOnce);
    });
  });

  suite('click', function() {
    test('calls browser', function() {
      var stub = this.sinon.stub(Search, 'navigate');
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
    function promise() {
      return new Promise(function done() {});
    }

    setup(function() {
      eme.api = {
        Apps: {
          search: function() {
            return promise();
          }
        }
      };
    });

    test('clears results', function() {
      var stub = this.sinon.stub(subject, 'clear');
      subject.search();
      assert.ok(stub.calledOnce);
    });

    test('make api call', function() {
      var stub = this.sinon.stub(eme.api.Apps, 'search');
      stub.returns(promise());
      subject.search();
      assert.ok(stub.calledOnce);
    });

    test('renders text in result', function() {
      subject.render([{title: 'mozilla'}]);
      var container = subject.container;
      assert.notEqual(container.innerHTML.indexOf('mozilla'), -1);
    });
  });

});
