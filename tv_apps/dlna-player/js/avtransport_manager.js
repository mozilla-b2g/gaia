/* globals ServiceManager, Plug */
'use strict';

(function(exports) {
  function AVTManager() {

  }
  AVTManager.prototype = {
    __proto__: ServiceManager.prototype,

    prevButton: document.getElementById('remotePrev'),
    rewindButton: document.getElementById('remoteRewind'),
    playButton: document.getElementById('remotePlay'),
    pauseButton: document.getElementById('remotePause'),
    stopButton: document.getElementById('remoteStop'),
    ffButton: document.getElementById('remoteFF'),
    nextButton: document.getElementById('remoteNext'),
    avtSelector: document.getElementById('AVTList'),
    trackInfoBar: document.getElementById('trackInfoBar'),

    listElementId: 'AVTList',
    serviceType: 'upnp:urn:schemas-upnp-org:service:AVTransport:1',
    serviceConstructor: Plug.UPnP_AVTransport,

    serverView: function avtm_serverView(serviceWrapper) {
      var option = document.createElement('option');
      option.value = serviceWrapper.svc.id;
      option.textContent = serviceWrapper.friendlyName;

      return option;
    },
    get currentAVT() {
      var id = this.avtSelector[this.avtSelector.selectedIndex].value;
      return id == 'local' ? null : this.savedServices[id];
    },

    /* Manipulations */
    prev: function avtm_prev() {
      if (!this.currentAVT) {
        return;
      }
      this.currentAVT.previous(0).then(null, function(e) {
        console.log(e.description);
      });
    },
    next: function avtm_next() {
      if (!this.currentAVT) {
        return;
      }
      this.currentAVT.next(0).then(null, function(e) {
        console.log(e.description);
      });
    },
    play: function avtm_play() {
      if (!this.currentAVT) {
        return;
      }
      this.currentAVT.play(0);
    },
    pause: function avtm_pause() {
      if (!this.currentAVT) {
        return;
      }
      this.currentAVT.pause(0);
    },
    stop: function avtm_stop() {
      if (!this.currentAVT) {
        return;
      }
      this.currentAVT.stop(0);
    },
    ff: function avtm_getPositionInfo() {
      if (!this.currentAVT) {
        return Promise.reject();
      }
      return this.currentAVT.getPositionInfo(0).then(function(response) {
        return this.currentAVT.seek(
          '0', 'REL_TIME', this.timeDelta(response.data.RelTime, 10));
      }.bind(this));
    },
    rwd: function avtm_getPositionInfo() {
      if (!this.currentAVT) {
        return Promise.reject();
      }
      return this.currentAVT.getPositionInfo(0).then(function(response) {
        return this.currentAVT.seek(
          '0', 'REL_TIME', this.timeDelta(response.data.RelTime, -10));
      }.bind(this));
    },

    timeDelta: function avtm_timeDelta(string, deltasec) {
      var hms = string.split(':').map(x => parseInt(x));
      var date = new Date(0, 0, 1, hms[0], hms[1], hms[2] + deltasec);
      if (date.getYear == -1) {
        return '00:00:00';
      }
      return date.getHours() + ':' +
             date.getMinutes() + ':' +
             date.getSeconds();
    },

    getMediaInfo: function avtm_getMediaInfo() {
      if (!this.currentAVT) {
        return;
      }
      return this.currentAVT.getMediaInfo(0);
    },
    getPositionInfo: function avtm_getPositionInfo() {
      if (!this.currentAVT) {
        return Promise.reject();
      }
      return this.currentAVT.getPositionInfo(0);
    },

    updateTrackInfoBar: function avtm_updateTrackInfoBar() {
      trackInfoBar.textContent =
        '<<' + this.artist + ' - ' + this.title + '>>' +
        this.duration + '/' + (this.position ? this.position : '00:00:00');
    },

    updateMediaInfo: function avtm_updateMediaInfo() {
      return this.getMediaInfo().then(function(response) {
        if (!response || !response.data) {
          return;
        }
        var parser = new DOMParser();
        var metatree = parser.parseFromString(
              response.data.CurrentURIMetaData, 'text/xml');
        var titleElem = metatree.getElementsByTagName('dc:title')[0];
        var artistElem = metatree.getElementsByTagName('upnp:artist')[0];
        this.title = titleElem ? titleElem.textContent : 'Unknown Title';
        this.artist = artistElem ? artistElem.textContent : 'Unknown Artist';
        this.duration = response.data.MediaDuration;
        this.updateTrackInfoBar();
      }.bind(this));
    },
    updatePositionInfo: function avtm_getMediaInfo() {
      this.getPositionInfo().then(function(response) {
        if (!response || !response.data) {
          return;
        }

        this.position = response.data.RelTime;
        this.updateTrackInfoBar();
      }.bind(this));
    },

    init: function avtm_init() {
      ServiceManager.prototype.init.apply(this);

      this.pauseButton.addEventListener('click', this.pause.bind(this));
      this.playButton.addEventListener('click', this.play.bind(this));
      this.stopButton.addEventListener('click', this.stop.bind(this));

      this.prevButton.addEventListener('click', this.prev.bind(this));
      this.nextButton.addEventListener('click', this.next.bind(this));
      this.ffButton.addEventListener('click', this.ff.bind(this));
      this.rewindButton.addEventListener('click', this.rwd.bind(this));
      this.avtSelector.addEventListener(
        'change', this.updateMediaInfo.bind(this));
      setInterval(this.updatePositionInfo.bind(this), 1000);
      return this;
    }
  };
  exports.AVTManager = AVTManager;
})(window);
