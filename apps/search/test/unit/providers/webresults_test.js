'use strict';
/* global eme, Promise, Search */

requireApp('search/shared/js/everythingme/eme.js');
requireApp('search/test/unit/mock_search.js');
requireApp('search/js/providers/provider.js');
requireApp('search/js/providers/grid_provider.js');

suite('search/providers/webresults', function() {

  var clock, subject;

  setup(function(done) {
    clock = sinon.useFakeTimers();
    requireApp('search/js/providers/webresults.js', function() {
      subject = Search.providers.WebResults;
      done();
    });
  });

  teardown(function() {
    clock.restore();
  });

  suite('init', function() {
    test('triggers eme init', function() {
      var stub = this.sinon.stub(eme, 'init');
      subject.init();
      assert.ok(stub.calledOnce);
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

    test('make api call', function() {
      var stub = this.sinon.stub(eme.api.Apps, 'search');
      stub.returns(promise());
      subject.search();
      assert.ok(stub.calledOnce);
    });

  });

});
