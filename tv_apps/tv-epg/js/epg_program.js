/* global EPG */

'use strict';

window.EPGProgram = (function(exports) {
  var proto = Object.create(HTMLElement.prototype);

  proto.createdCallback = function() {
    this._duration = 1;
    this.dataset.duration = '1';
    this.titleElement = document.createElement('DIV');
    this.titleElement.classList.add('title');
    this.appendChild(this.titleElement);

    this.progressElement = document.createElement('DIV');
    this.progressElement.classList.add('background-progress');
    this.appendChild(this.progressElement);
  };

  Object.defineProperty(proto, 'progress', {
    set: function(time) {
      if (!this.startTime || !time) {
        return;
      }

      var scaleX = (time - this.startTime) * EPG.COLUMN_WIDTH;
      scaleX = scaleX / (this.duration * EPG.COLUMN_WIDTH - EPG.COLUMN_MARGIN);
      scaleX = Math.min(scaleX, 1);
      this.progressElement.style.transform = 'scaleX(' + scaleX + ')';
    }
  });

  Object.defineProperty(proto, 'startTime', {
    set: function(time) {
      this._startTime = time;
    },
    get: function() {
      return this._startTime;
    }
  });

  Object.defineProperty(proto, 'title', {
    set: function(title) {
      this.titleElement.textContent = title;
    }
  });

  Object.defineProperty(proto, 'titlePadding', {
    set: function(padding) {
      this.titleElement.style.paddingLeft = padding;
    }
  });

  Object.defineProperty(proto, 'duration', {
    set: function(duration) {
      this._duration = duration;
      this.dataset.duration = duration;
    },
    get: function() {
      return this._duration;
    }
  });

  proto.resetProgressElement = function(time) {
    if (!this.startTime || !time) {
      return;
    }

    if (this.startTime + this.duration <= time) {
      this.fillProgress();
    } else {
      this.progressElement.classList.add('smooth');
    }
    this.appendChild(this.progressElement);
  };

  proto.fillProgress = function() {
    this.progressElement.style.transform = 'scaleX(1)';
  };

  proto.hide = function() {
    this.classList.add('hidden');
  };

  proto.show = function() {
    this.classList.remove('hidden');
  };

  return document.registerElement('epg-program', { prototype: proto });
})(window);
