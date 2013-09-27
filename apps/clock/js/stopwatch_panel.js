define(function(require) {

  'use strict';

  var Panel = require('panel');
  var View = require('view');
  var Stopwatch = require('stopwatch');
  var Utils = require('utils');
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

    priv.set(this, {
      stopwatch: new Stopwatch()
    });

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

  Stopwatch.Panel.prototype.onvisibilitychange = function(isVisible) {
    var swp = priv.get(this);

    if (isVisible) {
      if (swp.stopwatch.isStarted()) {
        // Stopwatch is started
        //
        // - update the display before becoming visible
        // - restart the interval
        //
        this.update();
        this.interval = setInterval(this.update.bind(this), 50);
      } else {
        // Stopwatch is not started and elapsedTime is 0
        //
        // - reset the UI
        //
        if (swp.stopwatch.getElapsedTime().getTime() == 0) {
          this.onreset();
        }
      }
    } else {
      if (swp.stopwatch.isStarted()) {
        // Stopwatch is started
        //
        // - clear the interval
        //
        clearInterval(this.interval);
      }
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
    this.nodes.reset.removeAttribute('disabled');
    this.showButtons('pause', 'lap');
    this.hideButtons('start', 'resume', 'reset');
  };

  Stopwatch.Panel.prototype.onpause = function() {
    clearInterval(this.interval);
    this.showButtons('resume', 'reset');
    this.hideButtons('pause', 'start', 'lap');
  };

  Stopwatch.Panel.prototype.onresume = function() {
    this.interval = setInterval(this.update.bind(this), 50);
    this.showButtons('pause', 'lap');
    this.hidebuttons('start', 'resume', 'reset');
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
    clearInterval(this.interval);
    this.showButtons('start', 'reset');
    this.hideButtons('pause', 'resume', 'lap');
    this.nodes.reset.setAttribute('disabled', 'true');
    this.update();
    // clear lap list
    var node = this.nodes.laps;
    while (node.hasChildNodes()) {
      node.removeChild(node.lastChild);
    }
  };

  return Stopwatch.Panel;
});
