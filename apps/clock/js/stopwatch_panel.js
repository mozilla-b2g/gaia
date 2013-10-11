define(function(require) {

  'use strict';

  var Panel = require('panel');
  var View = require('view');
  var Stopwatch = require('stopwatch');
  var Utils = require('utils');
  var Template = require('shared/js/template');
  var mozL10n = require('l10n');
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
      this.nodes[a].classList.remove('hidden');
    }, this);
  };

  Stopwatch.Panel.prototype.hideButtons = function() {
    Array.prototype.forEach.call(arguments, function(a) {
      this.nodes[a].classList.add('hidden');
    }, this);
  };

  Stopwatch.Panel.prototype.setState = function(state) {
    switch (state) {
      case Stopwatch.RUNNING:
        this.onstart();
        break;

      case Stopwatch.PAUSED:
        this.onpause();
        break;

      case Stopwatch.RESET:
        this.onreset();
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
    var lapsUl = this.nodes.laps;
    lapsUl.textContent = '';
    var laps = stopwatch.getLapDurations();
    for (var i = 0; i < laps.length; i++) {
      this.onlap(new Date(laps[i]));
    }
  };

  Stopwatch.Panel.prototype.onvisibilitychange = function(isVisible) {
    var stopwatch = priv.get(this).stopwatch;
    if (isVisible) {
      this.setState(stopwatch.getState());
    } else {
      // Clear the interval that updates the time display
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
    this.interval = setInterval(this.update.bind(this), 50);
    this.showButtons('pause', 'lap');
    this.hideButtons('start', 'resume', 'reset');
  };

  Stopwatch.Panel.prototype.onpause = function() {
    clearInterval(this.interval);
    this.nodes.reset.removeAttribute('disabled');
    this.showButtons('resume', 'reset');
    this.hideButtons('pause', 'start', 'lap');
  };

  Stopwatch.Panel.prototype.onresume = function() {
    this.onstart();
  };

  Stopwatch.Panel.prototype.onlap = function(val) {
    var node = this.nodes.laps;
    var num = node.childNodes.length + 1;
    if (num > 99) {
      return;
    }
    var time = Utils.format.hms(Math.floor(val.getTime() / 1000), 'mm:ss');
    var li = document.createElement('li');
    li.setAttribute('class', 'lap-cell');
    var html = this.lapTemplate.interpolate({
      time: time
    });
    li.innerHTML = html;
    mozL10n.localize(
      li.querySelector('.lap-name'),
      'lap-number',
      { n: num }
    );
    node.insertBefore(li, node.firstChild);
  };

  Stopwatch.Panel.prototype.onreset = function() {
    clearInterval(this.interval);
    this.showButtons('start', 'reset');
    this.hideButtons('pause', 'resume', 'lap');
    this.nodes.reset.setAttribute('disabled', 'true');
    // clear lap list
    this.nodes.laps.textContent = '';
    this.update();
  };

  return Stopwatch.Panel;
});
