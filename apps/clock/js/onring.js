define(function(require) {
'use strict';

var Utils = require('utils');
var mozL10n = require('l10n');
var _ = mozL10n.get;

var messageHandlerMapping;

function RingView(opts = {}) {
  Utils.extend(this, {
    ringtonePlayer: null,
    vibrateInterval: null,
    screenLock: null,
    message: {},
    started: false,
    notificationOptions: {
      sound: 'ac_classic_clock_alarm.opus',
      vibrate: true,
      label: _('alarm'),
      time: new Date()
    },
    stopActions: [],
    callback: null
  }, opts);
  window.addEventListener('message',
    this.handleMessage.bind(this), false);
}

RingView.singleton = Utils.singleton(RingView);

RingView.prototype = {};

RingView.prototype.handleMessage = function rv_handleMessage(ev) {
  Utils.safeWakeLock({type: 'cpu', timeoutMs: 5000}, function(done) {
    var err = [];
    var data = ev.data, source = ev.source;
    var messageTypes = data.type.split(' ');
    var gen = Utils.async.generator(done);
    var lp = gen();
    for (var type of messageTypes) {
      var cb = gen();
      try { // Ensure all handlers get called
        if (typeof messageHandlerMapping[type] === 'function') {
          messageHandlerMapping[type].call(this, ev, cb);
        }
      } catch (e) {
        err.push(e);
        cb();
      }
    }
    lp();
    if (err.length !== 0) {
      err.forEach(function(e) {
        console.error('Error in onring handler:', e.message, '\n', e.stack);
      });
      done();
    }
  }.bind(this));
};

function isVisibleWorkaround(callback) {
  // See https://bugzilla.mozilla.org/show_bug.cgi?id=810431
  document.addEventListener('visibilitychange', this);
  if (!document.hidden) {
    callback();
  } else {
    // The setTimeout() is used to workaround
    // https://bugzilla.mozilla.org/show_bug.cgi?id=810431
    // The workaround is used in screen off mode.
    // hidden will be true in init() state.
    window.setTimeout(function rv_checkHidden() {
    // If hidden is true in init state,
    // it means that the incoming call happens before the alarm.
    // We should just put a "silent" alarm screen
    // underneath the oncall screen
      if (!document.hidden) {
        callback();
      }
      // Our final chance is to rely on visibilitychange event handler.
    }.bind(this), 0);
  }
}

RingView.prototype.alarm = function rv_alarm(ev, wakelock) {
  this.type = 'alarm';
  this.alarm = ev.data.alarm;
  var date;
  try {
    date = new Date(ev.data.date);
  } catch (err) {
    date = new Date();
  }
  this.snoozeButton.addEventListener('click', this);
  this.closeButton.addEventListener('click', this);
  this.notificationOptions = {
    sound: ev.data.alarm.sound,
    vibrate: ev.data.alarm.vibrate,
    label: ev.data.alarm.label,
    time: date
  };

  this.stopActions.push(function() {
    window.opener.postMessage({
      type: 'close-' + this.type
    }, window.location.origin);
    this.type = null;
    this.snoozeButton.removeEventListener('click', this);
    this.closeButton.removeEventListener('click', this);
    this.notificationOptions = {};
  }.bind(this));

  isVisibleWorkaround.call(this, function() {
    mozL10n.ready(function rv_waitLocalized() {
      this.startNotify();
      this.ringDisplay.dataset.ringType = 'alarm';
      wakelock();
    }.bind(this));
  }.bind(this));
};

RingView.prototype.timer = function rv_timer(ev, wakelock) {
  this.type = 'timer';
  this.closeButton.addEventListener('click', this);
  this.notificationOptions = {
    sound: ev.data.timer.sound,
    vibrate: ev.data.timer.vibrate,
    label: _('timer'),
    time: new Date(ev.data.timer.startTime + ev.data.timer.duration)
  };

  this.stopActions.push(function() {
    window.opener.postMessage({
      type: 'close-' + this.type
    }, window.location.origin);
    this.type = null;
    this.closeButton.removeEventListener('click', this);
    this.notificationOptions = {};
  }.bind(this));

  isVisibleWorkaround.call(this, function() {
    this.startNotify();
    this.ringDisplay.dataset.ringType = 'timer';
    wakelock();
  }.bind(this));
};

RingView.prototype.display = function rv_display() {
  var label = this.notificationOptions.label;
  this.ringLabel.textContent = (label === '') ? _('alarm') : label;

  var time = Utils.getLocaleTime(this.notificationOptions.time);
  this.time.textContent = time.t;
  this.hourState.textContent = time.p;
};

RingView.prototype.ring = function rv_ring(state) {
  if (state) {
    if (this.notificationOptions.sound) {
      var ringtonePlayer = this.ringtonePlayer = new Audio();
      ringtonePlayer.addEventListener('mozinterruptbegin', this);
      ringtonePlayer.mozAudioChannelType = 'alarm';
      ringtonePlayer.loop = true;
      ringtonePlayer.src = 'shared/resources/media/alarms/' +
        this.notificationOptions.sound;
      ringtonePlayer.play();
    }
  } else if (this.ringtonePlayer) {
    this.ringtonePlayer.pause();
  }
};

RingView.prototype.vibrate = function rv_vibrate(state) {
  if (state) {
    if ('vibrate' in navigator) {
      clearInterval(this.vibrateInterval);
      this.vibrateInterval = window.setInterval(function vibrate() {
        navigator.vibrate([1000]);
      }, 2000);
    }
  } else {
    clearInterval(this.vibrateInterval);
    this.vibrateInterval = null;
  }
};

RingView.prototype.startNotify = function rv_startNotify(timeout) {
  timeout = timeout || 60000 * 10;
  // Ensure called only once.
  if (this.started) {
    return;
  }
  var unique = {};
  Utils.safeWakeLock({type: 'screen', timeoutMs: timeout + 5000},
    function(done) {
    this.started = unique;
    this.wakelock = done;
    this.display();
    this.ring(true);
    this.vibrate(true);
    if (document.hidden) {
      window.focus();
    }
    setTimeout(function rv_clearVibration() {
      if (this.started === unique) {
        this.stopNotify();
      }
      done();
    }.bind(this), timeout);
  }.bind(this));
};

RingView.prototype.stopNotify = function rv_stopNotify(temporary, done) {
  this.started = null;
  this.ring(false);
  this.vibrate(false);
  if (typeof this.wakelock === 'function') {
    this.wakelock();
  }
  this.wakelock = null;
  while (!temporary) {
    var el = this.stopActions.shift();
    if (el) {
      if (typeof el === 'function') {
        el();
      }
    } else {
      break;
    }
  }
  window.opener.postMessage({
    type: 'ringer',
    status: 'READY'
  }, window.location.origin);
  done && done();
};

var domEventMap = {};

RingView.prototype.handleEvent = function rv_handleEvent(evt) {
  try {
    domEventMap[evt.type].call(this, evt);
  } catch (err) {
    console.error('Error handling DOM event', evt);
    throw err;
  }
};

RingView.prototype.onVisibilityChange = domEventMap['visibilitychange'] =
  function rv_onVisibilityChange(evt) {
  // There's chance to miss the hidden state when initiated,
  // before setVisible take effects, there may be a latency.
  if (!document.hidden) {
    this.startNotify();
  }
};

RingView.prototype.onMozInterruptBegin = domEventMap['onmozinterruptbegin'] =
  function rv_onMozInterruptBegin(evt) {
  // Only ringer/telephony channel audio could trigger 'mozinterruptbegin'
  // event on the 'alarm' channel audio element.
  // If the incoming call happens after the alarm rings,
  // we need to close ourselves.
  this.stopNotify(true);
};

RingView.prototype.onClick = domEventMap['click'] =
  function rv_onClick(evt) {
  var input = evt.target;
  if (!input)
    return;
  switch (input.id) {
    case 'ring-button-snooze':
      this.stopNotify();
      window.opener.postMessage({
        type: 'scheduleSnooze',
        id: this.alarm.id
      }, window.location.origin);
      window.close();
      break;
    case 'ring-button-close':
      this.stopNotify();
      window.close();
      break;
  }
};

  var domMap = {
    time: '#ring-clock-time',
    hourState: '#ring-clock-hour24-state',
    ringLabel: '#ring-label',
    snoozeButton: '#ring-button-snooze',
    closeButton: '#ring-button-close',
    ringDisplay: '.ring-display'
  };
  for (var i in domMap) {
    Object.defineProperty(RingView.prototype, i,
      Utils.memoizedDomPropertyDescriptor(domMap[i]));
  }

  messageHandlerMapping = {
    timer: RingView.prototype.timer,
    alarm: RingView.prototype.alarm,
    stop: function(msg, done) {
      RingView.prototype.stopNotify.call(this, false, done);
    }
  };

  return RingView;
});

requirejs(['require_config'], function() {
  requirejs(['onring'], function(RingView) {

    // Initialize a singleton object
    RingView.singleton();

    var onready = window.postMessage.bind(window.opener, {
      type: 'ringer',
      status: 'READY'
    }, window.location.origin);

    window.addEventListener('load', onready, false);
    if (document.readyState === 'complete') {
      onready();
      window.removeEventListener('load', onready, false);
    }
  });
});
