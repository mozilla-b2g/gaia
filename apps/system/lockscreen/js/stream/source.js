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
          (window.dispatchEvent.bind(window))
    };
    this.states = {
      forwardTo: null, // The forwarding target.
      timer: {
        id: null,
        times: null
      }
    };
    // Some API you just can't bind it with the object,
    // but a function.
    this.handleEvent = this.handleEvent.bind(this);
  };

  Source.prototype.start = function(forwardTo) {
    this.configs.events.forEach((ename) => {
      this.configs.collector(ename, this.handleEvent);
    });
    this.states.forwardTo = forwardTo;
    return this;
  };

  Source.prototype.stop = function() {
    this.states.forwardTo = null;
    this.configs.events.forEach((ename) => {
      this.configs.decollector(ename, this.handleEvent);
    });
    return this;
  };

  Source.prototype.emit = function(evt) {
    this.configs.emitter(evt);
    return this;
  };

  /**
   * For forwarding to the target.
   */
  Source.prototype.handleEvent = function(evt) {
    if (this.states.forwardTo) {
      this.states.forwardTo(evt);
    }
  };

  /**
   * The default collectors/decollectors/emitter are for
   * the window.Events. This is for the builder inferfaces.
   */
  Source.events = function(enames) {
    return new Source({
      events: enames
    });
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
        var { type, detail } = evt;
        var pod = {};
        pod[type] = detail;
        var lock  = navigator.mozSettings.createLock();
        lock.set(pod);
      }
    });
    return source;
  };

  /**
   * Trigger [ename] with detail from [generator] every [interval] ms.
   * If [times] is omitted it would fire the event permanently.
   *
   * The [generator] would receive 'Date.now' as it's argument.
   */
  Source.timer = function(ename, generator, interval, times) {
    if (times && 0 >= times) {
      throw new Error(`Disallow times <= 0: ${times}`);
    }
    // Timer is a special case: we don't bind any external inputs/outputs.
    var fireEvent = (handler) => {
      var pod = {
        'type': ename,  // ename === etype
        'detail': generator(Date.now())
      };
      handler(pod);
    };
    var source = new Source({
      events: [ename],
      collector: (etype, handler) => {
        source.states.timer.id = setInterval(() => {
          if (times && 0 === source.states.timer.times) {
            window.clearInterval(source.states.timer.id);
          } else if (times) {
            source.states.timer.times --;
            fireEvent(handler);
          } else {
            fireEvent(handler);  // No clear.
          }
        }, interval);
      },
      decollector: () => {
        window.clearInterval(source.states.timer.id);
      },
      emitter: () => {}
    });
    source.states.timer.times = times;
    return source;
  };

  exports.Source = Source;
})(window);

