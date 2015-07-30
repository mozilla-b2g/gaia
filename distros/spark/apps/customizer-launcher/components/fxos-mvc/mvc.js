/**
 * Model
 */
export class Model {
  constructor(properties) {
    properties = properties || {};

    for (var key in properties) {
      this[key] = properties[key];
    }

    this.observableProperties = {};

    Object.observe(this, (changes) => {
      changes.forEach((change) => {
        var handlers = this.observableProperties[change.name];
        if (handlers) {
          handlers.forEach((handler) => {
            handler(change);
          });
        }
      });
    });
  }

  on(property, handler) {
    if (typeof handler !== 'function') {
      return;
    }

    if (!this.observableProperties[property]) {
      ObserveUtils.defineObservableProperties(this, property);
      this.observableProperties[property] = [];
    }

    this.observableProperties[property].push(handler);
  }
}

/**
 * View
 */
var events = {};

export class View {
  constructor(options) {
    options = options || {};

    for (var key in options) {
      this[key] = options[key];
    }

    if (!this.el) {
      this.el = document.createElement('div');
    }
  }

  /**
   * Initializes an instance with the specified controller.
   *
   * @param  {Controller} controller
   * @return {View}
   */
  init(controller) {
    this.controller = controller;

    return this;
  }

  /**
   * Renders the layout wrapper for the template.
   *
   * @param {Template} Inner template
   * @return {String} Rendered layout with template
   */
  layout(template) {
    return template;
  }

  /**
   * Render the default template.
   */
  render(params) {
    var innerHTML = '';

    if (params) {
      if (typeof params === 'object') {
        for (var index in params) {
          var param = params[index];
          innerHTML += this.template(param);
        }
      } else {
        for (let i = 0; i < params.length; i++) {
          var param = params[i];
          innerHTML += this.template(param);
        }
      }
    } else {
      innerHTML = this.template();
    }

    this.el.innerHTML = this.layout(innerHTML);
  }

  /**
   * Override to provide a function that returns the template string.
   *
   * @return {String}
   */
  template() {
    return '';
  }

  /**
   * Finds a single child element using the specified selector.
   *
   * @param  {String} query
   * @return {Element | null}
   */
  $(selector) {
    return this.el.querySelector(selector);
  }

  /**
   * Finds all child elements using the specified selector.
   *
   * @param  {String} query
   * @return {NodeList}
   */
  $$(selector) {
    return this.el.querySelectorAll(selector);
  }

  /**
   *
   *
   */
  on(type, selector, handler, scope) {
    var controller = this.controller;
    scope = scope || this.el;

    if (!events[type]) {
      events[type] = [];
      window.addEventListener(type, delegateHandler, true);
    }

    events[type].push({
      selector: selector,
      handler: handler,
      controller: controller,
      scope: scope
    });
  }

  /**
   *
   *
   */
  off(type, selector, handler) {
    if (!events[type]) {
      return;
    }

    events[type] = events[type].filter((delegate) => {
      if (typeof handler === 'function') {
        return delegate.selector !== selector ||
          delegate.handler  !== handler;
      }

      return delegate.selector !== selector;
    });
  }
}

/**
 * Forward an event based on the target's `[data-action]` attr to the controller.
 * e.g. "click" on a `<button data-action="cancel">` goes to controller.cancel()
 */
function handleAction(event, controller) {
  var action = event.target.dataset.action;
  if (controller && controller[action]) {
    controller[action](event);
  }
}

function delegateHandler(event) {
  var target = event.target;

  events[event.type].forEach((delegate) => {
    if (delegate.scope.contains(target) && target.matches(delegate.selector)) {
      if (delegate.handler) {
        delegate.handler.call(target, event);
      } else {
        handleAction(event, delegate.controller);
      }
    }
  });
}

/**
 * Controller
 */
export class Controller {
  constructor(options) {
    options = options || {};

    for (var key in options) {
      this[key] = options[key];
    }

    // Initialize the view (if applicable) when the
    // controller is instantiated.
    if (this.view && typeof this.view.init === 'function') {
      this.view.init(this);
    }
  }

  teardown() {

  }

  main() {

  }
}

export class RoutingController extends Controller {
  constructor(controllers) {
    if (window.routingController) {
      console.error('Document can only contain one RoutingController');
      return;
    }

    super();
    this._controllers = controllers;
    this.activeController = null;
    window.routingController = this;
    window.addEventListener('hashchange', this.route.bind(this));
  }

  route() {
    var route = window.location.hash.slice(1);
    var controller = this._controllers[route];
    if (controller) {
      if (this.activeController) {
        this.activeController.teardown();
      }

      this.activeController = controller;
      controller.main();
    }
  }

  controller(id) {
    return this._controllers[id];
  }
}

/**
 * Service
 */
export class Service {
  constructor() {
    this._listeners = {};
    this._dispatchedEvents = {};
  }

  addEventListener(name, callback, trigger) {
    if (!this._listeners[name]) {
      this._listeners[name] = [callback];
    } else {
      this._listeners[name].push(callback);
    }

    if (trigger && this._dispatchedEvents[name] !== undefined) {
      setTimeout(() => {
        callback(this._dispatchedEvents[name]);
      });
    }
  }

  removeEventListener(name, callback) {
    if (!this._listeners[name]) {
      return;
    }

    var listenerIndex;
    this._listeners[name].find((listener, index) => {
      if (listener === callback) {
        listenerIndex = index;
      }

      return listenerIndex !== undefined;
    });

    if (listenerIndex !== undefined) {
      this._listeners[name].splice(listenerIndex, 1);
    }
  }

  _dispatchEvent(name, params) {
    if (!this._listeners[name]) {
      return;
    }

    this._dispatchedEvents[name] = params || null;

    this._listeners[name].forEach((listener) => {
      listener(params);
    });
  }
}
