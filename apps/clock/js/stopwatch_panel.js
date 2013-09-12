(function(exports) {

  'use strict';

  var priv = new WeakMap();

  function StopwatchPanel(element) {

    Panel.apply(this, arguments);
    this.nodes = {};
    this.lapTemplate = new Template('lap-list-item-tmpl');
    this.interval = null;

    // Gather elements
    [
      'start', 'pause', 'resume',
      'lap', 'reset', 'time',
      'lap-list', 'laps'
    ].forEach(function(id) {
      this.nodes[id] = document.getElementById('stopwatch-' + id);
    }, this);

    // Bind click events
    [
      'start', 'pause', 'resume', 'lap', 'reset'
    ].forEach(function(action) {
      var e = this.nodes[action];

      if (priv.has(e)) {
        priv.delete(e);
      }

      priv.set(e, {
        action: action == 'resume' ? 'start' : action
      });

      e.addEventListener('click', this);
    }, this);

    View.instance(element).on('visibilitychange', function(isVisible) {
      var swp = priv.get(this);

      if (isVisible) {
        if (swp.stopwatch.isStarted()) {
          // Stopwatch is started
          //
          // - restart the interval
          //
          this.interval = window.setInterval(this.update.bind(this), 50);
        } else {
          // Stopwatch is not started and elapsedTime is 0
          //
          // - reset the UI
          //
          if (swp.stopwatch.getElapsedTime().getTime() == 0) {
            this.reset();
          }
        }
      } else {
        if (swp.stopwatch.isStarted()) {
          // Stopwatch is started
          //
          // - clear the interval
          //
          window.clearInterval(this.interval);
        }
      }
    }.bind(this));

    priv.set(this, {
      stopwatch: new Stopwatch()
    });

  }

  StopwatchPanel.prototype = Object.create(Panel.prototype);

  StopwatchPanel.prototype.reset = function() {
    this.toggle(this.nodes.start, this.nodes.pause, this.nodes.resume);
    this.toggle(this.nodes.reset, this.nodes.lap);
    this.nodes.reset.setAttribute('disabled', 'true');
    this.update();
    // clear lap list
    var node = this.nodes['laps'];
    while (node.hasChildNodes()) {
      node.removeChild(node.lastChild);
    }
  };

  StopwatchPanel.prototype.update = function() {
    var swp = priv.get(this);
    var e = swp.stopwatch.getElapsedTime();
    var time = this.hms(Math.floor(e.getTime() / 1000), 'mm:ss');
    this.nodes.time.textContent = time;
  };

  StopwatchPanel.prototype.toggle = function() {
    arguments[0].classList.remove('hide');
    for (var i = 1; i < arguments.length; i++) {
      arguments[i].classList.add('hide');
    }
  };

  StopwatchPanel.prototype.handleEvent = function(event) {
    if (event.type == 'animationend') {
      Panel.prototype.handleEvent.apply(this, arguments);
      return;
    }

    var swp = priv.get(this);
    var button = priv.get(event.target);

    if (swp.stopwatch && swp.stopwatch[button.action]) {

      // button.action => swp.stopwatch[button.action]()
      //
      // ie.
      //
      // if start => swp.stopwatch.start()
      // if pause => swp.stopwatch.pause()
      // if resume => swp.stopwatch.resume()
      // if lap => swp.stopwatch.lap()
      // if reset => swp.stopwatch.reset()
      //
      var val = swp.stopwatch[button.action]();

      if (button.action === 'start') {
        this.interval = window.setInterval(this.update.bind(this), 50);
        this.nodes.reset.removeAttribute('disabled');
        this.toggle(this.nodes.pause, this.nodes.start, this.nodes.resume);
        this.toggle(this.nodes.lap, this.nodes.reset);
      }

      if (button.action === 'pause') {
        window.clearInterval(this.interval);
        this.toggle(this.nodes.resume, this.nodes.pause, this.nodes.start);
        this.toggle(this.nodes.reset, this.nodes.lap);
      }

      if (button.action === 'resume') {
        this.interval = window.setInterval(this.update.bind(this), 50);
        this.toggle(this.nodes.pause, this.nodes.start, this.nodes.resume);
        this.toggle(this.nodes.lap, this.nodes.reset);
      }

      if (button.action === 'lap') {
        var node = this.nodes['laps'];
        var num = node.childNodes.length + 1 + '';
        if (num > 99) {
          return;
        }
        var time = this.hms(Math.floor(val.getTime() / 1000), 'mm:ss');
        var li = document.createElement('li');
        li.setAttribute('class', 'lap-cell');
        var html = this.lapTemplate.interpolate({
          num: num,
          time: time
        });
        li.innerHTML = html;
        node.insertBefore(li, node.firstChild);
      }

      if (button.action === 'reset') {
        window.clearInterval(this.interval);
        this.reset();
      }

    }
  };

  StopwatchPanel.prototype.hms = function(sec, format) {
    var hour = 0;
    var min = 0;

    if (sec >= 3600) {
      hour = Math.floor(sec / 3600);
      sec -= hour * 3600;
    }

    if (sec >= 60) {
      min = Math.floor(sec / 60);
      sec -= min * 60;
    }

    hour = (hour < 10) ? '0' + hour : hour;
    min = (min < 10) ? '0' + min : min;
    sec = (sec < 10) ? '0' + sec : sec;

    if (typeof format !== 'undefined') {
      format = format.replace('hh', hour);
      format = format.replace('mm', min);
      format = format.replace('ss', sec);

      return format;
    }
    return hour + ':' + min + ':' + sec;
  };

  exports.StopwatchPanel = StopwatchPanel;

}(this));
