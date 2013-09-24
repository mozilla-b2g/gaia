(function(Stopwatch, Panel) {

  'use strict';

  var priv = new WeakMap();

  /**
   * Stopwatch.Panel
   *
   * Construct a UI panel for the Stopwatch panel.
   *
   * @return {Stopwatch.Panel} Stopwatch.Panel object.
   *
   */
  Stopwatch.Panel = function(element) {
    Panel.apply(this, arguments);

    this.nodes = {};
    this.lapTemplate = new Template('lap-list-item-tmpl');
    this.interval = null;

    // Gather elements
    [
      'start', 'pause', 'resume',
      'lap', 'reset', 'time',
      'lap-list', 'laps'
    ].forEach(function(sel) {
      this.nodes[sel] = this.element.querySelector('.stopwatch-' + sel);
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

    View.instance(element).on(
      'visibilitychange',
      this.onvisibilitychange.bind(this)
    );

    this.setStopwatch(new Stopwatch());

  };

  Stopwatch.Panel.prototype = Object.create(Panel.prototype);

  Stopwatch.Panel.prototype.update = function() {
    var swp = priv.get(this);
    var e = swp.stopwatch.getElapsedTime();
    var time = Utils.format.hms(Math.floor(e.getTime() / 1000), 'mm:ss');
    this.nodes.time.textContent = time;
  };

  Stopwatch.Panel.prototype.showButtons = function() {
    Array.prototype.forEach.call(arguments, function(a) {
      this.nodes[a].classList.remove('hide');
    }, this);
  };

  Stopwatch.Panel.prototype.hideButtons = function() {
    Array.prototype.forEach.call(arguments, function(a) {
      this.nodes[a].classList.add('hide');
    }, this);
  };

  Stopwatch.Panel.prototype.setState = function(state) {
    switch (state) {
      case Stopwatch.RUNNING:
        this.interval = setInterval(this.update.bind(this), 50);
        this.showButtons('pause', 'lap');
        this.hideButtons('start', 'resume', 'reset');
        break;

      case Stopwatch.PAUSED:
        clearInterval(this.interval);
        this.nodes.reset.removeAttribute('disabled');
        this.showButtons('resume', 'reset');
        this.hideButtons('pause', 'start', 'lap');
        break;

      case Stopwatch.RESET:
        clearInterval(this.interval);
        this.showButtons('start', 'reset');
        this.hideButtons('pause', 'resume', 'lap');
        this.nodes.reset.setAttribute('disabled', 'true');
        // clear lap list
        var node = this.nodes.laps;
        while (node.hasChildNodes()) {
          node.removeChild(node.lastChild);
        }
        break;
    }
    this.update();
  };

  Stopwatch.Panel.prototype.setStopwatch = function(stopwatch) {
    priv.set(this, {
      stopwatch: stopwatch
    });

    this.setState(stopwatch.getState());

    //Clear any existing lap indicators and make new ones
    var lapsUl = this.nodes['laps'];
    lapsUl.innerHTML = '';
    var laps = stopwatch.getLapDurations();
    for (var i = 0; i < laps.length; i++) {
      this.onlap(new Date(laps[i]));
    }
  };

  Stopwatch.Panel.prototype.onvisibilitychange = function(isVisible) {
    var stopwatch = priv.get(this).stopwatch;

    if (isVisible) {
      //Stopwatch is being shown
      this.setState(stopwatch.getState());
    } else {
      // Stopwatch is being hidden. Clear the interval
      clearInterval(this.interval);
    }
  };

  Stopwatch.Panel.prototype.handleEvent = function(event) {
    if (event.type == 'animationend') {
      Panel.prototype.handleEvent.apply(this, arguments);
      return;
    }

    var swp = priv.get(this);
    var button = priv.get(event.target);

    if (swp.stopwatch && swp.stopwatch[button.action]) {
      // call action on stopwatch
      var val = swp.stopwatch[button.action]();

      // call panel handler
      this['on' + button.action](val);
    }
  };

  Stopwatch.Panel.prototype.onstart = function() {
    this.setState(Stopwatch.RUNNING);
  };

  Stopwatch.Panel.prototype.onpause = function() {
    this.setState(Stopwatch.PAUSED);
  };

  Stopwatch.Panel.prototype.onresume = function() {
    this.setState(Stopwatch.RUNNING);
  };

  Stopwatch.Panel.prototype.onlap = function(val) {
    var node = this.nodes['laps'];
    var num = node.childNodes.length + 1 + '';
    if (num > 99) {
      return;
    }
    var time = Utils.format.hms(Math.floor(val.getTime() / 1000), 'mm:ss');
    var li = document.createElement('li');
    li.setAttribute('class', 'lap-cell');
    var html = this.lapTemplate.interpolate({
      num: num,
      time: time
    });
    li.innerHTML = html;
    node.insertBefore(li, node.firstChild);
  };

  Stopwatch.Panel.prototype.onreset = function() {
    this.setState(Stopwatch.RESET);
  };

}(Stopwatch, Panel));
