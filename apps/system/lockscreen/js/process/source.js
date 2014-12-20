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
      target: null
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
  exports.Source = Source;
})(window);

