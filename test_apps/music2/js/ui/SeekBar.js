'use strict';

var SeekBar = function() {
  Utils.loadDomIds(this, [
    'player-seek-elapsed',
    'player-seek',
    'player-seek-bar',
    'player-seek-bar-progress',
    'player-seek-bar-indicator',
    'player-seek-remaining'
  ]);

  this.router = new Router(this);

  this.router.declareRoutes([
    'requestSetTime'
  ]);

  this.dom.playerSeek.addEventListener(
    'touchstart', this.touchstart.bind(this)
  );
  this.dom.playerSeek.addEventListener('touchend', this.touchend.bind(this));
  this.dom.playerSeek.addEventListener('touchmove', this.touchmove.bind(this));

  this.total = NaN;
  this.current = NaN;

  this.setTime(this.dom.playerSeekElapsed, this.current);
  this.setTime(this.dom.playerSeekRemaining, this.total);
  this.rerender();
  this.disable();
};

SeekBar.prototype = {
  name: 'SeekBar',
  touchstart: function(e) {
    if (this.dom.playerSeekBarIndicator.disabled)
      return;
    this.dom.playerSeekBarIndicator.classList.add('highlight');
  },
  touchend: function(e) {
    if (this.dom.playerSeekBarIndicator.disabled)
      return;
    this.dom.playerSeekBarIndicator.classList.remove('highlight');
  },
  touchmove: function(e) {
    if (this.dom.playerSeekBarIndicator.disabled)
      return;
    var x = e.touches[0].clientX;
    var percent =
      (x - this.dom.playerSeekBar.offsetLeft) /
      this.dom.playerSeekBarProgress.offsetWidth;

    if (percent < 0)
      percent = 0;
    if (percent > 1)
      percent = 1;
    var newCurrentTime = this.total * percent;
    this.router.route('requestSetTime')(newCurrentTime);
  },
  setCurrentTime: function(seconds) {
    this.current = seconds;
    this.rerender();
  },
  setTotalTime: function(seconds) {
    this.total = seconds;
    this.rerender();
  },
  rerender: function() {
    this.setTime(this.dom.playerSeekElapsed, this.current);
    this.setTime(this.dom.playerSeekRemaining, this.total);

    this.dom.playerSeekBarProgress.min = 0;
    if (isFinite(this.total))
      this.dom.playerSeekBarProgress.max = this.total;
    if (isFinite(this.current))
      this.dom.playerSeekBarProgress.value = this.current;

    var progressPercent = 0;
    if (this.total !== 0)
      progressPercent = this.current / this.total;
    if (window.isNaN(progressPercent))
      progressPercent = 0;
    var x = progressPercent * this.dom.playerSeekBarProgress.offsetWidth -
            this.dom.playerSeekBarIndicator.offsetWidth / 2;

    if (!window.isNaN(x)) {
      var transformX = 'translateX(' + x + 'px)';
      this.dom.playerSeekBarIndicator.style.transform = transformX;
    }
  },
  setTime: function(elem, seconds) {
    var mins = Math.floor(seconds / 60);
    var secs = seconds % 60;
    if (window.isNaN(mins))
      mins = '--';
    else if (mins < 10)
      mins = '0' + mins;
    if (window.isNaN(secs))
      secs = '--';
    else if (secs < 10)
      secs = '0' + secs;
    elem.textContent = mins + ':' + secs;
  },
  disable: function() {
    this.dom.playerSeekBarIndicator.classList.add('disabled');
    this.dom.playerSeekBarIndicator.disabled = true;
    this.setTotalTime(null);
    this.setCurrentTime(null);
  },
  enable: function() {
    this.dom.playerSeekBarIndicator.classList.remove('disabled');
    this.dom.playerSeekBarIndicator.disabled = false;
  }
};
