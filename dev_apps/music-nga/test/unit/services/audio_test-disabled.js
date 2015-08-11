'use strict';

var threads = require('components/threads/threads.js');
require('components/threads/service.js');
require('components/threads/client.js');

suite('Audio Music Service test', function() {

  suiteSetup(function() {
    console.log('starting SW');
    assert.ok('serviceWorker' in navigator, 'No service worker available');

    this.element = document.createElement('iframe');
    this.element.setAttribute('id', 'endpoint');
    this.element.setAttribute('src', 'test-endpoint.html');

    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(() => {
        assert.ok(true, 'Service worker registered');
      })
      .catch((error) => {
        assert.ok(false, 'Error ' + error);
      });

    var service = threads.service('*')
        .on('message', message => message.forward(
          document.getElementById('endpoint')))
        .listen();

    var client = threads.client('music-service',
                                document.getElementById('endpoint'));
    client.connect();
  });

  suiteTeardown(function() {
    document.body.removeChild(this.element);
    this.element = null;
  });

  suite('test test', function() {

    test('test test test', function() {
      console.log('my test test test');
    });
  });
});
