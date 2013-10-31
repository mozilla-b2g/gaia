'use strict';

var LCDTest = {
  get fullscreenDiv() {
    delete this.fullScreenDiv;
    return this.fullScreenDiv = document.getElementById('fullscreen-div');
  },
  init: function() {
    document.body.addEventListener('click', this);
    this.fullscreenDiv.addEventListener('click', this.exitFullscreen.bind(this));
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
  },
  exitFullscreen: function() {
    document.mozCancelFullScreen();
    this.fullscreenDiv.classList.add('invisible');
  },
  turnOn: function() {
    navigator.mozPower.screenEnabled = true;
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
        setTimeout(this.turnOn, 3000);
        navigator.mozPower.screenEnabled = false;
        break;
    }
  }
};

window.addEventListener('load', LCDTest.init.bind(LCDTest));
