/* global IntlHelper */

(function(window) {
'use strict';

var proto = Object.create(HTMLElement.prototype);

var isTouch = 'ontouchstart' in window;

proto.createdCallback = function() {
  var shadowRoot = this.createShadowRoot();
  shadowRoot.innerHTML =
`<style>
  #container {
    background-color: rgba(0, 0, 0, 0.85);
    display: flex;
    flex-flow: row nowrap;
    position: relative;
    width: 100%;
    height: 4.2rem;
    -moz-user-select: none;
  }
  #container > span {
    display: inline-block;
    position: relative;
    height: 100%;
  }
  #elapsed-time,
  #remaining-time {
    color: #e7e7e7;
    font-size: 1.4rem;
    font-weight: 400;
    line-height: 4.2rem;
    direction: ltr;
    vertical-align: top;
    flex: 0 0 auto;
    width: 5.3rem;
  }
  #elapsed-time {
    padding-left: 1.5rem;
  }
  #remaining-time {
    padding-right: 1.5rem;
    text-align: right;
  }
  #seek-bar {
    flex: 1 0 auto;
    z-index: 1;
  }
  #seek-bar-progress {
    background-color: #a6b4b7;
    border: none;
    border-radius: 0;
    position: absolute;
    top: calc(50% - 0.1rem);
    left: 0;
    width: 100%;
    height: 0.1rem;
    pointer-events: none;
    -moz-appearance: none;
  }
  #seek-bar-progress::-moz-progress-bar {
    background-color: #01c5ed;
  }
  #seek-bar-indicator {
    background-color: transparent;
    border-radius: 50%;
    position: absolute;
    top: calc(50% - 3rem);
    left: -3rem;
    width: 6rem;
    height: 6rem;
    pointer-events: none;
    transition: transform 20ms linear;
    will-change: transform;
  }
  #seek-bar-indicator:after {
    content: '';
    background-color: #fff;
    border: 1px solid #fff;
    border-radius: 50%;
    position: absolute;
    top: 1.85rem;
    left: 1.85rem;
    width: 2.1rem;
    height: 2.1rem;
  }
  #seek-bar-indicator.highlight {
    background-color: #00caf2;
  }
</style>
<div id="container">
  <span id="elapsed-time"></span>
  <span id="seek-bar">
    <progress id="seek-bar-progress"></progress>
    <div id="seek-bar-indicator"></div>
  </span>
  <span id="remaining-time"></span>
</div>`;

  var $id = shadowRoot.getElementById.bind(shadowRoot);

  this.els = {
    container:        $id('container'),
    elapsedTime:      $id('elapsed-time'),
    seekBar:          $id('seek-bar'),
    seekBarProgress:  $id('seek-bar-progress'),
    seekBarIndicator: $id('seek-bar-indicator'),
    remainingTime:    $id('remaining-time')
  };

  var container = this.els.container;
  var seekBar = this.els.seekBar;

  var seekTimeout = null;

  container.addEventListener(isTouch ? 'touchstart' : 'mousedown', (evt) => {
    clearTimeout(seekTimeout);

    container.addEventListener(isTouch ? 'touchmove' : 'mousemove',
      pointerMoveHandler);
    container.addEventListener(isTouch ? 'touchend' : 'mouseup',
      pointerEndHandler);

    this.els.seekBarIndicator.classList.add('highlight');

    pointerMoveHandler(evt);
  });

  var pointerMoveHandler = (evt) => {
    var pointer = isTouch ? evt.targetTouches[0] : evt;
    var percent = clamp(0, 1,
      (pointer.clientX - seekBar.offsetLeft) / seekBar.offsetWidth);

    if (document.documentElement.dir === 'rtl') {
      this.remainingTime = this._overrideRemainingTime =
        percent * this.duration;
    }

    else {
      this.elapsedTime = this._overrideElapsedTime =
        percent * this.duration;
    }
  };

  var pointerEndHandler = (evt) => {
    this.dispatchEvent(new CustomEvent('seek', {
      detail: { elapsedTime: this.elapsedTime }
    }));

    container.removeEventListener(isTouch ? 'touchmove' : 'mousemove',
      pointerMoveHandler);
    container.removeEventListener(isTouch ? 'touchend' : 'mouseup',
      pointerEndHandler);

    seekTimeout = setTimeout(() => {
      this._overrideRemainingTime = null;
      this._overrideElapsedTime = null;

      this.els.seekBarIndicator.classList.remove('highlight');
    }, 100);
  };

  this._overrideRemainingTime = null;
  this._overrideElapsedTime = null;

  this.duration = null;
  this.elapsedTime = null;
  this.remainingTime = null;
};

Object.defineProperty(proto, 'duration', {
  get: function() {
    return this._duration;
  },

  set: function(value) {
    if (isNaN(value)) {
      this._duration = null;
      this.remainingTime = null;
      return;
    }

    this._duration = value;
    this.remainingTime = this._duration - this._elapsedTime;
  }
});

Object.defineProperty(proto, 'elapsedTime', {
  get: function() {
    return this._elapsedTime;
  },

  set: function(value) {
    if (isNaN(value)) {
      this._elapsedTime = null;
      this.remainingTime = null;
      return;
    }

    this._elapsedTime = this._overrideElapsedTime !== null ?
      this._overrideElapsedTime : value;
    this.remainingTime = this._duration - this._elapsedTime;
  }
});

Object.defineProperty(proto, 'remainingTime', {
  get: function() {
    return this._remainingTime;
  },

  set: function(value) {
    var indeterminate = isNaN(value) || isNaN(this._duration);
    if (indeterminate) {
      this._remainingTime = null;
      this._elapsedTime = null;
    }

    else {
      this._remainingTime = this._overrideRemainingTime !== null ?
        this._overrideRemainingTime : value;
      this._elapsedTime = this._duration - this._remainingTime;
    }

    window.requestAnimationFrame(() => {
      if (indeterminate) {
        this.els.remainingTime.textContent = '---:--';
        this.els.elapsedTime.textContent = '--:--';
        return;
      }

      var percent = this._duration ? this._elapsedTime / this._duration : 0;
      var x = this.els.seekBar.offsetWidth * percent;

      if (document.documentElement.dir === 'rtl') {
        x = this.els.seekBar.offsetWidth - x;
      }

      this.els.seekBarIndicator.style.transform = 'translateX(' + x + 'px)';

      IntlHelper.get('duration').then((duration) => {
        this.els.remainingTime.textContent =
          duration.format(-this._remainingTime * 1000);
        this.els.elapsedTime.textContent =
          duration.format(this._elapsedTime * 1000);
      });
    });
  }
});

function clamp(min, max, value) {
  return Math.min(Math.max(min, value), max);
}

IntlHelper.define('duration', 'mozduration', {
  minUnit: 'second',
  maxUnit: 'minute'
});

try {
  window.MusicSeekBar = document.registerElement('music-seek-bar', {
    prototype: proto
  });
} catch (e) {
  if (e.name !== 'NotSupportedError') {
    throw e;
  }
}

})(window);
