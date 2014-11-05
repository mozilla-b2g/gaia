/* global MocksHelper, hawk, Requester */

'use strict';

require('/shared/test/unit/mocks/mock_dump.js');
require('/shared/test/unit/mocks/mock_l10n.js');

var mocksForFindMyDevice = new MocksHelper([
  'Dump'
]).init();

suite('FindMyDevice >', function() {
  var realL10n;
  var fakeXHR;

  mocksForFindMyDevice.attachTestHelpers();

  suiteSetup(function(done) {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = window.MockL10n;

    window.Config = {
      api_url: 'https://find.firefox.com',
      api_version: 'v0'
    };

    // We require requester.js here and not above because
    // we want to make sure all of our dependencies have already
    // been loaded.
    require('/js/requester.js', function() {
      done();
    });
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    delete window.Config;
  });

  var xhr;
  setup(function() {
    xhr = null;
    fakeXHR = sinon.useFakeXMLHttpRequest();
    fakeXHR.onCreate = function(request) {
      xhr = request;
    };
  });

  teardown(function() {
    fakeXHR.restore();
  });

  test('url is properly loaded from configuration', function() {
    assert.equal(Requester._url, 'https://find.firefox.com/v0');
  });

  test('XHR is created with the correct properties', function() {
    Requester.post('/register');
    assert.equal(xhr.url, 'https://find.firefox.com/v0/register');
    assert.equal(xhr.requestHeaders['Content-Type'],
      'application/json;charset=utf-8');
    assert.equal(xhr.method, 'POST');
    assert.equal(xhr.timeout, Requester.XHR_TIMEOUT_MS);
  });

  test('onsuccess is called on successful server response', function() {
    var response = '{"ok": true}';
    var onsuccess = this.sinon.stub();
    Requester.post('/register', {}, onsuccess);

    xhr.respond(200, {'Content-type': 'application/json'}, response);
    sinon.assert.called(onsuccess);
  });

  test('onerror is called on failed server response', function() {
    var onerror = this.sinon.stub();
    Requester.post('/register', {}, null, onerror);

    xhr.respond(401, {}, '');
    sinon.assert.called(onerror);
  });

  test('onerror is called on timeout', function() {
    var onerror = this.sinon.stub();
    Requester.post('/register', {}, null, onerror);

    xhr.ontimeout();
    sinon.assert.called(onerror);
  });

  suite('HAWK credentials', function() {
    var hawkOptions = {
      credentials: {id: 'id', key: 'key', algorithm: 'sha256'},
      contentType: 'application/json',
      payload: '{}'
    };

    suiteSetup(function() {
      window.hawk = {
        client: {
          header: function() {
            return {field: 'header'};
          }
        }
      };

      Requester.setHawkCredentials('id', 'key');
    });

    suiteTeardown(function() {
      delete window.hawk;
    });

    setup(function() {
      this.sinon.spy(hawk.client, 'header');
    });

    test('HAWK credentials are included in the request', function() {
      Requester.post('/register', {});

      sinon.assert.calledWith(hawk.client.header,
        xhr.url, 'POST', hawkOptions);
      assert.equal(xhr.requestHeaders.Authorization,
        hawk.client.header().field);
    });

    test('ignore response if HAWK doesn\'t verify', function() {
      hawk.client.authenticate = function() {
        return false;
      };

      var onsuccess = this.sinon.stub();
      var onerror = this.sinon.stub();
      Requester.post('/register', {}, onsuccess, onerror);
      xhr.respond(200, {'Content-type': 'application/json'}, '{}');

      sinon.assert.notCalled(onsuccess);
      sinon.assert.notCalled(onerror);
    });
  });
});
