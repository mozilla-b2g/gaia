/* global Rest */

'use strict';

require('/shared/js/contacts/utilities/http_rest.js');

suite('> Rest utility class', function() {
  var restRequest, subject, xhr;

  var callbacks = {
    errorCallback: function() {},
    timeoutCallback: function() {},
    successCallback: function() {}
  };

  setup(function() {
    xhr = sinon.useFakeXMLHttpRequest();
    xhr.onCreate = function(x) {
      subject = x;
    };

    this.sinon.spy(callbacks, 'errorCallback');
    this.sinon.spy(callbacks, 'timeoutCallback');
    this.sinon.spy(callbacks, 'successCallback');

    restRequest = Rest.get('uri', callbacks);
    this.sinon.useFakeTimers();
  });

  teardown(function() {
    xhr.restore();
    this.sinon.clock.restore();
  });

  test('> Canceling a request doesnt trigger a retry (via error callback)',
   function() {
    this.sinon.spy(subject, 'abort');
    restRequest.cancel();
    this.sinon.clock.tick(50);
    sinon.assert.called(subject.abort);
    sinon.assert.callCount(callbacks.errorCallback, 0);
    sinon.assert.pass(restRequest.isCancelled());
  });
});
