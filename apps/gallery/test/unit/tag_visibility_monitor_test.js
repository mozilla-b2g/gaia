/*====================================
  MonitorTagVisibility Tests

  - implements and runs a DSL, monitoring changes that took place between
    instructions

  - DSL
      - instructions are either a string, or an array of strings
          - instructions are posted to the event loop and run consecutively
          - if instruction is an array, subinstructions are run consecutively,
            not posted to the event loop consecutively
      - instructions access elements with identifiers composed of numbers and
        commas
      - %d will be used to represent a number
      - %i and %j will be used to represent an identifier
      - instructions:
        scroll %d
          sets container's scrolltop to %d
        rm %i
          removes element %i
        addafter %i %j
          add %i after %j (so %j's next sibling is %i)
        addbefore %i %j
          add %i before %j (so %j's prev sibling is %i)
        add %i
          append %i to container

====================================*/

'use strict';

require('/shared/js/tag_visibility_monitor.js');

suite('tag_visibility_monitor', function() {

  function run() {

    //===================
    //  simpleContainerScroll test
    //===================

    //having a border makes it easier to test visually
    var style = document.createElement('style');
    style.innerHTML =
      'div > div {' +
      '  border: 1px solid black;' +
      '  -moz-box-sizing: border-box;' +
      '  padding-left: 10px;' +
      '  background: white;' +
      '}';
    document.head.appendChild(style);

    //===================
    // testing basic scrolling, rm, add
    //===================

    test('basics', function(done) {

      var childHeight = 10;
      var containerHeight = 100;
      var numChildren = 20;

      var instance = setup(numChildren, childHeight, containerHeight);

      instance.testInStages(
        [
            'scroll ' + childHeight * 3,
            'scroll ' + 0,
            'scroll ' + 10000,
            'scroll ' + 0,
            'rm 0',
            'rm 1',
            'rm 2',
            'rm 3',
            'rm 4',
            'rm 5',
            'addbefore 5 6',
            'addafter 20 19',
            'rm 14'
        ],
        function doneTesting(logger) {
          var o = {};
          for (var i = 0; i < 10; i++) { o[i] = 'on'; }
          assert.deepEqual(logger.data[0], o);

          assert.deepEqual(logger.data[1], {
            0: 'off',
            1: 'off',
            2: 'off',
            10: 'on',
            11: 'on',
            12: 'on'
          });

          assert.deepEqual(logger.data[2], {
            0: 'on',
            1: 'on',
            2: 'on',
            10: 'off',
            11: 'off',
            12: 'off'
          });

          var o = {};
          for (var i = 0; i < 10; i++) { o[i] = 'off'; }
          for (var i = 10; i < 20; i++) { o[i] = 'on'; }

          assert.deepEqual(logger.data[3], o);

          var o = {};
          for (var i = 0; i < 10; i++) { o[i] = 'on'; }
          for (var i = 10; i < 20; i++) { o[i] = 'off'; }
          assert.deepEqual(logger.data[4], o);

          assert.deepEqual(logger.data[5], { 10: 'on' });
          assert.deepEqual(logger.data[6], { 11: 'on' });
          assert.deepEqual(logger.data[7], { 12: 'on' });
          assert.deepEqual(logger.data[8], { 13: 'on' });
          assert.deepEqual(logger.data[9], { 14: 'on' });
          assert.deepEqual(logger.data[10], { 15: 'on' });

          assert.deepEqual(logger.data[11], { 5: 'on', 15: 'off' });

          assert.deepEqual(logger.data[12], undefined);

          assert.deepEqual(logger.data[13], { 15: 'on' });

          for (var i = 14; i < logger.data.length; i++) {
            console.log(logger.data[i]);
          }
          instance.container.parentNode.removeChild(instance.container);
          done();
      });
    });

    test('multiop', function(done) {

      var childHeight = 10;
      var containerHeight = 100;
      var numChildren = 20;

      var instance = setup(numChildren, childHeight, containerHeight);

      instance.testInStages(
        [
          'scroll 50',
          [
            'rm 0',
            'rm 1',
            'rm 2',
            'rm 3',
            'rm 4',
            'rm 5',
            'rm 6',
            'rm 7',
            'rm 8',
            'rm 9',
            'rm 10',
            'rm 11',
            'rm 12',
            'rm 13',
            'rm 14'
          ]
        ],
        function doneTesting(logger) {

          var o = {};
          for (var i = 0; i < 10; i++) { o[i] = 'on'; }
          assert.deepEqual(logger.data[0], o);

          var o = {};
          for (var i = 0; i < 5; i++) { o[i] = 'off'; }
          for (var i = 10; i < 15; i++) { o[i] = 'on'; }
          assert.deepEqual(logger.data[1], o);

          var o = {};
          for (var i = 15; i < 20; i++) { o[i] = 'on'; }
          assert.deepEqual(logger.data[2], o);

          for (var i = 3; i < logger.data.length; i++) {
            console.log(logger.data[i]);
          }
          instance.container.parentNode.removeChild(instance.container);
          done();
      });
    });

    test('addRemoveContainer', function(done) {

      var childHeight = 10;
      var containerHeight = 100;

      var instance = setup(0, childHeight, containerHeight);

      var testStages = [];
      testStages.push('add 0', 'rm 0');
      for (var i = 0; i < 50; i++) {
        testStages.push('add ' + i);
      }
      for (var i = 0; i < 50; i++) {
        testStages.push('rm ' + i);
      }

      instance.testInStages(
        testStages,
        function doneTesting(logger) {

          var c = 4;
          for (var i = 1; i < 10; i++, c++) {
            var o = {};
            o[i] = 'on';
            assert.deepEqual(logger.data[c], o);
          }
          for (var i = 0; i < 50 - 10; i++, c++) {
            assert.deepEqual(logger.data[c], undefined);
          }
          for (var i = 10; i < 50; i++, c++) {
            var o = {};
            o[i] = 'on';
            assert.deepEqual(logger.data[c], o);
          }

          for (c; c < logger.data.length; c++) {
            console.log(logger.data[c]);
          }

          instance.container.parentNode.removeChild(instance.container);
          done();
      });
    });
  }

  //===================
  //  helpers
  //===================

  var nextId = 0;

  function setup(numChildren, childHeight, containerHeight) {

    var container = createTestContainer(numChildren,
                                        childHeight,
                                        containerHeight);
    container.className = 'simpleContainer' + nextId;

    nextId += 1;

    var logger = new VisibilityLogger();
    var scrollDelta = 1;
    var scrollMargin = 0;
    var monitor = monitorTagVisibility(
      container,
      'div',
      scrollMargin,
      scrollDelta,
      function onscreen(child) {
        child.style.background = 'blue';
        logger.log(child.index, 'on');
      },
      function offscreen(child) {
        child.style.background = 'red';
        logger.log(child.index, 'off');
      });

    function testInStages(tests, done) {
      var i = 0;

      var TimeForScrollAndVisibilityMonitorEvents = 0;

      function runTest(test) {
          var scrollMatch = test.match(/scroll (\d+)/);
          var rmMatch = test.match(/rm ([0-9,]+)/);
          var addAfterMatch = test.match(/addafter ([0-9,]+) ([0-9,]+)/);
          var addBeforeMatch = test.match(/addbefore ([0-9,]+) ([0-9,]+)/);
          var addMatch = test.match(/add ([0-9,]+)/);
          if (scrollMatch) {
            container.scrollTop = scrollMatch[1];
          }
          else if (rmMatch) {
            var index = test.substr(3);
            var div = getChildByIndexProp(container, index);
            div.parentNode.removeChild(div);
          }
          else if (addAfterMatch) {
            var prev = getChildByIndexProp(container, '' + addAfterMatch[2]);
            var child = document.createElement('div');
            child.style.height = childHeight + 'px';
            child.index = '' + addAfterMatch[1];
            prev.parentNode.insertBefore(child, prev.nextSibling);
          }
          else if (addBeforeMatch) {
            var prev = getChildByIndexProp(container, '' + addBeforeMatch[2]);
            var child = document.createElement('div');
            child.style.height = childHeight + 'px';
            child.index = '' + addBeforeMatch[1];
            prev.parentNode.insertBefore(child, prev);
          }
          else if (addMatch) {
            var child = document.createElement('div');
            child.style.height = childHeight + 'px';
            child.index = '' + addMatch[1];
            container.appendChild(child);
          }
      }

      function runNext() {
        if (i < tests.length) {
          var test = tests[i];
          if (test.push) {
            for (var j = 0; j < test.length; j++)
              runTest(test[j]);
          }
          else {
            runTest(test);
          }
          logger.nextStep();
          i++;
          setTimeout(runNext, TimeForScrollAndVisibilityMonitorEvents);
        }
        else {
          done(logger);
          monitor.stop();
        }
      }

      runNext();
    }
    return { 'testInStages': testInStages, 'container': container };
  }

  function createTestContainer(numChildren, childHeight, containerHeight) {
    var container = document.createElement('div');
    container.style.height = containerHeight + 'px';
    container.style.position = 'relative';
    container.style.overflowY = 'scroll';
    document.body.appendChild(container);

    for (var i = 0; i < numChildren; i++) {
      var child = document.createElement('div');
      child.style.height = childHeight + 'px';
      child.index = '' + i;
      container.appendChild(child);
    }

    return container;
  }

  function getChildByIndexProp(parent, index) {
    var child = parent.firstChild;
    while (child !== null) {
      if (child.index === index) {
        return child;
      }
      var childChild = getChildByIndexProp(child, index);
      if (childChild !== null) {
        return childChild;
      }
      child = child.nextElementSibling;
    }
    return null;
  }

  function putOnEventQueue(fn) {
    setTimeout(fn, 0);
  }

  function VisibilityLogger() {
    this.currentStep = 0;
    this.data = [];
  }

  VisibilityLogger.prototype = {
    log: function(index, type) {
      if (this.data[this.currentStep] === undefined)
        this.data[this.currentStep] = {};
      this.data[this.currentStep][index] = type;
    },
    nextStep: function() {
      this.currentStep += 1;
    }
  };

  run();

});


