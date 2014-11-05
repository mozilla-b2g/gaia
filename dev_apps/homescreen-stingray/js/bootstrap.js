/* global Homescreen */
'use strict';

window.addEventListener('load', function() {
  function loadDemoVideo(filename, callback) {
    var storage = navigator.getDeviceStorage('videos');
    var request = storage.get('/sdcard/' + filename);

    request.onsuccess = function() {
      callback(URL.createObjectURL(request.result));
    };

    request.onerror = function() {
      callback();
    };
  }

  function startHomescreen(demoVideoURL) {
    new Homescreen({ demoVideo: demoVideoURL }).start();
  }

  var fileList = ['demo.mp4', 'demo.webm'];

  loadDemoVideo(fileList.shift(), function handleLoaded(url) {
    if (url) {
      startHomescreen(url);
    } else if (fileList.length) {
      loadDemoVideo(fileList.shift(), handleLoaded);
    } else {
      startHomescreen();
    }
  });
});
