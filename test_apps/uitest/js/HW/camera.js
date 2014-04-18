'use stricts';

function cameraTest() {
  var message = document.getElementById('message');
  var startBtn = document.getElementById('start');
  var storage = null;
  if ('getDeviceStorage' in navigator) {
    storage = navigator.getDeviceStorage('pictures');
  }
  if (storage == null) {
    message.textContent = 'No device storage found, test abort';
    startBtn.disabled = true;
    return;
  }
  storage.onchange = checkStorage;
  checkStorage();

  var video = document.getElementById('video');
  var container = document.getElementById('video-container');

  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');

  var localStream = null;
  var gestureDetector = null;

  // current transformation
  var posX = 0;
  var posY = 0;
  var scale = 1;
  var rotation = 0;

  document.getElementById('start').addEventListener('click', function() {
    document.getElementById('description').hidden = true;
    document.body.mozRequestFullScreen();
    // XXX: Only needed for fake image which is a temporary
    //      alternative before gUM complete
    screen.mozLockOrientation('portrait-primary');
    startVideo();
  });
  window.addEventListener('unload', stopMedia);

  function checkStorage() {
    message.textContent = 'Checking storage...';
    startBtn.disabled = true;

    var reqAvailable = storage.available();
    reqAvailable.onsuccess = reqAvailable.onerror = function() {
      if (this.result && this.result == 'available') {
        startBtn.disabled = false;
        message.textContent = '';
      }
      else
      {
        message.textContent = 'Insert SD before starting';
      }
    };
  }
  function videoTransform(x, y, s, r) {
    posX = x;
    posY = y;
    scale = s;
    rotation = r;

    video.style.MozTransform = 'translateX(' + posX + 'px) ' +
                               'translateY(' + posY + 'px) ' +
                               'scale(' + scale + ')' +
                               'rotate(' + rotation + 'deg)';
  }
  function handleTouchEvent(evt) {
    switch (evt.type) {
      case 'pan':
        var offsetX = evt.detail.relative.dx * Math.sqrt(scale);
        var offsetY = evt.detail.relative.dy * Math.sqrt(scale);
        // preventing out of bounds
        if (posX + offsetX > -video.videoWidth / 2 * (scale - 1) &&
            posX + offsetX < video.videoWidth / 2 * (scale - 1)) {
          posX += offsetX;
        }
        if (posY + offsetY > -video.videoHeight / 2 * (scale - 1) &&
            posY + offsetY < video.videoHeight / 2 * (scale - 1)) {
          posY += offsetY;
        }
        videoTransform(posX, posY, scale, rotation);
        break;

     case 'transform':
        // scaling speed
        var newScale = (evt.detail.relative.scale - 1) * 2 + 1;

        // preventing out of bounds
        if (scale * newScale < 1) {
          scale = 1;
        } else if (scale * newScale > 16) {
          scale = 16;
        } else {
          scale *= newScale;
        }
        if (posX < -video.videoWidth / 2 * (scale - 1)) {
          posX = -video.videoWidth / 2 * (scale - 1);
        } else if (posX > video.videoWidth / 2 * (scale - 1)) {
          posX = video.videoWidth / 2 * (scale - 1);
        }
        if (posY < -video.videoHeight / 2 * (scale - 1)) {
          posY = -video.videoHeight / 2 * (scale - 1);
        } else if (posY > video.videoHeight / 2 * (scale - 1)) {
          posY = video.videoHeight / 2 * (scale - 1);
        }
        videoTransform(posX, posY, scale, rotation);
        break;

      case 'dbltap':
        if (storage) {
          ctx.save();
          // set canvas to the correct position and
          // scale to what users acutally saw on screen
          ctx.transform(1, 0, 0, 1, posX, posY);
          ctx.transform(1, 0, 0, 1, canvas.width / 2, canvas.height / 2);
          ctx.transform(scale, 0, 0, scale, 0, 0);
          ctx.transform(1, 0, 0, 1, -canvas.width / 2, -canvas.height / 2);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          ctx.restore();

          var url = canvas.toDataURL();
          canvas.toBlob(function(blob) {
            // clear previous result
            storage.delete('shot-by-uitest-camera.png');
            var request = storage.addNamed(blob, 'shot-by-uitest-camera.png');
            request.onsuccess = function() {
              // play shutter sound
              var shutterSound = new Audio();
              shutterSound.src = '/data/SFX/shutter.ogg';
              shutterSound.play();

              console.log('picture saved');
            };

            // An error occur if a file with the same name already exist
            request.onerror = function() {
              console.log('Unable to write the file: ' + this.error.name);
            };
          });
        }
        break;
    }
  }

  function startVideo() {
    if ('mozGetUserMedia' in window.navigator) {
      window.navigator.mozGetUserMedia({video: true}, success, error);
    } else if ('webkitGetUserMedia' in window.navigator) {
      window.navigator.webkitGetUserMedia({video: true}, success, error);
    }
    else {
      alert('Does your browser support GetUserMedia?');
    }

    function success(stream) {
      localStream = stream;
      video.src = window.URL.createObjectURL(stream);
      video.play();

      // XXX: videoWidth is not available currently, so we try until it's not 0
      // see bug 926753
      video.addEventListener('loadedmetadata', function setDimension() {
        if (video.videoWidth != 0 && video.videoWidth != 'undefined' &&
            video.videoHeight != 0 && video.videoHeight != 'undefined') {
          canvas.width = video.width = video.videoWidth;
          canvas.width = video.height = video.videoHeight;
          canvas.style.width = container.style.width =
                                                 video.videoWidth + 'px';
          canvas.style.heigth = container.style.height =
                                                 video.videoHeight + 'px';

          gestureDetector = new GestureDetector(video);
          gestureDetector.startDetecting();
          img.addEventListener('pan', handleTouchEvent);
          img.addEventListener('transform', handleTouchEvent);
          img.addEventListener('dbltap', handleTouchEvent);
        }
        else
        {
          setTimeout(setDimension, 300);
        }
      });
    }

    function error(err) {
      console.log('getUserMedia failed: ' + error.name + '\n' +
            'use a fake image for camera video instead');

      // load an image (wallpaper) instead
      var parent = video.parentNode;
      parent.removeChild(video);
      var img = document.createElement('img');
      img.addEventListener('load', function() {
        console.log('<img> loaded');
        if (img.src) {
          // fake videoWidth/videoHeight
          img.videoWidth = img.clientWidth;
          img.videoHeight = img.clientHeight;

          canvas.width = img.width = img.clientWidth;
          canvas.height = img.height = img.clientHeight;
          canvas.style.width = container.style.width =
                                                 img.clientWidth + 'px';
          canvas.style.height = container.style.height =
                                                 img.clientHeight + 'px';

          gestureDetector = new GestureDetector(video);
          gestureDetector.startDetecting();
          img.addEventListener('pan', handleTouchEvent);
          img.addEventListener('transform', handleTouchEvent);
          img.addEventListener('dbltap', handleTouchEvent);
        }
      });
      parent.appendChild(img);

      // assign img to video to ensure other parts depending on video works
      video = img;

      // get current wallpaper
      var req = navigator.mozSettings.createLock().get('wallpaper.image');
      req.onsuccess = function() {
        img.src = window.URL.createObjectURL(this.result['wallpaper.image']);
      };
      req.onerror = function() {
        console.log(this.error.name);
      };
    }
  }

  function stopMedia() {
    if (localStream) {
      localStream.stop();
    }
    if (gestureDetector) {
      gestureDetector.stopDetecting();
    }
    video.src = null;
  }
}

window.addEventListener('load', function() {
  cameraTest();
});
