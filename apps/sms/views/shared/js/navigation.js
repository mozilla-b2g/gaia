/*global
  EventDispatcher,
  Utils
 */

(function(window) {
'use strict';

/* The factory will be used in unit tests. */
var NavigationFactory = window.NavigationFactory = function(window) {

/**
 * @function
 * The debug function translates to console.log in debug mode.
 *
 * @param {String} arg1 The first value to be displayed to the console.
 * @param {...*} args The other values to be displayed to the console, or the
 * parameters to the first string.
 */
const debug = [
  () => {},
  (arg1, ...args) => console.log('[Navigation] ' + arg1, ...args),
  (arg1, ...args) =>
    console.log('[Navigation] (%s) ' + arg1, Date.now(), ...args),
][0];

/**
  * This contains an array of view characteristics, necessary to handle
  * navigation requests.
  * Each item has the following properties:
  * - name: this is the name of the view. This will be used also in the URL
  *   hash if the same HTML file holds several views.
  * - url: this is the URL used to match the current location and find the
  *   current view.
  * - behavior: this is the actual JavaScript object that manages this view.
  * - previous (optional): this is the name of the previous view; this is
  *   necessary to decide if we do a forward/backward animation.
  * - partOf (optional): this is used when a view is part of another view's
  *   HTML document. In that case one view is "master" and the other are only
  *   part of the master view.
  *
  * NGA_VIEWS holds the configuration for NGA split views.
  */
const NGA_VIEWS = Object.freeze([
  Object.freeze({
    name: 'thread',
    url: 'views/conversation/index.html',
    behavior: 'ConversationView',
    previous: 'thread-list'
  }),
  Object.freeze({
    name: 'thread-list',
    url: 'views/inbox/index.html',
    behavior: 'InboxView'
  }),
  Object.freeze({
    name: 'report-view',
    behavior: 'ReportView',
    previous: 'thread',
    partOf: 'thread'
  }),
  Object.freeze({
    name: 'composer',
    behavior: 'ConversationView',
    previous: 'thread-list',
    partOf: 'thread'
  }),
  Object.freeze({
    name: 'group-view',
    behavior: 'GroupView',
    previous: 'thread',
    partOf: 'thread'
  })
]);

/**
  * OA_VIEWS holds the configuration for the old non-split architecture.
  */
const OA_VIEWS = Object.freeze([
  Object.freeze({
    name: 'thread-list',
    url: 'index.html',
    behavior: 'InboxView'
  }),
  Object.freeze({
    name: 'thread',
    behavior: 'ConversationView',
    previous: 'thread-list',
    partOf: 'thread-list'
  }),
  Object.freeze({
    name: 'composer',
    behavior: 'ConversationView',
    previous: 'thread-list',
    partOf: 'thread-list'
  }),
  Object.freeze({
    name: 'group-view',
    behavior: 'GroupView',
    previous: 'thread',
    partOf: 'thread-list'
  }),
  Object.freeze({
    name: 'report-view',
    behavior: 'ReportView',
    previous: 'thread',
    partOf: 'thread-list'
  })
]);

const VIEWS = isUsingOldArchitecture() ? OA_VIEWS : NGA_VIEWS;

var currentState;
var navigationTransition;

/**
 * Navigate to this URL.
 *
 * @param {String} url URL to load.
 */
function setLocation(url) {
  debug('Setting location', url);
  window.location.assign(url);
}

/**
 * We're using the old architecture if we're not in a split document.
 *
 * @returns {Boolean} true if we're using the old architecture.
 */
function isUsingOldArchitecture() {
  debug('isUsingOldArchitecture()');
  var pathname = window.location.pathname;
  var result = (pathname === '/' || pathname === '/index.html');
  debug('isUsingOldArchitecture() =>', result);
  return result;
}

/**
 * Parses hash to find a view name.
 * It takes the part of the hash between '/' or the start of the string, and '?'
 * or the end of the string.
 *
 * Examples:
 *   #/conversation?id=5               => conversation
 *   #/composer?recipient=+33615647897 => composer
 *   #/composer                        => composer
 *
 * @param {String} hash The string to analyze.
 * @returns {String} The analyzed string. It is not guaranteed to be an existing
 * view name.
 */
function findViewNameFromHash(hash) {
  debug('findViewNameFromHash(%s)', hash);
  if (!hash || !hash.startsWith('#/')) {
    return null;
  }

  var endOfViewName = hash.indexOf('?');
  if (endOfViewName < 0) {
    endOfViewName = undefined;
  }

  return hash.slice(2, endOfViewName);
}

/**
 * Tries to find the correct view from the location.
 *
 * First it tries to find the view using the location's hash.
 * If findViewNameFromHash returns something, we try to match an existing view
 * from this name, then we check whether the found view is indeed part of this
 * document using the full URL.
 *
 * If findViewNameFromHash returns nothing, we try to find a view from the full
 * URL.
 *
 * @param {Location} location The content of window.location.
 * @returns {Object} The found view, or null.
 */
function findViewFromLocation(location) {
  debug('findViewFromLocation(%s)', location.href);

  var pathName = location.pathname;
  if (pathName.endsWith('/')) {
    pathName += 'index.html';
  }

  var hash = location.hash;
  var viewNameFromHash = findViewNameFromHash(hash);
  var viewFromHash = findViewFromName(viewNameFromHash);
  if (viewNameFromHash && !viewFromHash) {
    console.error('We found no view from the hash %s', hash);
    return null;
  }

  var viewFromPath = VIEWS.find(
    (view) => pathName.endsWith('/' + view.url)
  ) || null;

  if (!viewFromPath) {
    console.error('We found no view from the path %s', pathName);
    return null;
  }

  if (viewFromHash && viewFromHash.partOf &&
      viewFromHash.partOf !== viewFromPath.name) {
    console.error(
      'The view %s found from the hash %s is not part of view %s',
      viewFromHash.name, hash, viewFromPath.name
    );
    viewFromHash = null;
  }

  return viewFromHash || viewFromPath;
}

/**
 * Finds a view from its name.
 *
 * @param {String} name Name of the view to find.
 * @returns {Object} The found view, or null.
 */
function findViewFromName(name) {
  debug('findViewFromName(%s)', name);
  var view = VIEWS.find((view) => view.name === name) || null;

  debug('findViewFromName() => %s', view && view.name);
  return view;
}

/**
 * Finds the container view of a view.
 *
 * @param {Object} view A view or a subview.
 * @returns {Object} the container view of the parameter view. It can be the
 * same object if the parameter is itself the container view.
 */
function findContainerView(view) {
  debug('findContainerView(%s)', view.name);
  if (view.partOf) {
    debug('findContainerView: %s is part of view %s', view.name, view.partOf);
    view = findViewFromName(view.partOf);
  }

  debug('findContainerView() => %s', view.name);
  return view;
}

/**
 * @type {Defer}
 * Used at startup time to indicate when the app loaded all dependencies.
 * Will be nullified once the app is ready.
 * @see Navigation.setReady
 * @see waitForReady
 */
var readyDefer = Utils.Promise.defer();

/**
 * @returns {Promise} Resolved when the app is ready, rejected if the app is
 * ready at call time.
 */
function waitForReady() {
  if (!readyDefer) {
    return Promise.reject(
      new Error('waitForReady was called but status is ready already.')
    );
  }

  return readyDefer.promise;
}

function startNavigationFromCurrentLocation() {
  var location = window.location;
  debug('startNavigationFromCurrentLocation(), location=%s', location);

  var newPanel = findViewFromLocation(location);
  if (!newPanel) {
    return Promise.reject(
      new Error('Couldn\'t find a view from location ' + location.href)
    );
  }

  var args = Utils.params(decodeURIComponent(location.hash));

  debug(
    'startNavigationFromCurrentLocation:',
    'found panel', newPanel.name, 'with args', args
  );

  return startNavigation({ newPanel, args });
}

/**
 * Sets up the state to handle the navigation.
 * Generally we're waiting for any ongoing transition to end before starting a
 * new one. However if the ongoing transition was started with opts.partial ==
 * true, we merely augment the ongoing transition with the new information,
 * especially arguments.
 *
 * @param {Object} opts options
 * @param {String} [opts.newPanel] The panel we'll switch to. This can be
 * omitted in case we only want to execute beforeLeave.
 * @param {Object} [opts.args] The arguments we'll use for the next panel.
 * @param {Boolean} [opts.partial] If present and true, this new navigation
 * request is a partial one missing information (eg arguments) and we'll call
 * startNavigation once again without this property once we'll know the missing
 * bits.
 *
 * @returns {Promise} Resolved when we could start the navigation (when a
 * previous ongoing one is finished).
 */
function startNavigation(opts) {
  var { newPanel, args, partial } = opts;

  args = args || {};

  debug(
    'startNavigation(newPanel=%s, partial=%s)',
    newPanel && newPanel.name, partial
  );
  if (navigationTransition && (!navigationTransition.partial || partial)) {
    debug('startNavigation: previous navigation exists, deferring.');
    return navigationTransition.defer.promise.then(
      () => startNavigation(opts)
    );
  }

  var newContainerView = newPanel && findContainerView(newPanel);
  var containerView = currentState && findContainerView(currentState.panel);
  var leaveDocument = currentState && containerView !== newContainerView;

  if (newPanel && !leaveDocument) {
    var behaviorObject = window[newPanel.behavior];
    var viewReady =
      behaviorObject &&
      (typeof behaviorObject.isReady !== 'function' ||
       behaviorObject.isReady());

    if (!viewReady) {
      // This panel is not ready yet, let's wait until the app is ready.
      return waitForReady().then(
        () => startNavigation(opts)
      );
    }
  }

  // Remove the focus before navigating.
  document.activeElement.blur();

  if (!navigationTransition) {
    navigationTransition = {
      stepsRun: [],
      defer: Utils.Promise.defer()
    };
  }

  navigationTransition.partial = partial;
  navigationTransition.leaveDocument = leaveDocument;

  if ('meta' in args) {
    throw new Error('Arguments cannot have a `meta` property.');
  }

  navigationTransition.transitionArgs = {
    meta: {
      next: newPanel ? {
        panel: newPanel.name,
        args
      } : null,
      prev: currentState ? {
        panel: currentState.panel.name,
        args: currentState.args
      } : null
    }
  };

  Object.assign(navigationTransition.transitionArgs, args);

  navigationTransition.states = {
    from: currentState,
    to: {
      panel: newPanel,
      args
    }
  };

  return Promise.resolve();
}

/**
 * Sets the currentState variable to its new value.
 */
function setFutureState() {
  debug('setFutureState()');
  currentState = navigationTransition.states.to;
}

/**
 * Ends the navigation so that new navigations can take place.
 * This cleans up the navigation states.
 */
function endNavigation() {
  debug('endNavigation()');
  if (navigationTransition) {
    navigationTransition.defer.resolve();
    navigationTransition = null;
  }
}

/**
 * This function is used to catch errors at the end of navigation promise
 * chains. We're ending the navigation if this happens, so that we can start a
 * new one afterwards.
 *
 * @param {Error} [e] The exception to display, if any.
 */
function onNavigationError(e = new Error('RejectedPromise')) {
  console.error('Navigation error', e);
  endNavigation();
  return Promise.reject(e);
}

/**
 * This function is used as a rejection handler, to swallow errors and log them.
 *
 * @param {Exception} [e] The exception to display, if any.
 */
function catchStepError(e) {
  if (e) {
    console.error(
      '[Navigation] got an exception: (%s) %s',
      e, e.stack && e.stack.replace(/\n/g, '|')
    );
  } else {
    debug('[Navigation] got a rejected promise');
  }
}

/**
 * Executes the lifecycle function for `stepName` on the right object.
 *
 * @param {String} stepName The step to execute: one of 'beforeLeave',
 * 'beforeEnter', 'afterLeave', 'afterEnter'.
 * @returns {Promise} Resolved when the step returns a value or a resolved
 * promise, rejected when the step either throws or returns a rejected promise.
 * Or a resolved promise if no step was executed (because it was already
 * executed or there was no function to execute).
 */
function executeNavigationStep(stepName) {
  debug('executeNavigationStep(%s)', stepName);
  if (!navigationTransition) {
    return Promise.reject(new Error(
      'Trying to execute the navigation step ' + stepName +
      ' but no transition is started yet.'
    ));
  }

  if (navigationTransition.stepsRun.indexOf(stepName) >= 0) {
    // this step has already run (case of back -> onHashChange)
    debug('executeNavigationStep: step %s has already run.', stepName);
    return Promise.resolve();
  }

  var stateKey = stepName.endsWith('Leave') ? 'from' : 'to';
  var state = navigationTransition.states[stateKey];
  if (!state) {
    debug('Nothing to execute for step', stepName);
    return Promise.resolve();
  }

  var panel = state.panel;

  var resultPromise = Promise.resolve();
  var viewObject = window[panel.behavior];
  if (viewObject[stepName]) {
    // encapsulating as a then handler to catch exceptions.
    resultPromise = resultPromise.then(
      () => viewObject[stepName](navigationTransition.transitionArgs)
    );
  }

  return resultPromise.then(() => {
    navigationTransition.stepsRun.push(stepName);
    debug(`Finished executeNavigationStep(${stepName})`);
  });
}

/**
 * Attach a handler to run the `afterEnter` step after the page is loaded.
 * It uses either the custom event `navigation-transition-end` or the usual
 * `load` event.
 * @returns {Promise} Resolved once afterEnter is run.
 */
function attachAfterEnterHandler() {
  if (document.readyState === 'complete') {
    return executeNavigationStep('afterEnter').catch(catchStepError);
  }

  var defer = Utils.Promise.defer();

  function onNavigationEnd() {
    window.removeEventListener('navigation-transition-end', onNavigationEnd);
    window.removeEventListener('load', onNavigationEnd);
    defer.resolve(executeNavigationStep('afterEnter'));
  }

  window.addEventListener('navigation-transition-end', onNavigationEnd);
  window.addEventListener('load', onNavigationEnd); // simulate navigation end

  return defer.promise.catch(catchStepError);
}

/**
 * Used in `waitForSlideAnimation` to help solving race conditions.
 * @type {Defer}
 */
var previousAnimationDefer;

/**
 * Wait for the end of an animation on `panelElement`.
 *
 * @param {Element} panelElement The element to watch.
 * @returns {Promise} Resolves when the animation ends.
 */
function waitForSlideAnimation(panelElement) {
  if (previousAnimationDefer) {
    previousAnimationDefer.reject(new Error('A new animation started'));
  }

  var defer = Utils.Promise.defer();
  previousAnimationDefer = defer;

  var timeout;

  function onAnimationEnd(e) {
    panelElement.removeEventListener('animationend', onAnimationEnd);
    clearTimeout(timeout);
    debug('animationend', e && e.type);
    defer.resolve();
  }

  panelElement.addEventListener('animationend', onAnimationEnd);
  timeout = setTimeout(onAnimationEnd, 500);

  return defer.promise.then(() => previousAnimationDefer = null);
}

/**
 * Hides current panel, shows new panel.
 * It will use an animation if we change panels in the same document.
 *
 * @returns {Promise} Resolves when the animation is over, if there is an
 * animation. Otherwise returns a resolved promise.
 */
function switchPanel() {
  debug('switchPanel()');
  if (!navigationTransition) {
    throw new Error(
      'Trying to switch panel but no transition is started yet.'
    );
  }

  var from = navigationTransition.states.from;
  var to = navigationTransition.states.to;

  var oldView;
  var oldPanelElement;

  if (from) {
    oldView = from.panel;
    oldPanelElement = document.querySelector(`.panel-${oldView.behavior}`);
    if (!oldPanelElement) {
      throw new Error(
        'Couldn\'t find the container element for view ' + oldView.name
      );
    }
  }

  var newView = to.panel;
  if (!newView) {
    throw new Error(
      'Trying to switch panel, but no new view is defined!'
    );
  }

  var newPanelElement = document.querySelector(`.panel-${newView.behavior}`);
  if (!newPanelElement) {
    return Promise.reject(new Error(
      'Couldn\'t find the container element for view ' + newView.name
    ));
  }

  var isGoingBack = oldView && oldView.previous === newView.name;

  newPanelElement.style = '';

  var doSlideAnimation =
    from && from.panel &&
    from.panel.behavior !== newView.behavior;

  var animationPromise;
  if (doSlideAnimation) {

    newPanelElement.style.animationName =
      isGoingBack ? 'new-slide-right' : 'new-slide-left';
    oldPanelElement.style.animationName =
      isGoingBack ? 'old-slide-right' : 'old-slide-left';

    animationPromise = waitForSlideAnimation(newPanelElement).catch(
      () => {}
    ).then(() => {
      oldPanelElement.style = '';
      newPanelElement.style = '';
    });
  }

  return (animationPromise || Promise.resolve()).then(() => {
    if (oldView) {
      oldPanelElement.classList.remove('panel-active');
    }

    newPanelElement.classList.add('panel-active');
  });
}

/**
 * Reacts to hash changes.
 *
 * This is the heart of the navigation logic and handles running the various
 * navigation steps.
 * It also handles any unwanted errors. (TODO: needs to tune this a little
 * more).
 */
function onHashChange() {
  debug('onHashChange, location=', window.location);

  startNavigationFromCurrentLocation().then(
    () => executeNavigationStep('beforeLeave')
  ).then(
    () => executeNavigationStep('beforeEnter').catch(catchStepError)
  ).then(
    setFutureState
  ).then(
    switchPanel
  ).then(
    () => executeNavigationStep('afterEnter').catch(catchStepError)
  ).then(
    () => executeNavigationStep('afterLeave').catch(catchStepError)
  ).then(
    endNavigation
  ).then(
    () => Navigation.emit('navigated')
  ).catch(onNavigationError); // TODO reset to previous hash or call back ?
}

/**
 * Attaches the hashchange event handler.
 */
function attachHistoryListener() {
  window.addEventListener('hashchange', onHashChange);
}

/**
 * Removes the hashchange event handler.
 */
function detachHistoryListener() {
  window.removeEventListener('hashchange', onHashChange);
}

var Navigation = {
  /**
   * Calls `window.back` after running the `beforeLeave` step.
   *
   * We'll either (1) stay in the same document, or (2) move back to an earlier
   * document.
   *
   * In case 1), this will only change the hash, and then the onHashChange event
   * handler takes care of the end of the transition.
   * In case 2), the full URL will change, and the new window's init method will
   * take care of the end of the transition.
   *
   * @returns {Promise} Resolves when the action is done, if we stay in the same
   * document.
   */
  back() {
    debug('back()');
    return startNavigation({ partial: true }).then(
      () => executeNavigationStep('beforeLeave')
    ).then(
      () => window.history.back()
    ).then(
      () => navigationTransition.defer.promise,
      onNavigationError
    );
    // todo reset navigation on "pageshow" event ?
  },

  /**
   * Lifecycle methods are generally called in this order:
   * - previousPanel.beforeLeave
   * - nextPanel.beforeEnter
   * - nextPanel.afterEnter
   * - previousPanel.afterLeave
   *
   * If we stay in the same document and enter a new panel, the panels are slid
   * between beforeEnter and afterLeave.
   *
   * With the new architecture, the navigation can happen in one of 2 cases:
   * 1. either we stay in the same document,
   * 2. or we move to another document.
   *
   * In case 1), we only change the hash, and then the onHashChange event
   * handler takes care of the end of the transition.
   * In case 2), we change the full URL, and the new window's init method will
   * take care of the end of the transition.
   *
   * In all cases:
   * - beforeLeave can prevent changing the location and thus the
   *   navigation. It is expected that beforeLeave does not change any state but
   *   merely checks whether the transition can take place.
   * - beforeEnter will be called before the view is displayed. Therefore it can
   *   make visual changes but it can't prevent a view from being entered. All
   *   rejections and exceptions will be swallowed and output to the console.
   * - afterEnter does left-over actions
   * - afterLeave needs to clean up the panel, reclaim memory. It's called only
   *   when the user stays in the same document.
   *
   * toPanel itself returns a Promise that will be resolved if the transition
   * happened and rejected otherwise.
   *
   * @param {String} viewName The view to load.
   * @param {Object} [args] The arguments to pass to the view.
   * @returns {Promise} Resolves when the transition is over, if we stay in the
   * same document.
   */
  toPanel(viewName, args) {
    debug('toPanel(%s)', viewName);
    var view = findViewFromName(viewName);

    if (!view) {
      return Promise.reject(
        new Error(`Couldn't find view ${viewName}`)
      );
    }

    if (this.isCurrentPanel(viewName, args)) {
      debug('View %s is the current view.', viewName);
      return Promise.resolve();
    }

    var hash = '#';
    if (view.partOf) {
      hash += '/' + viewName;
    }
    hash = Utils.url(hash, args);

    return startNavigation(
      { newPanel: view, args, partial: true }
    ).then(
      () => executeNavigationStep('beforeLeave')
    ).then(() => {
      var nextLocation;
      if (navigationTransition.leaveDocument) {
        var containerView = findContainerView(view);
        nextLocation = '/' + containerView.url + hash;
      } else {
        nextLocation = hash;
      }

      setLocation(nextLocation);
    }).then(
      () => navigationTransition.defer.promise,
      onNavigationError
    );
    // TODO do something on pageshow?
    //
  },

  /**
   * This is called when a view is started.
   *
   * It tries to find the right view from the location, and then initiates a
   * navigation from this.
   */
  init() {
    debug('init()');

    attachHistoryListener();

    return startNavigationFromCurrentLocation().then(
      // right away as we don't execute anything on the previous panel, and we
      // need a state at startup.
      setFutureState
    ).then(
      () => executeNavigationStep('beforeEnter').catch(catchStepError)
    ).then(
      switchPanel
    ).then(
      attachAfterEnterHandler
    ).then(
      endNavigation
    ).then(
      () => Navigation.emit('navigated')
    ).catch(onNavigationError);
  },

  /* will be used by tests */
  cleanup() {
    detachHistoryListener();
  },

  /**
   * Checks if current location.hash corresponds to default panel. This is
   * sometimes called before we resolve the state, in that case resolve
   * directly using findViewNameFromHash. Otherwise we use the resolved state.
   *
   * @returns {boolean} True if current location.hash corresponds to default
   * panel.
   */
  isDefaultPanel() {
    return currentState ?
      !currentState.panel.partOf :
      !findViewNameFromHash(window.location.hash);
  },

  /**
    * Called with a first argument that is not an object, it returns whether the
    * current panel is this first argument.
    *
    * Called with 2 arguments, the first one is not an object, the second one
    * must be an object. It returns whether the current panel is the first
    * argument, and for each property of the second argument, whether its value
    * is equal to the value for the current panel's arguments' same property.
    *
    * @param {String} panelName Checks if the current panel is this panelName.
    * @param {Object} [args] Checks against the current panel enter
    * arguments.
    * @returns {boolean} Result of the comparison.
    */
  isCurrentPanel(panelName, args) {
    debug('isCurrentPanel(%s)', panelName);
    if (!currentState || !panelName) {
      return false;
    }

    if (panelName !== currentState.panel.name) {
      return false;
    }

    if (!args) {
      return true;
    }

    var currentArgs = currentState.args || {};

    for (var arg in args) {
      if (args[arg] != currentArgs[arg]) {
        return false;
      }
    }

    return true;
  },

  /**
   * Called by startup scripts to indicate when all lazy loaded files are
   * downloaded.
   *
   * TODO: lazyload the necessary files directly in this file.
   */
  setReady() {
    debug('setReady()');
    readyDefer.resolve();
    readyDefer = null;
  },

  onTransitionFinished() {
    return navigationTransition ?
      navigationTransition.defer.promise :
      Promise.resolve();
  }

};

return EventDispatcher.mixin(Navigation, ['navigated']);

};

window.Navigation = NavigationFactory(window);
})(window);
