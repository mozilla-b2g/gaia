function gUMTest() {
  var video_status = false;
  var video = document.createElement('video');
  video.setAttribute('width', 640);
  video.setAttribute('height', 480);

  var snapshots = [];

  var audio_status = false;
  var audio = document.createElement('audio');
  audio.setAttribute('controls', true);

  var picture_status = false;
  var picture = document.createElement('img');

  var start = document.getElementById('startbuttons');
  var stop = document.getElementById('stopbuttons');

  var message = document.getElementById('message');
  var content = document.getElementById('content');
  var frames = document.getElementById('frames');
  var snapshot = document.getElementById('snapshotButton');

  var saved_stream = null;
  var capturing = false;

  (function init() {
    document.getElementById('startVideoButton').addEventListener('click', startVideo.bind(this));
    document.getElementById('startAudioButton').addEventListener('click', startAudio.bind(this));
    document.getElementById('startAudioVideoButton').addEventListener('click', startAudioVideo.bind(this));
    document.getElementById('startPictureButton').addEventListener('click', startPicture.bind(this));
    document.getElementById('stopButton').addEventListener('click', stopMedia.bind(this));
    document.getElementById('pauseButton').addEventListener('click', pauseMedia.bind(this));
    document.getElementById('snapshotButton').addEventListener('click', startSnapshot.bind(this));
  })();

  function startVideo() {
    video_status = true;
    startMedia({video: true});
  }

  function startAudioVideo() {
    video_status = true;
    audio_status = true;
    startMedia({video: true, audio: true});
  }

  function startAudio() {
    audio_status = true;
    startMedia({audio: true});
  }

  function startPicture() {
    picture_status = true;
    startMedia({picture: true});
  }

  function stopMedia() {
    message.innerHTML = '';
    if (video_status) {
      video.mozSrcObject.stop();
      video.mozSrcObject = null;
      content.removeChild(video);
      stopbuttons.removeChild(snapshot);
      snapshot.value = 'Snapshot';
      frames.innerHTML = '';
      capturing = false;
      video_status = false;
    } else if (audio_status) {
      audio.mozSrcObject.stop();
      audio.mozSrcObject = null;
      content.removeChild(audio);
      audio_status = false;
    } else if (picture_status) {
      picture.mozSrcObject = null;
      content.removeChild(picture);
      picture_status = false;
    }
    saved_stream = null;
    stop.style.display = 'none';
    start.style.display = 'block';
  }

  function pauseMedia() {
    if (saved_stream) {
      if (video_status) {
        video.mozSrcObject = saved_stream;
        video.play();
      } else if (audio_status) {
        audio.mozSrcObject = saved_stream;
        audio.play();
      }
      saved_stream = null;
    } else {
      if (video_status) {
        video.pause();
        saved_stream = video.mozSrcObject;
        video.mozSrcObject = null;
      } else if (audio_status) {
        audio.pause();
        saved_stream = audio.mozSrcObject;
        audio.mozSrcObject = null;
      }
    }
  }

  function startMedia(param) {
    function success(stream) {
      message.innerHTML = '<p class="success">Success!</p>';
      stop.style.display = 'block';
      start.style.display = 'none';
      if (video_status) {
        content.appendChild(video);
        video.mozSrcObject = stream;
        video.play();
        frames.innerHTML = '';
        stopbuttons.appendChild(snapshot);
      } else if (audio_status) {
        content.appendChild(audio);
        audio.mozSrcObject = stream;
        audio.play();
      } else if (picture_status) {
        content.appendChild(picture);
        picture.src = window.URL.createObjectURL(stream);
        picture.onload = function(e) {
          window.URL.revokeObjectURL(this.src);
        };
      }
    }

    function error(err) {
        message.innerHTML = '<p class="error">' + err + '</p>';
    }
    window.navigator.mozGetUserMedia(param, success, error);
  }

  function startSnapshot() {
    capturing = !capturing;
    if (capturing) {
      captureImage();
      snapshot.value = 'Stop Snapshot';
    } else {
      snapshot.value = 'Snapshot';
    }
  }

  function captureImage() {
    if (video_status && capturing) {
      //dump('Capturing len ' + snapshots.length + '\n');
      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d');

      canvas.width = video.videoWidth / 4;
      canvas.height = video.videoHeight / 4;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      if (snapshots.unshift(canvas) > 4)
        snapshots.length = 4;
      frames.innerHTML = '';
      for (var i = 0; i < snapshots.length; i++) {
        frames.appendChild(snapshots[i]);
      }

      setTimeout(captureImage, 2000);
    }
  }
}

window.addEventListener('load', gUMTest);
