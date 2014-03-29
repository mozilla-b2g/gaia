'use strict';

var albumOne = [
  { artist: 'Some Artist',
    album: 'Some Album',
    title: 'Some Song'
  },
  { artist: 'Another Artist',
    album: 'Some Album',
    title: 'Another Song'
  }
];

var FakeMusic = {
  _mode: 'stopped',
  _interrupted: false,
  _queue: null,
  _queueIndex: null,

  init: function() {
    window.addEventListener('click', this);
    document.querySelector('body').classList.add('loaded');
  },

  startQueue: function(queue) {
    this._queue = queue;
    this._queueIndex = 0;
    FakeMusicComms.notifyTrackChanged(this._queue[this._queueIndex]);
    this.play();
  },

  play: function() {
    if (this._interrupted)
      return;
    this._mode = 'playing';
    document.getElementById('play-pause').classList.remove('is-paused');
    FakeMusicComms.notifyStatusChanged({playStatus: 'PLAYING'});
  },

  pause: function() {
    if (this._interrupted)
      return;
    this._mode = 'paused';
    document.getElementById('play-pause').classList.add('is-paused');
    FakeMusicComms.notifyStatusChanged({playStatus: 'PAUSED'});
  },

  playpause: function() {
    if (this.isPlaying)
      this.pause();
    else
      this.play();
  },

  stop: function() {
    if (this._interrupted)
      return;
    this._mode = 'stopped';
    document.getElementById('play-pause').classList.remove('is-paused');
    FakeMusicComms.notifyStatusChanged({playStatus: 'STOPPED'});
  },

  previous: function() {
    if (this._interrupted)
      return;
    if (this._queueIndex > 0)
      FakeMusicComms.notifyTrackChanged(this._queue[--this._queueIndex]);
  },

  next: function() {
    if (this._interrupted)
      return;
    if (this._queueIndex < this._queue.length - 1)
      FakeMusicComms.notifyTrackChanged(this._queue[++this._queueIndex]);
    else
      this.stop();
  },

  toggleInterrupt: function() {
    this._interrupted = !this._interrupted;
    var status = this._interrupted ? 'mozinterruptbegin' : 'mozinterruptend';
    FakeMusicComms.notifyStatusChanged({playStatus: status});
  },

  get isPlaying() {
    return this._mode === 'playing';
  },

  handleEvent: function(event) {
    switch (event.target.id) {
      case 'play-pause':
        this.playpause();
        break;
      case 'stop':
        this.stop();
        break;
      case 'previous':
        this.previous();
        break;
      case 'next':
        this.next();
        break;
      case 'album-one':
        this.startQueue(albumOne);
        break;
      case 'interrupt':
        this.toggleInterrupt();
        break;
    }
  }
};

FakeMusic.init();
