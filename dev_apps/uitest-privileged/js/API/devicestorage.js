'use strict';

function getDeviceStorageByType(type) {
  var status = document.getElementById('status');
  status.innerHTML = '';

  console.log('Button Clicked: ' + type);
  var target = navigator.getDeviceStorage(type);

  var cursor = target.enumerate();

  cursor.onsuccess = function() {
    var file = this.result;
    console.log('File found:' + file.name);

    if (!this.done) {
      this.continue;
    }

    status.innerHTML = 'Success';
  };

  cursor.onerror = function() {
    console.log('Error: ' + this.error);
    status.innerHTML = this.error;
  };
}

function dsTest() {

  document.getElementById('get-music').addEventListener('click',
    function getMusic() {
      getDeviceStorageByType('music');
    }
  );

  document.getElementById('get-pictures').addEventListener('click',
    function getPictures() {
      getDeviceStorageByType('pictures');
    }
  );

  document.getElementById('get-sdcard').addEventListener('click',
    function getSDCard() {
      getDeviceStorageByType('sdcard');
    }
  );

  document.getElementById('get-videos').addEventListener('click',
    function getVideos() {
      getDeviceStorageByType('videos');
    }
  );

}

window.addEventListener('DOMContentLoaded', dsTest);
