 'use strict';

/**
 * Event source for Stream. One Stream can collect events from multiple
 * sources, which pass different native events (not only DOM events)
 * to Stream.
 **/
(function(exports) {
  var Source = function(configs) {
    this.configs = {
      events: configs.events || [],
      collector: configs.collector ||
          (window.addEventListener.bind(window)),
      decollector: configs.collector ||
          (window.removeEventListener.bind(window)),
      emitter: configs.emitter ||
          (window.dispatchEvene.bind(window))
    };
    this.states = {
      target: null,
      timer: {
        id: null,
        times: null
      }
    };
    this.handleEvent = this.handleEvent.bind(this);
  };

  Source.prototype.start = function(target) {
    this.configs.events.forEach((ename) => {
      this.configs.collector(ename, this.handleEvent);
    });
    return this;
  };

  Source.prototype.stop = function() {
    this.states.target = null;
    this.configs.events.forEach((ename) => {
      this.configs.decollector(ename, this.handleEvent);
    });
    return this;
  };

  Source.prototype.emit = function(evt) {
    this.configs.emitter(evt);
    return this;
  };

  Source.prototype.handleEvent = function(evt) {
    if (this.states.target) {
      this.states.target(evt);
    }
  };

  /**
   * To build a source from listening mozSettings.
   * Should provide the setting keys to listen to.
   */
  Source.settings = function(keys) {
    var source = new Source({
      events: keys,
      collector: navigator.mozSettings.addObserver,
      decollector: navigator.mozSettings.removeObserver,
      emitter: (evt) => {
        var { type, details } = evt;
        var pod = {};
        pod[type] = details;
        var lock  = navigator.mozSettings.createLock();
        lock.set(pod);
      }
    });
    return source;
  };

  /**
   * Trigger [ename] with details from [generator] every [interval] ms.
   * If [times] is omitted it would fire the event permanently.
   */
  Source.timer = function(ename, generator, interval, times) {
    // Timer is a special case: we don't bind any external inputs/outputs.
    var source = new Source({
      events: [ename],
      collector: (etype, handler) => {
        source.states.timer.id = setInterval(() => {
          if (times && 0 === source.states.timer.times) {
            window.clearInterval(source.states.timer.id);
          } else if (times) {
            source.states.timer.times --;
          } else {
            window.clearInterval(source.states.timer.id);
          }
          // At least fire once.
          var pod = {
            'type': ename,  // ename === etype
            'details': generator()
          };
          handler(pod);
        }, interval);
      },
      decollector: () => {
        window.clearInterval(source.states.timer.id);
      },
      emitter: () => {}
    });
  };

  exports.Source = Source;
})(window);

