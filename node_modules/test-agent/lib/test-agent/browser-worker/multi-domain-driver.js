(function(window) {
  'use strict';

  // This Driver is used in the main Test-Agent window, to manage the iframes
  // sandboxes for each domain

  function Driver(options) {
    var key;
    if (typeof(options) === 'undefined') {
      options = {};
    }

    this.testGroups = {};
    this.sandboxes = {};
    this._batches = [];

    for (key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }
  }

  Driver.prototype = {

    allowedDomains: '*',

    window: window,

    forwardEvents: ['test data', 'error', 'set test envs'],

    listenToWorker: 'post-message',

    iframeAttrs: null,

    enhance: function(worker) {
      var self = this,
          onMessage;

      onMessage = this.onMessage.bind(this, worker);
      this.worker = worker;
      this.runCoverage = false;

      worker.on('worker start', function(data) {
        if (data && data.type == self.listenToWorker) {
          self._startDomainTests(self.currentEnv);
        }
      });

      worker.on('run tests complete', this._next.bind(this));

      worker.runTests = this.runTests.bind(this);

      this.window.addEventListener('message', onMessage);
    },

    onMessage: function(worker, event) {
      var eventType, data = event.data;

      if (data) {
        if (typeof(data) === 'string') {
          data = JSON.parse(event.data);
        }
        //figure out what event this is
        eventType = data[0];
        worker.respond(data);
        if (this.forwardEvents.indexOf(eventType) !== -1) {
          if (worker.send) {
            worker.send.apply(worker, data);
          }
        }
      }
    },

    /**
     * Sends message to a given iframe.
     *
     * @param {HTMLElement} iframe raw iframe element.
     * @param {String} event name.
     * @param {Object} data data to send.
     */
    send: function(iframe, event, data) {
      var send = JSON.stringify([event, data]);
      iframe.contentWindow.postMessage(send, this.allowedDomains);
    },

    /**
     * Creates an iframe for a domain appends it to body
     * and returns element.
     *
     * @param {String} src url source to load iframe from.
     * @return {HTMLElement} iframe element.
     */
    createIframe: function(src) {
      var iframe = document.createElement('iframe');
      iframe.src = src + '?time' + String(Date.now());

      if (this.iframeAttrs) {
        var key;
        for (key in this.iframeAttrs) {
          if (this.iframeAttrs.hasOwnProperty(key)) {
            iframe.setAttribute(
              key,
              this.iframeAttrs[key]
            );
          }
        }
      }

      document.body.appendChild(iframe);

      return iframe;
    },

    /**
     * Removes iframe from the dom.
     *
     * @param {HTMLElement} iframe raw iframe element.
     */
    removeIframe: function(iframe) {
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    },

    /**
     * Creates new iframe and register's it under
     * .sandboxes
     *
     *
     * Removes current iframe and its
     * associated tests if a current domain
     * is set.
     */
    _loadNextDomain: function() {
      var iframe;
      //if we have a current domain
      //remove it it should be finished now.
      if (this.currentEnv) {
        this.removeIframe(
          this.sandboxes[this.currentEnv]
        );
        delete this.testGroups[this.currentEnv];
      }

      var nextEnv = Object.keys(this.testGroups).shift();
      if (nextEnv) {
        var nextGroup = this.testGroups[nextEnv];
        this.currentEnv = nextGroup.env;
        iframe = this.createIframe(nextGroup.domain);
        this.sandboxes[this.currentEnv] = iframe;
      } else {
        this.currentEnv = null;
      }

      return (this.currentEnv !== null);
    },

    /**
     * Sends run tests event to domain.
     * This send the "run tests" event to the iframe sandbox
     *
     * @param {String} env the enviroment to test against.
     */
    _startDomainTests: function(env) {
      var iframe, group;

      if (env in this.sandboxes) {
        iframe = this.sandboxes[env];
        group = this.testGroups[env];

        this.send(iframe, 'set env', group.env);

        if (!this.runCoverage) {
          this.send(iframe, 'run tests', { tests: group.tests });
        } else {
          this.send(iframe, 'run tests with coverage', { tests: group.tests });
        }
      }
    },

    /**
     * Maps each test in the list
     * into a test group based on the results
     * of groupTestsByDomain.
     *
     * @param {Array} tests list of tests.
     */
    _createTestGroups: function(tests) {
      var i = 0, len = tests.length,
          group;

      this.testGroups = {};

      for (i; i < len; i++) {
        group = this.groupTestsByDomain(tests[i]);
        if (group.env && group.test) {
          if (!(group.env in this.testGroups)) {
            this.testGroups[group.env] = {
              env: group.env,
              domain: group.domain,
              tests: []
            };
          }
          this.testGroups[group.env].tests.push(group.test);
        }
      }
    },

    _isBatchScheduled: function(newBatch) {
      return this._batches.some(function(existingBatch) {
        return (newBatch.runCoverage === existingBatch.runCoverage) &&
          existingBatch.tests.every(function(test, i) {
            return test === newBatch.tests[i];
          });
      });
    },

    /**
     * Runs a group of tests.
     *
     * @param {Array} tests list of tests to run.
     */
    runTests: function(tests, runCoverage) {
      var batch = {
        tests: tests,
        runCoverage: runCoverage
      };

      if (this._isBatchScheduled(batch)) {
        return;
      }

      this._batches.push(batch);

      if (!this._running) {
        this._next();
      }
    },

    _loadNextBatch: function() {
      var batch = this._batches.shift();
      if (!batch) {
        return false;
      }

      var envs;
      this.runCoverage = batch.runCoverage;
      this._createTestGroups(batch.tests);
      envs = Object.keys(this.testGroups);

      // when the env is ready, we'll get a 'worker start' event to actually
      // starts the tests
      this.worker.emit('set test envs', envs);
      this.worker.send('set test envs', envs);

      this._next();

      return true;
    },

    // Runs the next domain, or the next batch if there is no any domain.
    // This also resets the running flag if there is nothing left to run.
    _next: function() {
      this._running = true;

      if (!this._loadNextDomain() && !this._loadNextBatch()) {
        this._running = false;
      }
    }
  };

  window.TestAgent.BrowserWorker.MultiDomainDriver = Driver;

}(this));
