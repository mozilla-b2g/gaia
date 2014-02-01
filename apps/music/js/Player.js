'use strict';

// We have four types of the playing sources
// These are for player to know which source type is playing
var TYPE_MIX = 'mix';
var TYPE_LIST = 'list';
var TYPE_SINGLE = 'single';
var TYPE_BLOB = 'blob';

// Repeat option for player
var REPEAT_OFF = 0;
var REPEAT_LIST = 1;
var REPEAT_SONG = 2;

// AVRCP spec defined the statuses in capitalized and to be simple,
// our player just use them instead of defining new constant strings.
var PLAYSTATUS_STOPPED = 'STOPPED';
var PLAYSTATUS_PLAYING = 'PLAYING';
var PLAYSTATUS_PAUSED = 'PAUSED';
var PLAYSTATUS_FWD_SEEK = 'FWD_SEEK';
var PLAYSTATUS_REV_SEEK = 'REV_SEEK';
var PLAYSTATUS_ERROR = 'ERROR';

// We get headphoneschange event when the headphones is plugged or unplugged
// A related Bug 809106 in Bugzilla
var acm = navigator.mozAudioChannelManager;

if (acm) {
  acm.addEventListener('headphoneschange', function onheadphoneschange() {
    if (!acm.headphones && PlayerView.playStatus === PLAYSTATUS_PLAYING) {
      PlayerView.pause();
    }
  });
}

window.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    PlayerView.audio.removeEventListener('timeupdate', PlayerView);
  } else {
    PlayerView.audio.addEventListener('timeupdate', PlayerView);
  }
});

// View of Player
var PlayerView = {
  get view() {
    delete this._view;
    return this._view = document.getElementById('views-player');
  },

  get audio() {
    delete this._audio;
    return this._audio = document.getElementById('player-audio');
  },

  get playStatus() {
    return this._playStatus;
  },

  set playStatus(val) {
    this._playStatus = val;
  },

  get dataSource() {
    return this._dataSource;
  },

  set dataSource(source) {
    this._dataSource = source;

    if (this.sourceType) {
      if (this.sourceType === TYPE_MIX || this.sourceType === TYPE_LIST) {
        // Shuffle button will be disabled if an album only contains one song
        this.shuffleButton.disabled = (this._dataSource.length < 2);

        // Also, show or hide the Now Playing button depending on
        // whether content is queued
        TitleBar.playerIcon.hidden = (this._dataSource.length < 1);
      } else {
        // These buttons aren't necessary when playing a blob or a single track
        this.shuffleButton.disabled = true;
        this.repeatButton.disabled = true;
        this.previousControl.disabled = true;
        this.nextControl.disabled = true;
      }
    }
  },

  init: function pv_init() {
    this.artist = document.getElementById('player-cover-artist');
    this.album = document.getElementById('player-cover-album');

    this.timeoutID;
    this.cover = document.getElementById('player-cover');
    this.coverImage = document.getElementById('player-cover-image');
    this.offscreenImage = new Image();
    this.shareButton = document.getElementById('player-cover-share');

    this.repeatButton = document.getElementById('player-album-repeat');
    this.shuffleButton = document.getElementById('player-album-shuffle');

    this.ratings = document.getElementById('player-album-rating').children;

    this.seekRegion = document.getElementById('player-seek-bar');
    this.seekBar = document.getElementById('player-seek-bar-progress');
    this.seekIndicator = document.getElementById('player-seek-bar-indicator');
    this.seekElapsed = document.getElementById('player-seek-elapsed');
    this.seekRemaining = document.getElementById('player-seek-remaining');

    this.playControl = document.getElementById('player-controls-play');
    this.previousControl = document.getElementById('player-controls-previous');
    this.nextControl = document.getElementById('player-controls-next');

    this.banner = document.getElementById('info-banner');

    this.isTouching = false;
    this.isFastSeeking = false;
    this.playStatus = PLAYSTATUS_STOPPED;
    this.pausedPosition = null;
    this.dataSource = [];
    this.playingBlob = null;
    this.currentIndex = 0;
    this.setSeekBar(0, 0, 0); // Set 0 to default seek position
    this.intervalID = null;

    this.view.addEventListener('click', this);
    this.view.addEventListener('contextmenu', this);

    // Seeking audio too frequently causes the Desktop build hangs
    // A related Bug 739094 in Bugzilla
    this.seekRegion.addEventListener('touchstart', this);
    this.seekRegion.addEventListener('touchmove', this);
    this.seekRegion.addEventListener('touchend', this);
    this.previousControl.addEventListener('touchend', this);
    this.nextControl.addEventListener('touchend', this);

    this.audio.addEventListener('play', this);
    this.audio.addEventListener('pause', this);
    this.audio.addEventListener('playing', this);
    this.audio.addEventListener('durationchange', this);
    this.audio.addEventListener('timeupdate', this);
    this.audio.addEventListener('ended', this);

    // A timer we use to work around
    // https://bugzilla.mozilla.org/show_bug.cgi?id=783512
    this.endedTimer = null;
  },

  // When SCO is connected, music is unable to play sounds even it's in the
  // foreground, this is a limitation for 1.3, see bug 946556. To adapt this,
  // we regulate the controls to restrict some actions and hope it can give
  // better ux to the specific scenario.
  checkSCOStatus: function pv_checkSCOStatus() {
    var SCOStatus = MusicComms.isSCOEnabled;

    this.playControl.disabled = this.previousControl.disabled =
      this.nextControl.disabled = SCOStatus;

    this.seekRegion.parentNode.classList.toggle('disabled', SCOStatus);
    this.banner.classList.toggle('visible', SCOStatus);
  },

  clean: function pv_clean() {
    // Cancel a pending enumeration before start a new one
    if (typeof playerHandle !== 'undefined' && playerHandle)
      musicdb.cancelEnumeration(playerHandle);

    this.dataSource = [];
    this.playingBlob = null;
  },

  setSourceType: function pv_setSourceType(type) {
    this.sourceType = type;
  },

  // We only use the DBInfo for playing all songs.
  setDBInfo: function pv_setDBInfo(info) {
    this.DBInfo = info;
    this.dataSource.length = info.count;
  },

  // This function is for the animation on the album art (cover).
  // The info (album, artist) will initially show up when a song being played,
  // if users does not tap the album art (cover) again,
  // then it will be disappeared after 5 seconds
  // however, if a user taps before 5 seconds ends,
  // then the timeout will be cleared to keep the info on screen.
  showInfo: function pv_showInfo() {
    this.cover.classList.add('slideOut');

    if (this.timeoutID)
      window.clearTimeout(this.timeoutID);

    this.timeoutID = window.setTimeout(
      function pv_hideInfo() {
        this.cover.classList.remove('slideOut');
      }.bind(this),
      5000
    );
  },

  setInfo: function pv_setInfo(fileinfo) {
    var metadata = fileinfo.metadata;

    // Handle the title bar and the share button when the player is not launched
    // by open activity.
    if (typeof ModeManager !== 'undefined') {
      ModeManager.playerTitle = metadata.title;
      ModeManager.updateTitle();

      // If it is a locked music file, or if we are handling a Pick activity
      // then we should not give the user the option of sharing the file.
      if (metadata.locked || pendingPick) {
        this.shareButton.classList.add('hidden');
        this.artist.classList.add('hidden-cover-share');
        this.album.classList.add('hidden-cover-share');
      } else {
        this.shareButton.classList.remove('hidden');
        this.artist.classList.remove('hidden-cover-share');
        this.album.classList.remove('hidden-cover-share');
      }
    } else {
      var titleBar = document.getElementById('title-text');

      titleBar.textContent = metadata.title || unknownTitle;
      titleBar.dataset.l10nId = metadata.title ? '' : unknownTitleL10nId;
    }

    this.artist.textContent = metadata.artist || unknownArtist;
    this.artist.dataset.l10nId = metadata.artist ? '' : unknownArtistL10nId;
    this.album.textContent = metadata.album || unknownAlbum;
    this.album.dataset.l10nId = metadata.album ? '' : unknownAlbumL10nId;

    this.setCoverImage(fileinfo);
  },

  setCoverImage: function pv_setCoverImage(fileinfo) {
    // Reset the image to be ready for fade-in
    this.offscreenImage.src = '';
    this.coverImage.classList.remove('fadeIn');

    getThumbnailURL(fileinfo, function(url) {
      url = url || generateDefaultThumbnailURL(fileinfo.metadata);
      this.offscreenImage.addEventListener('load', pv_showImage.bind(this));
      this.offscreenImage.src = url;
    }.bind(this));

    function pv_showImage(evt) {
      evt.target.removeEventListener('load', pv_showImage);
      var url = 'url(' + this.offscreenImage.src + ')';
      this.coverImage.style.backgroundImage = url;
      this.coverImage.classList.add('fadeIn');
    };
  },

  setOptions: function pv_setOptions(settings) {
    var repeatOption = (settings && settings.repeat) ?
      settings.repeat : REPEAT_OFF;
    var shuffleOption = (settings && settings.shuffle) ?
      settings.shuffle : false;

    this.setRepeat(repeatOption);
    this.setShuffle(shuffleOption);
  },

  setRepeat: function pv_setRepeat(value) {
    var repeatClasses = ['repeat-off', 'repeat-list', 'repeat-song'];

    // Remove all repeat classes before applying a new one
    repeatClasses.forEach(function pv_resetRepeat(targetClass) {
      this.repeatButton.classList.remove(targetClass);
    }.bind(this));

    this.repeatOption = value;
    this.repeatButton.classList.add(repeatClasses[this.repeatOption]);
  },

  setShuffle: function pv_setShuffle(value, index) {
    this.shuffleOption = value;

    if (this.shuffleOption) {
      this.shuffleButton.classList.add('shuffle-on');
      // if index exists, that means player is playing a list,
      // so shuffle that list with the index
      // or just create one with a random number
      if (arguments.length > 1) {
        this.shuffleList(this.currentIndex);
      } else {
        this.shuffleList();
      }
    } else {
      this.shuffleButton.classList.remove('shuffle-on');
    }
  },

  setRatings: function pv_setRatings(rated) {
    for (var i = 0; i < 5; i++) {
      var rating = this.ratings[i];

      if (i < rated) {
        rating.classList.add('star-on');
      } else {
        rating.classList.remove('star-on');
      }
    }
  },

  shuffleList: function slv_shuffleList(index) {
    if (this.dataSource.length === 0)
      return;

    this.shuffleIndex = 0;
    this.shuffledList = [];

    for (var i = 0; i < this.dataSource.length; i++)
      this.shuffledList.push(i);

    // If with an index, that means the index is the currectIndex
    // so it doesn't need to be shuffled
    // It will be placed to the first element of shuffled list
    // then we append the rest shuffled indexes to it
    // to become a new shuffled list
    if (arguments.length > 0) {
      var currentItem = this.shuffledList.splice(index, 1);

      slv_shuffle(this.shuffledList);
      this.shuffledList = currentItem.concat(this.shuffledList);
    } else {
      slv_shuffle(this.shuffledList);
    }

    // shuffle the elements of array a in place
    // http://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
    function slv_shuffle(a) {
      for (var i = a.length - 1; i >= 1; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        if (j < i) {
          var tmp = a[j];
          a[j] = a[i];
          a[i] = tmp;
        }
      }
    }
  },

  getMetadata: function pv_getMetadata(blob, callback) {
    parseAudioMetadata(blob, pv_gotMetadata, pv_metadataError.bind(this));

    function pv_gotMetadata(metadata) {
      callback(metadata);
    }
    function pv_metadataError(e) {
      if (this.onerror)
        this.onerror(e);
      console.warn('parseAudioMetadata: error parsing metadata - ', e);
    }
  },

  setAudioSrc: function pv_setAudioSrc(file) {
    var url = URL.createObjectURL(file);
    this.playingBlob = file;
    // Reset src before we set a new source to the audio element
    this.audio.removeAttribute('src');
    this.audio.load();
    // Add mozAudioChannelType to the player
    this.audio.mozAudioChannelType = 'content';
    this.audio.src = url;
    this.audio.load();

    this.audio.play();
    // An object URL must be released by calling URL.revokeObjectURL()
    // when we no longer need them
    this.audio.onloadeddata = function(evt) { URL.revokeObjectURL(url); };
    this.audio.onerror = (function(evt) {
      if (this.onerror)
        this.onerror(evt);
    }).bind(this);
    // when play a new song, reset the seekBar first
    // this can prevent showing wrong duration
    // due to b2g cannot get some mp3's duration
    // and the seekBar can still show 00:00 to -00:00
    this.setSeekBar(0, 0, 0);

    if (this.endedTimer) {
      clearTimeout(this.endedTimer);
      this.endedTimer = null;
    }
  },

  updateRemoteMetadata: function pv_updateRemoteMetadata() {
    // If MusicComms does not exist or data source is empty, we don't have to
    // update the metadata.
    if (typeof MusicComms === 'undefined' || this.dataSource.length === 0)
      return;

    // Update the playing information to AVRCP devices
    var fileinfo = this.dataSource[this.currentIndex];
    var metadata = fileinfo.metadata;

    // AVRCP expects the duration in ms, note that it's converted from s to ms.
    var notifyMetadata = {
      title: metadata.title || unknownTitle,
      artist: metadata.artist || unknownArtist,
      album: metadata.album || unknownAlbum,

      duration: this.audio.duration * 1000,
      mediaNumber: this.currentIndex + 1,
      totalMediaCount: this.dataSource.length
    };

    // Grab the album art if this is a new song; otherwise, don't bother, since
    // listeners should already have the album art. Note: if no .picture
    // attribute is in the metadata, then listeners should reuse the previous
    // picture. If .picture is null, something went wrong and listeners should
    // probably use a blank picture (or their own placeholder).
    if (this.audio.currentTime === 0) {
      getAlbumArtBlob(fileinfo, function(err, blob) {
        if (!err) {
          if (blob)
            notifyMetadata.picture = blob;
        } else {
          notifyMetadata.picture = null;
        }
        MusicComms.notifyMetadataChanged(notifyMetadata);
      });
    }
    else {
      MusicComms.notifyMetadataChanged(notifyMetadata);
    }
  },

  updateRemotePlayStatus: function pv_updateRemotePlayStatus() {
    // If MusicComms does not exist then no need to update the play status.
    if (typeof MusicComms === 'undefined')
      return;

    var position = this.pausedPosition ?
      this.pausedPosition : this.audio.currentTime;

    var info = {
      playStatus: this.playStatus,
      duration: this.audio.duration * 1000,
      position: position * 1000
    };

    // Before we resume the player, we need to keep the paused position
    // because once the connected A2DP device receives different positions
    // on AFTER paused and BEFORE playing, it will break the play/pause states
    // that the A2DP device kept.
    this.pausedPosition = (this.playStatus === PLAYSTATUS_PLAYING) ?
      null : this.audio.currentTime;

    // Notify the remote device that status is changed.
    MusicComms.notifyStatusChanged(info);
  },

  // The song data might return from the existed dataSource
  // or we will retrieve it directly from the MediaDB.
  getSongData: function pv_getSongData(index, callback) {
    var info = this.DBInfo;
    var songData = this.dataSource[index];

    if (songData) {
      callback(songData);
    } else {
      // Cancel the ongoing enumeration so that it will not
      // slow down the next enumeration if we start a new one.
      ListView.cancelEnumeration();

      var handle =
        musicdb.advancedEnumerate(
          info.key, info.range, info.direction, index, function(record) {
            musicdb.cancelEnumeration(handle);
            this.dataSource[index] = record;
            callback(record);
          }.bind(this)
        );
    }
  },

  /*
   * Get a blob for the specified song, decrypting it if necessary,
   * and pass it to the specified callback
   */
  getFile: function pv_getFile(songData, callback) {
    if (!songData.metadata.locked) {
      musicdb.getFile(songData.name, callback);
      return;
    }

    // If here, then this is a locked music file, so we have
    // to decrypt it before playing it.
    musicdb.getFile(songData.name, function(locked) {
      ForwardLock.getKey(function(secret) {
        ForwardLock.unlockBlob(secret, locked, function(unlocked) {
          callback(unlocked);
        }, null, function(msg) {
          console.error(msg);
          callback(null);
        });
      });
    });
  },

  play: function pv_play(targetIndex) {
    this.checkSCOStatus();
    this.showInfo();

    if (arguments.length > 0) {
      this.getSongData(targetIndex, function(songData) {
        this.currentIndex = targetIndex;
        this.setInfo(songData);

        // set ratings of the current song
        this.setRatings(songData.metadata.rated);

        // update the metadata of the current song
        songData.metadata.played++;
        musicdb.updateMetadata(songData.name, songData.metadata);

        this.getFile(songData, function(file) {
          this.setAudioSrc(file);
          // When we need to preview an audio like in picker mode,
          // we will not autoplay the picked song unless the user taps to play
          // And we just call pause right after play.
          // Also we pause at beginning when SCO is enabled, the user can still
          // select songs to the player but it won't start, they have to wait
          // until the SCO is disconnected.
          if (this.sourceType === TYPE_SINGLE || MusicComms.isSCOEnabled)
            this.pause();
        }.bind(this));
      }.bind(this));
    } else if (this.sourceType === TYPE_BLOB && !this.audio.src) {
      // When we have to play a blob, we need to parse the metadata
      this.getMetadata(this.dataSource, function(metadata) {
        // Add the blob from the dataSource to the fileinfo
        // because we want use the cover image which embedded in that blob
        // so that we don't have to count on the musicdb
        this.setInfo({metadata: metadata,
                      name: this.dataSource.name,
                      blob: this.dataSource});

        this.setAudioSrc(this.dataSource);
      }.bind(this));
    } else {
      // If we reach here, the player is paused so resume it
      this.audio.play();
    }
  },

  pause: function pv_pause() {
    this.checkSCOStatus();
    this.audio.pause();
  },

  stop: function pv_stop() {
    this.pause();
    this.audio.removeAttribute('src');
    this.audio.load();

    this.clean();
    // Player in open activity does not have ModeManager.
    if (typeof ModeManager !== 'undefined') {
      ModeManager.playerTitle = null;
      // To leave player mode and set the correct title to the TitleBar
      // we have to decide which mode we should back to when the player stops
      if (ModeManager.currentMode === MODE_PLAYER) {
        ModeManager.pop();
      } else {
        ModeManager.updateTitle();
      }
    }

    this.playStatus = PLAYSTATUS_STOPPED;
    this.updateRemotePlayStatus();
  },

  next: function pv_next(isAutomatic) {
    if (this.sourceType === TYPE_BLOB || this.sourceType === TYPE_SINGLE) {
      // When the player ends, reassign src it if the dataSource is a blob
      this.setAudioSrc(this.playingBlob);
      this.pause();
      return;
    }

    // We only repeat a song automatically. (when the song is ended)
    // If users click skip forward, player will go on to next one
    if (this.repeatOption === REPEAT_SONG && isAutomatic) {
      this.play(this.currentIndex);
      return;
    }

    var playingIndex = (this.shuffleOption) ?
      this.shuffleIndex : this.currentIndex;

    // If it's a last song and repeat list is OFF, ignore it.
    // but if repeat list is ON, player will restart from the first song
    if (playingIndex >= this.dataSource.length - 1) {
      if (this.repeatOption === REPEAT_LIST) {
        if (this.shuffleOption) {
          // After finished one round of shuffled list,
          // re-shuffle again and start from the first song of shuffled list
          this.shuffleList(this.shuffledList[0]);
        } else {
          this.currentIndex = 0;
        }
      } else {
        // When reaches the end, stop and back to the previous mode
        this.stop();
        return;
      }
    } else {
      if (this.shuffleOption) {
        this.shuffleIndex++;
      } else {
        this.currentIndex++;
      }
    }

    var realIndex = (this.shuffleOption) ?
      this.shuffledList[this.shuffleIndex] : this.currentIndex;

    this.play(realIndex);
  },

  previous: function pv_previous() {
    // If a song starts more than 3 (seconds),
    // when users click skip backward, it will restart the current song
    // otherwise just skip to the previous song
    if (this.audio.currentTime > 3) {
      this.play(this.currentIndex);
      return;
    }

    var playingIndex = (this.shuffleOption) ?
      this.shuffleIndex : this.currentIndex;

    // If it's a first song and repeat list is ON, go to the last one
    // or just restart from the beginning when repeat list is OFF
    if (playingIndex <= 0) {
      var newIndex = (this.repeatOption === REPEAT_LIST) ?
        this.dataSource.length - 1 : 0;

      if (this.shuffleOption) {
        this.shuffleIndex = newIndex;
      } else {
        this.currentIndex = newIndex;
      }
    } else {
      if (this.shuffleOption) {
        this.shuffleIndex--;
      } else {
        this.currentIndex--;
      }
    }

    var realIndex = (this.shuffleOption) ?
      this.shuffledList[this.shuffleIndex] : this.currentIndex;

    this.play(realIndex);
  },

  startFastSeeking: function pv_startFastSeeking(direction) {
    // direction can be 1 or -1, 1 means forward and -1 means rewind.
    this.isTouching = this.isFastSeeking = true;
    var offset = direction * 2;

    this.playStatus = direction ? PLAYSTATUS_FWD_SEEK : PLAYSTATUS_REV_SEEK;
    this.updateRemotePlayStatus();

    this.intervalID = window.setInterval(function() {
      this.seekAudio(this.audio.currentTime + offset);
    }.bind(this), 15);
  },

  stopFastSeeking: function pv_stopFastSeeking() {
    this.isTouching = this.isFastSeeking = false;
    if (this.intervalID)
      window.clearInterval(this.intervalID);

    // After we cancel the fast seeking, an 'playing' will be fired,
    // so that we don't have to update the remote play status here.
  },

  updateSeekBar: function pv_updateSeekBar() {
    // Don't update the seekbar when the user is seeking.
    if (this.isTouching)
      return;

    // If ModeManager is undefined, then the music app is launched by the open
    // activity. Otherwise, only seek the audio when the mode is PLAYER because
    // updating the UI will slow down the other pages, such as the scrolling in
    // ListView.
    if (typeof ModeManager === 'undefined' ||
      ModeManager.currentMode === MODE_PLAYER &&
      this.playStatus === PLAYSTATUS_PLAYING) {
      this.seekAudio();
    }
  },

  seekAudio: function pv_seekAudio(seekTime) {
    if (seekTime !== undefined)
      this.audio.currentTime = seekTime;

    var startTime = this.audio.startTime;

    var endTime =
      (this.audio.duration && this.audio.duration != 'Infinity') ?
      this.audio.duration :
      this.audio.buffered.end(this.audio.buffered.length - 1);

    var currentTime = this.audio.currentTime;

    this.setSeekBar(startTime, endTime, currentTime);
  },

  setSeekBar: function pv_setSeekBar(startTime, endTime, currentTime) {
    this.seekBar.min = startTime;
    this.seekBar.max = endTime;
    this.seekBar.value = currentTime;

    // if endTime is 0, that's a reset of seekBar
    var ratio = (endTime != 0) ? (currentTime / endTime) : 0;
    // The width of the seek indicator must be also considered
    // so we divide the width of seek indicator by 2 to find the center point
    var x = (ratio * this.seekBar.offsetWidth -
      this.seekIndicator.offsetWidth / 2) + 'px';
    this.seekIndicator.style.transform = 'translateX(' + x + ')';

    this.seekElapsed.textContent = formatTime(currentTime);
    var remainingTime = endTime - currentTime;
    // Check if there is remaining time to show, avoiding to display "-00:00"
    // while song is loading (Bug 833710)
    this.seekRemaining.textContent =
        (remainingTime > 0) ? '-' + formatTime(remainingTime) : '---:--';
  },

  share: function pv_shareFile() {
    // We try to fix Bug 814323 by using
    // current workaround of bluetooth transfer
    // so we will pass both filenames and filepaths
    // The filepaths can be removed after Bug 811615 is fixed
    var songData = this.dataSource[this.currentIndex];

    if (songData.metadata.locked)
      return;

    musicdb.getFile(songData.name, function(file) {
      var filename = songData.name,
          name = filename.substring(filename.lastIndexOf('/') + 1),
          type = file.type;

      // And we just want the first component of the type "audio" or "video".
      type = type.substring(0, type.indexOf('/')) + '/*';

      var activityData = {
        type: type,
        number: 1,
        blobs: [file],
        filenames: [name],
        filepaths: [filename],
        // We only pass some metadata attributes so we don't share personal
        // details like # of times played and ratings
        metadata: [{
          title: songData.metadata.title,
          artist: songData.metadata.artist,
          album: songData.metadata.album
        }]
      };

      if (PlayerView.playStatus !== PLAYSTATUS_PLAYING) {
        var a = new MozActivity({
          name: 'share',
          data: activityData
        });

        a.onerror = function(e) {
          console.warn('share activity error:', a.error.name);
        };
      }
      else {
        // HACK HACK HACK
        //
        // Bug 956811: If we are currently playing music and share the
        // music with an inline activity handler (like the set
        // ringtone app) that wants to play music itself, we have a
        // problem because we have two foreground apps playing music
        // and neither one takes priority over the other. This is an
        // underlying bug in the way that inline activities are
        // handled and in our "audio competing policy". See bug
        // 892371.
        //
        // To work around this problem, if the music app is currently
        // playing anything, then before we launch the activity we start
        // listening for changes on a property in the settings database.
        // If the setting changes, we pause our playback and don't resume
        // until the activity returns. Then we pass the name of this magic
        // setting as a secret undocumented property of the activity so that
        // the setringtone app can use it.
        //
        // This done as much as possible in a self-invoking function to make it
        // easier to remove the hack when we have a real bug fix.
        //
        // See also the corresponding code in apps/setringtone/js/share.js
        //
        // HACK HACK HACK
        (function() {
          // This are the magic names we'll use for this hack
          var hack_activity_property = '_hack_hack_shut_up';
          var hack_setting_property = 'music._hack.pause_please';

          // Listen for changes to the magic setting
          navigator.mozSettings.addObserver(hack_setting_property, observer);

          // Pass the magic setting name as part of the activity request
          activityData[hack_activity_property] = hack_setting_property;

          // Now initiate the activity. This code is the same as the
          // normal non-hack code in the if clause above.
          var a = new MozActivity({
            name: 'share',
            data: activityData
          });

          a.onerror = a.onsuccess = cleanup;

          // This is the function that pauses the music if the activity
          // handler sets the magic settings property.
          function observer(e) {
            // If the value of the setting has changed, then we pause the music.
            // Note that we don't care what the new value of the setting is.
            // We only care whether it has changed. The setringtone app will
            // just toggle it back and forth between true and false.
            PlayerView.pause();
          }

          // When the activity is done, we stop observing the setting.
          // And if we have been paused, then we resume playing.
          function cleanup() {
            navigator.mozSettings.removeObserver(hack_setting_property,
                                                 observer);
            if (PlayerView.playStatus === PLAYSTATUS_PAUSED)
              PlayerView.audio.play();
          }
        }());
      }
    });
  },

  handleEvent: function pv_handleEvent(evt) {
    var target = evt.target;
    if (!target)
      return;

    switch (evt.type) {
      case 'click':
        switch (target.id) {
          case 'player-cover':
          case 'player-cover-image':
            this.showInfo();
            break;
          case 'player-controls-play':
            if (this.playStatus === PLAYSTATUS_PLAYING)
              this.pause();
            else
              this.play();
            break;
          case 'player-album-repeat':
            this.showInfo();

            var newValue = ++this.repeatOption % 3;
            // Store the option when it's triggered by users
            asyncStorage.setItem(SETTINGS_OPTION_KEY, {
              repeat: newValue,
              shuffle: this.shuffleOption
            });

            this.setRepeat(newValue);
            break;
          case 'player-album-shuffle':
            this.showInfo();

            var newValue = !this.shuffleOption;
            // Store the option when it's triggered by users
            asyncStorage.setItem(SETTINGS_OPTION_KEY, {
              repeat: this.repeatOption,
              shuffle: newValue
            });

            this.setShuffle(newValue, this.currentIndex);
            break;
          case 'player-cover-share':
            this.share();

            break;
        }

        if (target.dataset.rating) {
          this.showInfo();

          var songData = this.dataSource[this.currentIndex];
          var targetRating = parseInt(target.dataset.rating);
          var newRating = (targetRating === songData.metadata.rated) ?
            targetRating - 1 : targetRating;

          songData.metadata.rated = newRating;

          musicdb.updateMetadata(songData.name, songData.metadata);
          this.setRatings(newRating);
        }

        break;
      case 'play':
        this.playControl.classList.remove('is-pause');
        break;
      case 'pause':
        this.playControl.classList.add('is-pause');
        this.playStatus = PLAYSTATUS_PAUSED;
        this.updateRemotePlayStatus();
        break;
      case 'playing':
        // The playing event fires when the audio is ready to start.
        this.playStatus = PLAYSTATUS_PLAYING;
        this.updateRemotePlayStatus();
        break;
      case 'touchstart':
      case 'touchmove':
        if (evt.type === 'touchstart') {
          this.isTouching = true;
          this.seekIndicator.classList.add('highlight');
        }
        if (this.isTouching && this.audio.duration > 0) {
          // target is the seek bar
          var touch = evt.touches[0];
          var x = (touch.clientX - target.offsetLeft) / target.offsetWidth;
          if (x < 0)
            x = 0;
          if (x > 1)
            x = 1;
          this.seekTime = x * this.seekBar.max;
          this.setSeekBar(this.audio.startTime,
            this.audio.duration, this.seekTime);
        }
        break;
      case 'touchend':
        // If isFastSeeking is true then the event is trigger by the long press
        // of the previous or next buttons, so stop the fast seeking.
        // Otherwise, check the target id then do the corresponding actions.
        if (this.isFastSeeking) {
          this.stopFastSeeking();
        } else if (target.id === 'player-seek-bar') {
          this.seekIndicator.classList.remove('highlight');
          if (this.audio.duration > 0 && this.isTouching) {
            this.seekAudio(this.seekTime);
            this.seekTime = 0;
          }
          this.isTouching = false;
        } else if (target.id === 'player-controls-previous') {
          this.previous();
        } else if (target.id === 'player-controls-next') {
          this.next();
        }
        break;
      case 'contextmenu':
        if (target.id === 'player-controls-next')
          this.startFastSeeking(1);
        else if (target.id === 'player-controls-previous')
          this.startFastSeeking(-1);
        break;
      case 'durationchange':
      case 'timeupdate':
        this.updateSeekBar();

        // Update the metadata when the new track is really loaded
        // when it just started to play, or the duration will be 0 then it will
        // break the duration that the connected A2DP has.
        if (evt.type === 'durationchange' || this.audio.currentTime === 0)
          this.updateRemoteMetadata();

        // Since we don't always get reliable 'ended' events, see if
        // we've reached the end this way.
        // See: https://bugzilla.mozilla.org/show_bug.cgi?id=783512
        // If we're within 1 second of the end of the song, register
        // a timeout to skip to the next song one second after the song ends
        if (this.audio.currentTime >= this.audio.duration - 1 &&
            this.endedTimer == null) {
          var timeToNext = (this.audio.duration - this.audio.currentTime + 1);
          this.endedTimer = setTimeout(function() {
                                         this.next(true);
                                       }.bind(this),
                                       timeToNext * 1000);
        }
        break;
      case 'ended':
        // Because of the workaround above, we have to ignore real ended
        // events if we already have a timer set to emulate them
        if (!this.endedTimer)
          this.next(true);
        break;

      default:
        return;
    }
  }
};
