var SeekBar = function(){
  Utils.loadDomIds(this, [
      'seekElapsed',
      'seek',
      'seekBar',
      'seekBarProgress',
      'seekBarIndicator',
      'seekRemaining'
  ]);

  Utils.setupPassParent(this, 'requestSetTime');

  this.dom.seek.addEventListener('touchstart', this.touchstart.bind(this));
  this.dom.seek.addEventListener('touchend', this.touchend.bind(this));
  this.dom.seek.addEventListener('touchmove', this.touchmove.bind(this));

  this.total = 0;
  this.current = 0;
}

SeekBar.prototype = {
  touchstart: function(e){
    if (this.dom.seekBarIndicator.disabled)
      return;
    this.dom.seekBarIndicator.classList.add('highlight');
  },
  touchend: function(e){
    if (this.dom.seekBarIndicator.disabled)
      return;
    this.dom.seekBarIndicator.classList.remove('highlight');
  },
  touchmove: function(e){
    if (this.dom.seekBarIndicator.disabled)
      return;
    var x = e.touches[0].clientX;
    var percent = (x - this.dom.seekBar.offsetLeft)/this.dom.seekBarProgress.offsetWidth;
    if (percent < 0)
      percent = 0;
    if (percent > 1)
      percent = 1;
    var newCurrentTime = this.total*percent;
    this.requestSetTime(newCurrentTime);
  },
  setCurrentTime: function(seconds){
    this.current = seconds;
    this.rerender();
  },
  setTotalTime: function(seconds){
    this.total = seconds;
    this.rerender();
  },
  rerender: function(){
    this.setTime(this.dom.seekElapsed, this.current);
    this.setTime(this.dom.seekRemaining, this.total);

    this.dom.seekBarProgress.min = 0;
    this.dom.seekBarProgress.max = this.total;
    this.dom.seekBarProgress.value = this.current;

    var progressPercent = 0;
    if (this.total !== 0)
      progressPercent = this.current / this.total;
    if (window.isNaN(progressPercent))
      progressPercent = 0;
    var x = progressPercent * this.dom.seekBarProgress.offsetWidth - this.dom.seekBarIndicator.offsetWidth/2;
    if (!window.isNaN(x)){
      this.dom.seekBarIndicator.style.transform = 'translateX(' + x + 'px)';
    }
  },
  setTime: function(elem, seconds){
    var mins = Math.floor(seconds/60);
    var secs = seconds % 60;
    if (window.isNaN(mins))
      mins = '--';
    else if (mins < 10)
      mins = '0' + mins;
    if (window.isNaN(secs))
      secs = '--';
    else if (secs < 10)
      secs = '0' + secs;
    elem.innerHTML = mins + ':' + secs;
  },
  disable: function(){
    this.dom.seekBarIndicator.classList.add('disabled');
    this.dom.seekBarIndicator.disabled = true;
    this.setTotalTime(null);
    this.setCurrentTime(null);
  },
  enable: function(){
    this.dom.seekBarIndicator.classList.remove('disabled');
    this.dom.seekBarIndicator.disabled = false;
  }
}
