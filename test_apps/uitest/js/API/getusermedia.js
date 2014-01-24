'use stricts';

// This is an indivisual gUM test item, may be audio, video, or both
function gUMItem() {
  var video_status = false;
  var audio_status = false;
  var capturing = false;
  var constrain;

  var media;
  var video_frame;
  var video;
  var snapshots_frames;
  var audio;
  var startButtons;
  var stopButtons;
  var snapshotButton;
  var message;

  var snapshots = [];
  var saved_stream;

  this.init = function(content, i) {
    media = content.querySelector('[data-type="media"]');
    video_frame = content.querySelector('[data-type="video-frame"]');
    video = content.querySelector('video');
    snapshots_frames = content.querySelector('[data-type="snapshots-frames"]');
    audio = content.querySelector('audio');
    startButtons = content.querySelector('[data-type="startbuttons"]');
    stopButtons = content.querySelector('[data-type="stopbuttons"]');
    snapshotButton = content.querySelector('[data-type="snapshotButton"]');
    message = content.querySelector('[data-type="message"]');

    // remove them first, we will add them back when we need them
    media.removeChild(video_frame);
    media.removeChild(audio);

    // label button with index
    content.querySelector('[data-type="startVideoButton"]').textContent += i;
    content.querySelector('[data-type="startAudioButton"]').textContent += i;
    content.querySelector('[data-type="startAudioVideoButton"]').
                                                            textContent += i;

    content.querySelector('[data-type="startVideoButton"]').
                          addEventListener('click', startVideo);
    content.querySelector('[data-type="startAudioButton"]').
                          addEventListener('click', startAudio);
    content.querySelector('[data-type="startAudioVideoButton"]').
                          addEventListener('click', startAudioVideo);
    content.querySelector('[data-type="startDoubleRequest"]').
                          addEventListener('click', startDoubleRequest);
    content.querySelector('[data-type="stopButton"]').
                          addEventListener('click', stopMedia);
    content.querySelector('[data-type="pauseButton"]').
                          addEventListener('click', pauseMedia);
    content.querySelector('[data-type="snapshotButton"]').
                          addEventListener('click', startSnapshot);
  };

  function startVideo() {
    startMedia({video: true});
  }

  function startAudioVideo() {
    startMedia({video: true, audio: true});
  }

  function startAudio() {
    startMedia({audio: true});
  }

  function startDoubleRequest() {
    // empty request, just for prompt
    function empty() {}
    function success(stream) {
      message.innerHTML = '<p class="success">Double prompt!</p>';
    }
    function error(err) {
        message.innerHTML = '<p class="error">' + err + '</p>';
    }
    window.navigator.mozGetUserMedia({audio: true}, empty, error);
    window.navigator.mozGetUserMedia({audio: true}, success, error);
  }

  function startMedia(param) {
    constrain = param;
    function success(stream) {
      message.innerHTML = '<p class="success">Success!</p>';
      stopButtons.style.display = 'block';
      startButtons.style.display = 'none';

      if ('video' in constrain) {
        video_status = true;
        media.appendChild(video_frame);
        video.mozSrcObject = stream;
        video.play();
        snapshots_frames.innerHTML = '';
        stopButtons.appendChild(snapshotButton);
      }
      if ('audio' in constrain) {
        audio_status = true;
        media.appendChild(audio);
        audio.mozSrcObject = stream;
        audio.play();
      }
    }

    function error(err) {
      if (video_status)
        video_status = false;
        message.innerHTML = '<p class="error">' + err + '</p>';
    }
    window.navigator.mozGetUserMedia(param, success, error);
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

  function stopMedia() {
    message.innerHTML = '';
    if (video_status) {
      video.mozSrcObject.stop();
      video.mozSrcObject = null;
      snapshots = [];
      snapshots_frames.innerHTML = '';
      media.removeChild(video_frame);

      stopButtons.removeChild(snapshotButton);
      snapshotButton.textContent = 'Snapshot';

      capturing = false;
      video_status = false;
    }
    if (audio_status) {
      audio.mozSrcObject.stop();
      audio.mozSrcObject = null;
      media.removeChild(audio);

      audio_status = false;
    }
    saved_stream = null;

    stopButtons.style.display = 'none';
    startButtons.style.display = 'block';
  }

  function startSnapshot() {
    capturing = !capturing;
    if (capturing) {
      captureImage();
      snapshotButton.textContent = 'Stop Snapshot';
    } else {
      snapshotButton.textContent = 'Snapshot';
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
      snapshots_frames.innerHTML = '';
      for (var j = 0; j < snapshots.length; j++) {
        snapshots_frames.appendChild(snapshots[j]);
      }

      setTimeout(captureImage, 2000);
    }
  }
}

// You can modify max_instances to test more than one gUM instance
function gUMTest() {
  var max_instances = 2;
  var gUMItems = [];

  (function init() {
    var contents = document.getElementById('contents');
    for (var i = 0; i < max_instances; i++) {
      gUMItems[i] = new gUMItem;

      // display elements
      // first copy one from template then modify it.
      var template = document.getElementById('content_template');
      var content = template.cloneNode(true);
      content.id = 'content' + (i + 1);
      content.classList.remove('hidden');
      gUMItems[i].init(content, (i + 1));
      contents.appendChild(content);
    }
  })();
}

window.addEventListener('load', gUMTest);
