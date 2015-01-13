/* global LockScreenStateHalt */
'use strict';

/**
 * Component provides:
 *
 * 1. Resource keeper: to let all states share the same resources (cache).
 * 2. Reference to the current activate state: so that parent component can
 *    command and wait the sub-components to do things without tracking the
 *    actual active state.
 *
 * Every states of this component would receive the Component instance as
 * a way to access these common resources & properties. And every state
 * transferring would done by the 'transferTo' method in this component,
 * so that the component can update the active state correctly.
 */
(function(exports) {

  /**
   * View is the only thing parent component needs to manage.
   */
  var LockScreenBasicComponent = function(view) {
    this._subcomponents = null;
    this._activeState = null;
    // Concrete components should extend these to let States access them.
    // The first state component kick off should take responsibility for
    // initializing these things.
    //
    // Resources is for external resources like settings value or DOM elements.
    this.resources = {
      elements: {
        view: view
      }
    };
    // Properties is for internal "states" updated by the component's States.
    this.properties = {};
  };

  /**
   * State' phase is the component's phase.
   */
  LockScreenBasicComponent.prototype.phase =
  function() {
    return this._activeState.phase();
  };

  /**
   * Every state of this component should call the method to do transferring,
   * so that the component can update the 'activeState' correctly.
   *
   * The order of transferring is:
   *
   *  [current.stop] -> [next.start] -> (call)[previous.destroy]
   *
   */
  LockScreenBasicComponent.prototype.transferTo = function(clazz) {
    var nextState = new clazz(this);
    var currentState = this._activeState;
    this._activeState = nextState;
    return currentState.stop()
      .next(() => nextState.start());
  };

  /**
   * Would receive resources from parent and *extends* the default one.
   * After that, transfer to the next state, which is usually an initialization
   * state, that would do lots of sync/async things to update the
   * resources & properties.
   *
   * However, since basic component couldn't know what is the
   * initialization state, so that the concrete component should
   * implement the setup function, which would return the state after
   * receive the component instance.
   */
  LockScreenBasicComponent.prototype.start = function(resources) {
    if (resources) {
      for (var key in this.resources) {
        if ('undefined' !== resources[key]) {
          this.resources[key] = resources[key];
        }
      }
    }
    // Get the initialization state and let it fetch & set all.
    // 'initializeStateMachine', if Java doomed the world.
    // (and this is ECMAScript, a language (partially) inspired by Scheme!).
    this._activeState = this.setup();
    return this._activeState.start();
  };

  /**
   * Receive the compoennt instance and return a initialization state
   * which would fetch resources and set properties for this component.
   *
   * The concrete component should implement this.
   */
  LockScreenBasicComponent.prototype.setup = function(component) {};

  LockScreenBasicComponent.prototype.stop = function() {
    return this._activeState.stop();
  };

  LockScreenBasicComponent.prototype.destroy = function() {
    return this._activeState.destroy();
  };

  LockScreenBasicComponent.prototype.live = function() {
    return this._activeState.until('stop');
  };

  LockScreenBasicComponent.prototype.exist = function() {
    return this._activeState.until('destroy');
  };

  /**
   * Can command all sub-components with one method and its arguments.
   * For example, to 'start', or 'stop' them.
   * Will return a Promise only be resolved after all sub-components
   * executed the command. For example:
   *
   * subcomponents: {
   *    buttons: [ButtonFoo, ButtonBar]
   *    submit: Submit
   * }
   * var promised = parent.waitComponent(parent.stop.bind(parent));
   *
   * The promised would be resolved only after ButtonFoo, ButtonBar and Submit
   * are all stopped.
   *
   * And since for states the sub-components is delegated to Component,
   * state should only command these sub-components via this method,
   * or access them individually via the component instance set at the
   * setup stage.
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
   * Transfer to the final state. Every component should be able to directly
   * move to this state. Since for parent component it must ensure its children
   * all refer no resources and don't response to any input.
   *
   * Concrete component should derive this function if different halting state
   * is required.
   */
  LockScreenBasicComponent.prototype.halt = function() {
    this.transferTo(LockScreenStateHalt);
  };

  exports.LockScreenBasicComponent = LockScreenBasicComponent;
})(window);

