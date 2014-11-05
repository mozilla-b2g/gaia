'use strict';

var LCDTest = {
  get fullscreenDiv() {
    delete this.fullScreenDiv;
    return this.fullScreenDiv = document.getElementById('fullscreen-div');
  },
  firstTimeHint: null,
  init: function() {
    document.body.addEventListener('click', this);
    this.fullscreenDiv.addEventListener('click',
                                         this.exitFullscreen.bind(this));
    this.firstTimeHint = true;
  },
  enterFullscreen: function(color) {
    this.fullscreenDiv.mozRequestFullScreen();
    this.fullscreenDiv.classList.remove('invisible');
    this.fullscreenDiv.classList.remove('red');
    this.fullscreenDiv.classList.remove('green');
    this.fullscreenDiv.classList.remove('blue');
    this.fullscreenDiv.classList.remove('white');
    this.fullscreenDiv.classList.remove('black');
    this.fullscreenDiv.classList.add(color);
    if (this.firstTimeHint) {
      this.firstTimeHint = false;
      alert('Tap screen again to exit fullscreen mode');
    }
  },
  exitFullscreen: function() {
    document.mozCancelFullScreen();
    this.fullscreenDiv.classList.add('invisible');
  },
  turnOn: function() {
    navigator.mozPower.screenEnabled = true;

    // no longer need the lock
    this.wakeLock.unlock();
  },
  // Only handle clicks on button, clicks on div is handled by exitFullscreen
  handleEvent: function(evt) {
    switch (evt.target.id) {
      case 'red':
        this.enterFullscreen('red');
        break;
      case 'green':
        this.enterFullscreen('green');
        break;
      case 'blue':
        this.enterFullscreen('blue');
        break;
      case 'white':
        this.enterFullscreen('white');
        break;
      case 'black':
        this.enterFullscreen('black');
        break;
      case 'off':
        // We are going to shutdown the screen, this may lead to
        // the sleep of CPU. Use wake lock to prevent from sleeping
        // which cause setTimeout stop working.
        this.wakeLock = window.navigator.requestWakeLock('screen');

        setTimeout(this.turnOn.bind(this), 3000);
        navigator.mozPower.screenEnabled = false;
        break;
    }
  },
  wakeLock: null
};

window.addEventListener('load', LCDTest.init.bind(LCDTest));
