(function(window) {
  'use strict';

  var FORMAT_REGEX = /%([0-9])?s/g,
      Worker = window.TestAgent.BrowserWorker;

  function format() {
    var i = 0,
        str,
        args = Array.prototype.slice.call(arguments),
        result;

    str = args.shift();

    result = str.replace(FORMAT_REGEX, function(match, pos) {
      var index = parseInt(pos || i++, 10);
      return args[index];
    });

    return result;
  }

  function fragment() {
    var string = format.apply(this, arguments),
        element = document.createElement('div');

    element.innerHTML = string;
    return element.firstChild;
  }

  var TestUi = Worker.TestUi = function TestUi(options) {
    var selector;

    if (typeof(options) === 'undefined') {
      options = {};
    }

    selector = options.selector || '#test-agent-ui';
    this.element = options.element || document.querySelector(selector);
    this.errorElement = document.createElement('div');
    this.errorElement.className = 'error ' + this.HIDDEN;
    this.element.appendChild(this.errorElement);
    this.queue = {};
  };


  TestUi.prototype = {
    HIDDEN: 'hidden',
    WORKING: 'working',
    EXECUTE: 'execute',

    templates: {
      testList: '<ul class="test-list"></ul>',
      testItem: '<li data-url="%s">%s</li>',
      testRun: '<button class="run-tests">execute</button>',
      error: [
        '<h1>Critical Error</h1>',
        '<p><span class="error">%0s</span> in file ',
        '<span class="file">',
        '<a href="%1s">%1s</a>',
         '</span> line #',
        '<span class="line">%2s</span>'
      ].join('')
    },

    get execButton() {
      if(!this._execButton){
        this._execButton = this.element.querySelector('button');
      }
      return this._execButton;
    },

    enhance: function enhance(worker) {
      this.worker = worker;
      this.worker.on('config', this.onConfig.bind(this));
      this.worker.on('sandbox', this.onSandbox.bind(this));
      this.worker.on('sandbox error', this.onSandboxError.bind(this));
      this.worker.on('test runner', this.onTestRunner.bind(this));
      this.worker.on('test runner end', this.onTestRunnerEnd.bind(this));
    },

    onTestRunner: function onTestRunner() {
      this.isRunning = true;
      this.execButton.textContent = this.WORKING;
      this.execButton.className += ' ' + this.WORKING
    },

    onTestRunnerEnd: function onTestRunnerEnd() {
      var className = this.execButton.className;

      this.isRunning = false;
      this.execButton.textContent = this.EXECUTE;
      this.execButton.className = className.replace(' ' + this.WORKING, '');
    },

    onSandbox: function onSandbox() {
      var error = this.errorElement;
      if (error) {
        if (error.className.indexOf(this.HIDDEN) === -1) {
          error.className += ' ' + this.HIDDEN;
        }
      }
    },

    onSandboxError: function onSandboxError(data) {
      var element = this.element,
          error = this.errorElement,
          message = data.message,
          file = data.filename,
          line = data.lineno;

      error.className = error.className.replace(' hidden', '');

      error.innerHTML = format(
        this.templates.error,
        message,
        file,
        line
      );
    },

    onConfig: function onConfig(data) {
      //purge elements
      var elements = this.element.getElementsByTagName('test-list'),
          element,
          templates = this.templates,
          i = 0,
          parent;

      for (; i < elements.length; i++) {
        element = elements[i];
        element.parentNode.removeChild(element);
      }

      parent = fragment(templates.testList);

      data.tests.forEach(function(test) {
        parent.appendChild(fragment(
          templates.testItem,
          test,
          test
        ));
      });

      this.element.appendChild(
        parent
      );

      this.element.appendChild(fragment(templates.testRun));

      this.initDomEvents();
    },

    initDomEvents: function initDomEvents() {
      var ul = this.element.querySelector('ul'),
          button = this.element.querySelector('button'),
          self = this,
          activeClass = ' active';

      ul.addEventListener('click', function(e) {
        var target = e.target,
            url = target.getAttribute('data-url');

        if (url) {
          if (self.queue[url]) {
            target.className = target.className.replace(activeClass, '');
            delete self.queue[url];
          } else {
            target.className += activeClass;
            self.queue[url] = true;
          }
        }
      });

      button.addEventListener('click', function onTestClick() {

        if (self.isRunning) {
          return;
        }

        var tests = [], key;

        for (key in self.queue) {
          if (self.queue.hasOwnProperty(key)) {
            tests.push(key);
          }
        }

        self.worker.emit('run tests', {tests: tests});
      });
    }

  };

}(this));
