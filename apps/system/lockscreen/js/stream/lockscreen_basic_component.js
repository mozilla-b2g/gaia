/* global Stream */
/* global LockScreenBasicComponentHalt */
'use strict';

(function(exports) {
  var LockScreenBasicComponent = function() {
    this.configs = {
      name: 'LockScreenBasicComponent',
      stream: {
        events: [],
        interrupts: [],
        sources: []  // Must contain sources before start.
                     // Unless this state is not an event-driven state.
      }
    };
    this.states = {
      // Necessary: otherwise parent can't track the current active state
      next: null
    };
    this.elements = {};
    this.components = {};
  };

  /**
   * Set an extended POD for the states.
   */
  LockScreenBasicComponent.prototype.statesAs =
  function(newStates) {
    for(var key in this.states) {
      if ('undefined' !== typeof newStates[key]) {
        this.states[key] = newStates[key];
      }
    }
    return this;
  };

  /**
   * Set an extended POD for the elements.
   * Would do query again. And, if use this method to set elements,
   * it disallow to set the elements without 'view'.
   */
  LockScreenBasicComponent.prototype.elementsAs =
  function(newElements) {
    if (!newElements.view) {
      throw new Error(`Set elements without view.`);
    }
    for(var key in this.elements) {
      if ('undefined' !== typeof newElements[key]) {
        this.elements[key] = newElements[key];
      }
    }
    return this;
  };

  LockScreenBasicComponent.prototype.componentsAs =
  function(newComponents) {
    for(var key in this.components) {
      if ('undefined' !== typeof newComponents[key]) {
        this.states[key] = newComponents[key];
      }
    }
    return this;
  };

  /**
   * Stream' phase is the component's phase.
   */
  LockScreenBasicComponent.prototype.phase =
  function() {
    return this.stream.phase();
  };

  /**
   * When parent need to wait children's actions, like to stop itself after all
   * children got stopped, we would need this.
   */
  LockScreenBasicComponent.prototype.getActiveState =
  function() {
    if ('start' === this.phase()) {
      return this;
    } else {
      var target = this.states.next;
      while (target && 'start' !== target.phase()) {
        target = target.states.next;
      }
      return target;  // Either no active so it's null, or we found it.
    }
  };

  /**
   * For cache, start would receive information from the previous state
   * or parent components. The caller can give it a reformed version of
   * the 'states' inner data member it owns, rather than passing the
   * original version.
   */
  LockScreenBasicComponent.prototype.start =
  function(states, components, elements) {
    // Get from the previous state.
    if (states) {
      this.states = states;
    }
    // Only set it. Since only inherited one can know when to
    // start/stop components
    if (components) {
      this.components = components;
    }
    if (elements) {
      this.elements = elements;
    }
    // Query or get them from the previous state.
    this.queryElements(this.elements);
    if (!this.configs.stream.handler) {
      // Can't set it at the constructor since we have no 'this' yet.
      this.configs.stream.handler = this.handleEvent.bind(this);
    }
    this.stream = new Stream(this.configs.stream);
    return this.stream.start();
  };

  LockScreenBasicComponent.prototype.ready = function() {
    return this.stream.ready();
  };

  LockScreenBasicComponent.prototype.stop = function() {
    return this.stream.stop();
  };

  LockScreenBasicComponent.prototype.destroy = function() {
    return this.stream.destroy();
  };

  LockScreenBasicComponent.prototype.live = function() {
    return this.stream.until('stop');
  };

  LockScreenBasicComponent.prototype.exist = function() {
    return this.stream.until('destroy');
  };

  LockScreenBasicComponent.prototype.handleEvent = function() {};

  LockScreenBasicComponent.prototype.queryElements = function(elements) {
    if (!this.elements.view) {
      return; // means component without view.
    }
    Object.keys(this.elements).forEach((key) => {
      // Replace query to DOM.
      var query = this.elements[key];
      console.log('>> query:', key, query);
      if ('string' === typeof query) {
        this.elements[key] = this.elements.view.querySelector(query);
        if (null === this.elements[key]) {
          throw new Error(`Can't find element ${key} with ${query}`);
        }
      }
    });
  };

  /**
   * Can command all components with one method and its arguments.
   * For example, to 'start', or 'stop' them.
   */
  LockScreenBasicComponent.prototype.waitComponents = function(method, args) {
    var waitPromises =
    Object.keys(this.components).reduce((steps, name) => {
      var instance = this.components[name];
      // If the entry of the component actually contains multiple subcomponents.
      // We need to apply the method to each one and concat all the result
      // promises with our main array of applies.
      if (Array.isArray(instance)) {
        var applies = instance.map((subcomponent) => {
          return subcomponent[method].apply(subcomponent, args);
        });
        return steps.concat(applies);
      } else {
        return steps.concat([instance[method].apply(instance, args)]);
      }
    });
    return Promise.all(waitPromises);
  };

  /**
   * The default transferring method.
   * The next state should call 'this.states.previous.destroy' manually
   * to destroy current state while the next one is ready.
   *
   * The order of transferring is:
   *
   *  [current.stop] -> [next.start] -> (call)[previous.destroy]
   *
   * When a component has been stopped, it would stop to handle events.
   */
  LockScreenBasicComponent.prototype.transferTo = function(clazz) {
    var nextState = new clazz();
    this.states.next = nextState;
    return this.stop()
      .next(() => nextState.start(this.states, this.components, this.elements));
  };

  /**
   * Transfer to the final state. Every state should be able to directly
   * move to this state.
   */
  LockScreenBasicComponent.prototype.halt = function() {
    this.transferTo(LockScreenBasicComponentHalt);
  };

  exports.LockScreenBasicComponent = LockScreenBasicComponent;
})(window);

