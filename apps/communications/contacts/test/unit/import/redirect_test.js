/* global Redirect */
'use strict';

requireApp('communications/redirects/redirect.js');


suite('OAuth redirect', function() {

  var openerDefinition;

  var myOpenerObject = {
    postMessage: function() {}
  };

  suiteSetup(function() {
    openerDefinition = Object.getOwnPropertyDescriptor(window, 'opener');

    Object.defineProperty(window, 'opener', {
       writable: true,
       enumerable: true,
       configurable: true,
       value: myOpenerObject
    });

    sinon.stub(window, 'close', function() {

    });
  });

  setup(function() {
    window.close.reset();
  });

  suiteTeardown(function() {
    Object.defineProperty(window, 'opener', openerDefinition);
    window.close.restore();
  });

  suite('> Recirect with valid access token', function() {
    test('> Check token', function() {
      this.sinon.spy(window.opener, 'postMessage');
      document.location.hash = 'access_token=ok';
      Redirect.init();

      sinon.assert.pass(window.close.calledOnce);
      sinon.assert.pass(myOpenerObject.postMessage.calledOnce);
      sinon.assert.calledWith(myOpenerObject.postMessage,
        {'access_token': 'ok'});
    });

    test('> Check parameters', function() {
      this.sinon.spy(window.opener, 'postMessage');
      document.location.hash = 'access_token=ok&param1=1&param2=2';
      Redirect.init();

      sinon.assert.pass(window.close.calledOnce);
      sinon.assert.pass(myOpenerObject.postMessage.calledOnce);
      sinon.assert.calledWith(myOpenerObject.postMessage,
        {
          'access_token': 'ok',
          'param1': '1',
          'param2': '2'
        }
      );
    });
  });

  suite('> Redirect with invalid access token', function() {
    test('No access token', function() {
      this.sinon.spy(window.opener, 'postMessage');
      document.location.hash = 'invalid';
      Redirect.init();

      sinon.assert.pass(window.close.calledOnce);
      sinon.assert.callCount(myOpenerObject.postMessage, 0);
    });
  });

});
