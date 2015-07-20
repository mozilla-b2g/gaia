/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/* global WeaveCrypto */

'use strict';

requireApp('system/js/sync/weave_crypto.js');

suite('system/sync/WeaveCrypto >', () => {
  var sendMessageSpy;
  var dispatchContentEventSpy;

  setup(() => {
    sendMessageSpy = sinon.spy(WeaveCrypto, 'sendMessage');
    dispatchContentEventSpy = sinon.spy(WeaveCrypto,
                                        'dispatchContentEvent');
  });

  teardown(() => {
    sendMessageSpy.restore();
    dispatchContentEventSpy.restore();
  });


  ['encrypt', 'decrypt'].forEach(method => {
    test(method + ' - missing param', done => {
      WeaveCrypto[method]().then(() => {
        assert.ok(false, 'Unexpected success');
        done();
      }).catch(error => {
        assert.ok(true, 'Expected rejection');
        assert.equal(error, 'Missing parameter');
        done();
      });
    });

    test(method + ' - resolved', done => {
      WeaveCrypto[method]('text', 'symmetricKey', 'iv').then(result => {
        assert.equal(result, 'result' + id);
        done();
      }).catch(error => {
        assert.ok(false, 'Unexpected error ' + error);
        done();
      });
      sinon.assert.calledOnce(sendMessageSpy);
      sinon.assert.calledOnce(dispatchContentEventSpy);
      var id = dispatchContentEventSpy.getCall(0).args[0].id;
      WeaveCrypto.onChromeEvent({
        detail: {
          id: id,
          result: 'result' + id
        }
      });
    });

    test(method + ' - rejected', done => {
      WeaveCrypto[method]('text', 'symmetricKey', 'iv').then(() => {
        assert.ok(false, 'Unexpected success');
        done();
      }).catch(error => {
        assert.ok(true, 'Expected error');
        assert.equal(error, 'error' + id);
        done();
      });
      sinon.assert.calledOnce(sendMessageSpy);
      sinon.assert.calledOnce(dispatchContentEventSpy);
      var id = dispatchContentEventSpy.getCall(0).args[0].id;
      WeaveCrypto.onChromeEvent({
        detail: {
          id: id,
          error: 'error' + id
        }
      });
    });
  });

  test('generateRandomIV - resolved', done => {
    WeaveCrypto.generateRandomIV().then(result => {
      assert.equal(result, 'result' + id);
      done();
    }).catch(error => {
      assert.ok(false, 'Unexpected error ' + error);
      done();
    });
    sinon.assert.calledOnce(sendMessageSpy);
    sinon.assert.calledOnce(dispatchContentEventSpy);
    var id = dispatchContentEventSpy.getCall(0).args[0].id;
    WeaveCrypto.onChromeEvent({
      detail: {
        id: id,
        result: 'result' + id
      }
    });
  });

  test('generateRandomIV - rejected', done => {
    WeaveCrypto.generateRandomIV().then(() => {
      assert.ok(false, 'Unexpected success');
      done();
    }).catch(error => {
      assert.ok(true, 'Expected error');
      assert.equal(error, 'error' + id);
      done();
    });
    sinon.assert.calledOnce(sendMessageSpy);
    sinon.assert.calledOnce(dispatchContentEventSpy);
    var id = dispatchContentEventSpy.getCall(0).args[0].id;
    WeaveCrypto.onChromeEvent({
      detail: {
        id: id,
        error: 'error' + id
      }
    });
  });

});
