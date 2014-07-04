/* global
      Promise,
      Utils
*/

/* exported Navigation */

'use strict';

(function(window) {

// This function is used as a rejection handler, to swallow errors and log them
function catchError(e) {
  if (e) {
    console.error(
      'Navigation.toPanel: got an exception: (%s) %s',
      e, e.stack && e.stack.replace(/\n/g, '|')
    );
  } else {
    console.log('Navigation.toPanel: got a rejected promise');
  }
}

var currentPanel;
var queuedPanel;

function nextQueuedPanel() {
  if (queuedPanel) {
    var next = queuedPanel;
    queuedPanel = null;
    Navigation.toPanel(next.panel, next.args)
      .then(next.defer.resolve, next.defer.reject);
  }
}

var Navigation = window.Navigation = {
  panelObjects: window,

  defaultPanel: 'thread-list',

  panels: {
    'thread': {
      behaviour: 'ThreadUI',
      wrapperPosition: 'left'
    },
    'thread-list': {
      behaviour: 'ThreadListUI',
      wrapperPosition: 'right'
    },
    'composer': {
      behaviour: 'ThreadUI',
      wrapperPosition: 'left'
    },
    'group-view': {
      behaviour: 'GroupView',
      wrapperPosition: 'left'
    },
    'report-view': {
      behaviour: 'ReportView',
      wrapperPosition: 'left'
    }
  },

  init: function n_init() {
    this.mainWrapper = document.getElementById('main-wrapper');
    this.transitioning = false;

    return this.toPanelFromHash();
  },

  /**
   * Returns a boolean.
   *
   * Called with a first argument that is not an object, it returns whether the
   * current panel is this first argument.
   *
   * Called with 2 arguments, the first one is not an object, the second one
   * must be an object. It returns whether the current panel is the first
   * argument, and for each property of the second argument, whether its value
   * is equal to the value for the current panel's arguments' same property.
   *
   * Called with 1 argument that is an object, it must have 2 properties panel
   * and args, which have the same meaning as the 2-argument call.
   */
  isCurrentPanel: function n_isCurrentPanel(panel, args) {
    if (!currentPanel || !panel) {
      return false;
    }

    if (typeof panel === 'object') {
      args = panel.args;
      panel = panel.panel;
    }

    if (panel !== currentPanel.panel) {
      return false;
    }

    if (!args) {
      return true;
    }

    var currentArgs = currentPanel.args || {};

    for (var arg in args) {
      if (args[arg] !== currentArgs[arg]) {
        return false;
      }
    }

    return true;
  },

  /*
   * Returns the currentPanel object, with 2
   * properties: panel, args.
   */
  getCurrentPanel: function n_getCurrentPanel() {
    return currentPanel;
  },

  /**
   * Lifecycle methods are called in this order:
   * - previousPanel.beforeLeave
   * - nextPanel.beforeEnter
   * - previousPanel.afterLeave
   * - nextPanel.afterEnter
   *
   * The panels are slid between beforeEnter and afterLeave.
   *
   * Therefore it is expected that:
   * - beforeLeave does not change any state but merely checks whether the
   *   transition can take place
   * - beforeEnter checks whether the transition can take place and make any
   *   visual change that should be made before the transition
   * - afterLeave cleans up the panel, reclaim memory
   * - afterEnter does left-over actions
   *
   * beforeLeave and beforeEnter can :
   * - throw or return a rejected Promise to stop the transition.
   * - finish normally or return a resolved Promise to continue the transition
   *
   * However, afterLeave and afterEnter should only finish normally or return a
   * resolved Promise. Otherwise, the errors will be logged but the transition
   * will finish.
   *
   * toPanel itself returns a Promise that will be resolved if the transition
   * happened and rejected otherwise.
   */
  toPanel: function n_toPanel(panel, args) {
    if (!(panel in this.panels)) {
      return Promise.reject(new Error('Panel ' + panel + ' is unknown.'));
    }

    if (this.transitioning) {
      queuedPanel = {
        panel: panel,
        args: args
      };

      return new Promise(function(resolve, reject) {
        queuedPanel.defer = {
          resolve: resolve,
          reject: reject
        };
      });
    }

    // this checks both panel and args
    if (this.isCurrentPanel(panel, args)) {
      return Promise.resolve();
    }

    var transitionArgs = args || {};

    this.transitioning = true;

    document.activeElement.blur();

    transitionArgs.meta = {
      next: {
        panel: panel,
        args: args
      },
      prev: currentPanel
    };

    var nextPanelInfo = this.panels[panel];
    var nextPanelObject = this.panelObjects[nextPanelInfo.behaviour];

    if (!nextPanelObject) {
      var error = new Error(
        'Navigation.toPanel: no behaviour found for panel ' + panel
      );
      return Promise.reject(error);
    }

    var currentPanelObject;
    if (currentPanel) {
      var currentPanelInfo = this.panels[currentPanel.panel];
      currentPanelObject = this.panelObjects[currentPanelInfo.behaviour];
    }

    var promise = Promise.resolve();

    // beforeLeave and beforeEnter can return a rejected promise to prevent
    // sliding. An exception is never expected though.
    if (currentPanelObject && currentPanelObject.beforeLeave) {
      promise = promise.then(
        currentPanelObject.beforeLeave.bind(currentPanelObject, transitionArgs)
      );
    }

    if (nextPanelObject.beforeEnter) {
      promise = promise.then(
        nextPanelObject.beforeEnter.bind(nextPanelObject, transitionArgs)
      );
    }

    promise = promise.then(function resetPanel() {
      // While we're sliding, we aren't in any panel
      currentPanel = null;
    });

    // sliding
    promise = promise.then(
      this.slide.bind(this, nextPanelInfo.wrapperPosition)
    ).then(function changePanel() {
      currentPanel = {
        panel: panel,
        args: args
      };
    });

    // afterLeave and afterEnter should not trigger errors
    promise = promise.then(function() {
      var promise = Promise.resolve();

      if (currentPanelObject && currentPanelObject.afterLeave) {
        promise = promise.then(
          currentPanelObject.afterLeave.bind(currentPanelObject, transitionArgs)
        ).catch(catchError);
      }

      if (nextPanelObject.afterEnter) {
        promise = promise.then(
          nextPanelObject.afterEnter.bind(nextPanelObject, transitionArgs)
        ).catch(catchError);
      }

      return promise;
    });

    promise = promise.then(
      function resolved() {
        this.transitioning = false;
      }.bind(this),
      function rejected(e) {
        catchError(e);
        this.transitioning = false;
        return Promise.reject(new Error('Error while transitioning'));
      }.bind(this)
    );

    promise.then(nextQueuedPanel, nextQueuedPanel);

    return promise;
  },

  getPanelName: function n_getPanelName() {
    var hash = window.location.hash;
    if (hash.length && hash.startsWith('#')) {
      hash = hash.slice(1);
    }

    var index;
    if ((index = hash.indexOf('&')) !== -1) {
      hash = hash.slice(0, index);
    }

    return hash;
  },

  toPanelFromHash: function n_toPanelFromHash() {
    var panelName = this.getPanelName() || this.defaultPanel;
    return this.toPanel(panelName, Utils.params(window.location.hash));
  },

  slide: function n_slide(position) {
    var wrapper = this.mainWrapper;

    if (wrapper.dataset.position === position) {
      return Promise.resolve();
    }

    wrapper.dataset.position = position;

    return new Promise(function(resolve, reject) {
      // We have 2 panels, so we get 2 transitionend for each step
      var trEndCount = 0;

      wrapper.addEventListener('transitionend', function trWait(e) {
        trEndCount++;

        if (trEndCount < 2) {
          return;
        }

        e.currentTarget.removeEventListener(e.type, trWait);
        resolve();
      });
    });
  }

};

})(window);
