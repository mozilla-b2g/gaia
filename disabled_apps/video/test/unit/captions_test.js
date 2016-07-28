/* global Captions */
'use strict';

requireApp('/video/js/captions.js');

suite('captions.js unit tests', function() {
  var player, captions, realGetDeviceStorage;

  var mockVTTFile = new Blob(['fake vtt file'], { type: 'text/vtt' });
  var mockGetRequest;

  function mockGetDeviceStorage(type) {
    return {
      get: function(filename) {
        mockGetRequest.requestedFilename = filename;
        return mockGetRequest;
      }
    };
  }

  setup(function() {
    player = document.createElement('video');
    captions = new Captions(player);
    realGetDeviceStorage = navigator.getDeviceStorage;
    navigator.getDeviceStorage = mockGetDeviceStorage;
    mockGetRequest = { result: mockVTTFile };
  });

  teardown(function() {
    navigator.getDeviceStorage = realGetDeviceStorage;
  });

  test('remove() removes track elements from player', function() {
    player.appendChild(document.createElement('track'));
    player.appendChild(document.createElement('track'));
    assert.equal(player.querySelectorAll('track').length, 2);
    captions.remove();
    assert.equal(player.querySelectorAll('track').length, 0);
  });

  test('findAndDisplay() looks for a .vtt file', function() {
    captions.findAndDisplay('foo/bar.mp4');
    assert.equal(mockGetRequest.requestedFilename, 'foo/bar.vtt');
  });

  test('findAndDisplay() adds a track element if captions exist', function() {
    captions.findAndDisplay('foo.mp4');
    mockGetRequest.onsuccess();  // A captions file was found
    assert.equal(player.querySelectorAll('track').length, 1);
  });

  test('findAndDisplay() adds a showing track element', function() {
    captions.findAndDisplay('foo.mp4');
    mockGetRequest.onsuccess();  // A captions file was found
    assert.equal(player.querySelector('track').track.mode, 'showing');
  });

  test('findAndDisplay() adds no track element if no captions', function() {
    captions.findAndDisplay('foo.mp4');
    if (mockGetRequest.onerror) {
      mockGetRequest.onerror();  // No captions file was found
    }
    assert.equal(player.querySelectorAll('track').length, 0);
  });
});
