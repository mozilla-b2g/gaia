'use strict';
/* global eme, Promise, Search */

requireApp('search/shared/js/everythingme/eme.js');
requireApp('search/test/unit/mock_search.js');
requireApp('search/js/providers/provider.js');

suite('search/providers/suggestions', function() {

  var fakeElement, stubById, clock, subject;

  setup(function(done) {
    clock = sinon.useFakeTimers();
    fakeElement = document.createElement('div');
    fakeElement.style.cssText = 'height: 100px; display: block;';
    stubById = this.sinon.stub(document, 'getElementById')
                          .returns(fakeElement.cloneNode(true));
    requireApp('search/js/providers/suggestions.js', function() {
      subject = Search.providers.Suggestions;
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
    test('calls setInput', function() {
      var stub = this.sinon.stub(Search, 'setInput');
      subject.click({
        target: {
          dataset: {
            suggestion: 'foo'
          }
        }
      });
      assert.ok(stub.calledWith('foo'));
    });
  });

  suite('search', function() {
    function promise() {
      return new Promise(function () {});
    }

    setup(function() {
      eme.api = {
        Search: {
          suggestions: function() {
            return new Promise(function(resolve) {
              resolve({});
            });
          }
        }
      };
    });

    test('clears results', function(done) {
      var stub = this.sinon.stub(subject, 'clear');
      subject.search().then(() => {
        assert.ok(stub.calledOnce);
        done();
      }, done);
    });

    test('makes api call', function() {
      eme.api.Search = {suggestions: function() {}};
      var stub = this.sinon.stub(eme.api.Search, 'suggestions');
      stub.returns(promise());
      subject.search();
      assert.ok(stub.calledOnce);
    });

    test('clears if new suggestions', function() {
      var stub = this.sinon.stub(subject, 'clear');
      subject.render([]);
      assert.ok(stub.calledOnce);
    });

    test('renders text in result', function() {
      subject.render(['[moz]illa']);
      var container = subject.container;
      assert.notEqual(container.innerHTML.indexOf('mozilla'), -1);
      assert.equal(container.querySelector('ul').getAttribute('role'),
        'listbox');
      assert.equal(container.querySelector('li').getAttribute('role'),
        'option');
    });
  });

});
