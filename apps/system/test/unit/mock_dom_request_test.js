'use strict';
/* global MockDOMRequest */

require('/shared/test/unit/mocks/mock_event_target.js');
require('/shared/test/unit/mocks/mock_dom_request.js');

suite('MockDOMRequest', function() {
  test('fireSuccess()', function(done) {
    var req = new MockDOMRequest();
    var result = {};

    req.onsuccess = function success(evt) {
      assert.equal(req.result, result, 'req.result === result');
      assert.equal(req.error, undefined, 'req.error === undefined');
      assert.equal(req.readyState, 'done', 'req.readyState === done');

      req.then(function(value) {
        assert.equal(value, result, 'resolve to result');
      }).then(done, done);
    };

    req.fireSuccess(result);
  });

  test('fireError()', function(done) {
    var req = new MockDOMRequest();
    var error = {};

    req.onerror = function success(evt) {
      assert.equal(req.result, undefined, 'req.result === undefined');
      assert.equal(req.error, error, 'req.error === error');
      assert.equal(req.readyState, 'done', 'req.readyState === done');

      req.then(function() {
        assert.ok(false, 'should not resolve');
      }, function(e) {
        assert.equal(e, error, 'reject to error');
      }).then(done, done);
    };

    req.fireError(error);
  });
});
