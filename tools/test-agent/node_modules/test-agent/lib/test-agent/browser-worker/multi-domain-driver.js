(function(window) {

  function Driver(options) {
    var key;
    if (typeof(options) === 'undefined') {
      options = {};
    }

    this.testMap = {};
    this.testEnvs = {};
    this.testGroups = {};
    this.domains = {};

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

      worker.on('worker start', function(data) {
        if (data && data.type == self.listenToWorker) {
          self._startDomainTests(self.currentDomain);
        }
      });

      worker.on('run tests complete', function() {
        self._loadNextDomain();
      });

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
     * .domains
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
      if (this.currentDomain) {
        this.removeIframe(
          this.domains[this.currentDomain]
        );
        delete this.testGroups[this.currentDomain];
      }

      var nextDomain = Object.keys(this.testGroups).shift();
      if (nextDomain) {
        this.currentDomain = nextDomain;
        iframe = this.createIframe(nextDomain);
        this.domains[this.currentDomain] = iframe;
      } else {
        this.currentDomain = null;
      }
    },

    /**
     * Sends run tests event to domain.
     *
     * @param {String} domain url.
     */
    _startDomainTests: function(domain) {
      var iframe, tests, group;

      if (domain in this.domains) {
        iframe = this.domains[domain];
        group = this.testGroups[domain];

        this.send(iframe, 'set env', group.env);
        this.send(iframe, 'run tests', { tests: group.tests });
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
      this.testEnvs = {};
      this.testMap = {};

      for (i; i < len; i++) {
        group = this.groupTestsByDomain(tests[i]);
        if (group.domain && group.test) {
          if (!(group.domain in this.testGroups)) {
            this.testGroups[group.domain] = {
              env: group.env,
              tests: []
            };
          }
          this.testGroups[group.domain].tests.push(group.test);
          this.testEnvs[group.env] = true;
        }
      }
    },

    /**
     * Runs a group of tests.
     *
     * @param {Array} tests list of tests to run.
     */
    runTests: function(tests) {
      var envs;
      this._createTestGroups(tests);
      envs = Object.keys(this.testEnvs);
      this.worker.emit('set test envs', envs);
      this.worker.send('set test envs', envs);
      this._loadNextDomain();
    }

  };

  window.TestAgent.BrowserWorker.MultiDomainDriver = Driver;

}(this));
