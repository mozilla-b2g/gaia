'use strict';

var SheetsTransition = {
  _current: null,
  _new: null,

  begin: function st_begin(direction) {
    // Ask Homescreen App to fade out when sheets begin moving.
    // Homescreen App would fade in next time it's opened automatically.
    var home = HomescreenLauncher.getHomescreen();
    home && home.fadeOut();
    var currentSheet = StackManager.getCurrent();
    var newSheet = (direction == 'ltr') ?
      StackManager.getPrev() : StackManager.getNext();

    this._current = currentSheet ? currentSheet.element : null;
    this._new = newSheet ? newSheet.element : null;

    if (this._current) {
      this._current.classList.add('inside-edges');
      this._current.style.transition = 'transform, opacity';
    }

    if (this._new) {
      this._new.classList.toggle('outside-edges-left', (direction == 'ltr'));
      this._new.classList.toggle('outside-edges-right', (direction == 'rtl'));
      if (direction == 'rtl') {
        this._new.dataset.zIndexLevel = 'top-app';
      } else {
        this._new.dataset.zIndexLevel = 'bottom-app';
      }
      this._new.style.transition = 'transform, opacity';
    }
  },

  _lastProgress: null,

  moveInDirection: function st_moveInDirection(direction, progress) {
    var overflowing = !this._new;
    if (overflowing && (progress > 0.20)) {
      progress = 0.20 + (progress - 0.20) / (2 + progress);
    }

    this._lastProgress = progress;

    var currentFactor = (direction == 'ltr') ? 1 : (overflowing ? -1 : -0.2);
    var newFactor = (direction == 'ltr') ? 0.2 : -1;

    this._setTranslate(this._current, progress * currentFactor * 100);
    this._setTranslate(this._new, (progress - 1) * newFactor * 100);

    if (direction == 'ltr') {
      this._setOpacity(this._new, 0.25 + progress * 0.75);
    } else if (!overflowing) {
      this._setOpacity(this._current, 1 - progress * 0.75);
    }
  },

  end: function st_end(callback) {
    var callbackCalled = false;

    var sheets = [this._current, this._new];
    sheets.forEach(function(sheet) {
      if (!sheet) {
        return;
      }

      function finish() {
        sheet.classList.remove('inside-edges');
        sheet.classList.remove('outside-edges-left');
        sheet.classList.remove('outside-edges-right');
        sheet.style.transition = '';
        delete sheet.dataset.zIndexLevel;

        if (!callbackCalled) {
          callbackCalled = true;
          if (callback && (typeof(callback) == 'function')) {
            callback();
          }
        }
      }

      if (!sheet.style.transform) {
        // We won't have a transitionend
        finish();
        return;
      }

      sheet.style.transform = '';
      sheet.style.opacity = '';

      sheet.addEventListener('transitionend', function trWait() {
        sheet.removeEventListener('transitionend', trWait);
        finish();
      });
    });

    this._current = null;
    this._new = null;
  },

  snapInPlace: function st_snapInPlace() {
    var TIMEOUT = 300;
    var duration = TIMEOUT - (TIMEOUT * (1 - this._lastProgress));
    duration = Math.max(duration, 90);

    this._setDuration(this._current, duration);
    this._setDuration(this._new, duration);
  },

  snapBack: function st_snapBack(speed) {
    this._snapAway(speed, 'outside-edges-right');
  },

  snapForward: function st_snapForward(speed) {
    this._snapAway(speed, 'outside-edges-left');
  },

  _snapAway: function st_snapAway(speed, outClass) {
    if (!this._new) {
      this.snapInPlace();
      return;
    }

    var durationLeft = (1 - this._lastProgress) / speed;
    durationLeft /= 1.2; // boost

    var duration = Math.min(durationLeft, ((1 - this._lastProgress) * 300));

    this._setDuration(this._current, duration);
    this._setDuration(this._new, duration);

    if (this._current) {
      this._current.classList.remove('inside-edges');
      this._current.classList.add(outClass);
    }

    if (this._new) {
      this._new.classList.remove('outside-edges-right');
      this._new.classList.remove('outside-edges-left');
      this._new.classList.add('inside-edges');
    }
  },

  _setTranslate: function st_setTranslate(sheet, percentage) {
    if (!sheet) {
      return;
    }

    sheet.style.transform = 'translateX(' + percentage + '%)';
  },

  _setOpacity: function st_setOpacity(sheet, opacity) {
    if (!sheet) {
      return;
    }

    sheet.style.opacity = opacity;
  },

  _setDuration: function st_setDuration(sheet, ms) {
    if (!sheet) {
      return;
    }

    sheet.style.transition = 'transform ' + ms + 'ms linear,' +
                             'opacity ' + ms + 'ms linear';
  }
};
