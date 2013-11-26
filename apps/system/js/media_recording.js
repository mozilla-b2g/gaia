'use strict';

// The visible indicator present in the Utility Tray
// indicating that the mic/camera is active at a target web url.
var MediaRecording = {
  isAudio: false,
  isVideo: false,
  isRecording: false,

  init: function mr_init() {
    this.container = document.getElementById('media-recoding-status-list');
    this.icon = this.container.querySelector('.icon');
    this.origin = this.container.querySelector('.origin');
    this.message = this.container.querySelector('.message');
    this.timer = this.container.querySelector('.timer');

    window.addEventListener('mozChromeEvent', this);
  },

  handleEvent: function mr_handleEvent(evt) {
    if (evt.detail.type !== 'recording-status') {
      return;
    }
    if (evt.detail.active) {
      this.isRecording = true;
      if (!this.container.classList.contains('displayed')) {
        var _ = navigator.mozL10n.get;
        this.container.classList.add('displayed');
        // Show proper icon
        if (this.isAudio != evt.detail.isAudio) {
          this.isAudio = evt.detail.isAudio;
        }
        if (this.isVideo != evt.detail.isVideo) {
          this.isVideo = evt.detail.isVideo;
        }

        if (this.isAudio && this.isVideo) {
          this.icon.style.backgroundImage =
            'url(style/media_recording/images/VideoRecorder.png)';
          this.message.textContent = _('media-is-on');
        } else if (this.isAudio) {
          this.icon.style.backgroundImage =
            'url(style/media_recording/images/Microphone.png)';
          this.message.textContent = _('microphone-is-on');
        } else if (this.isVideo) {
          this.icon.style.backgroundImage =
            'url(style/media_recording/images/Camera.png)';
          this.message.textContent = _('camera-is-on');
        }

        // Show proper app name or url
        if (evt.detail.isApp) {
          var app = Applications.getByManifestURL(evt.detail.requestURL);
          this.origin.textContent = new ManifestHelper(app.manifest).name;
        } else {
          var pathArray = evt.detail.requestURL.split('/');
          this.origin.textContent = pathArray[0] + '//' + pathArray[2];
        }

        this.updateTime(new Date());
      }
    } else {
      this.isRecording = false;
      if (this.container.classList.contains('displayed')) {
        this.container.classList.remove('displayed');
        this.isAudio = false;
        this.isVideo = false;
      }
    }
  },

  updateTime: function mr_updateTime(now) {
    var _ = navigator.mozL10n.get;
    var f = new navigator.mozL10n.DateTimeFormat();
    var sec = now.getSeconds();

    var formated = f.localeFormat(now, _('shortTimeFormat'));
    formated = formated.replace(/\s?(AM|PM)\s?/i, '<span>$1</span>');
    this.timer.innerHTML = formated;
  }
};

navigator.mozL10n.ready(MediaRecording.init.bind(MediaRecording));
