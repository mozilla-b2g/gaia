/*====================================
  MonitorMultilevelChildVisibility Tests

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
        addchild %i %j
          add %i to %j (appendChild)
        add %i
          append %i to container
        addroot %i
          append %i to container, not setting its height

====================================*/

'use strict';

require('/shared/js/multilevel_visibility_monitor.js');

suite('multilevel_visibility_monitor', function() {

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
      '  box-sizing: border-box;' +
      '  padding-left: 10px;' +
      '  background: white;' +
      '}';
    document.head.appendChild(style);

    //===================
    // testing basic scrolling, rm, add
    //===================

    test('simpleContainerScroll', function(done) {

      var childHeight = 10;
      var containerHeight = 100;
      var numChildren = 20;

      var instance = setup(numChildren, childHeight, containerHeight, 1);

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

    //===================
    // testing adding / removing
    //===================

    test('addRemoveContainer', function(done) {

      var childHeight = 10;
      var containerHeight = 100;

      var instance = setup(0, childHeight, containerHeight, 1);

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

          assert.deepEqual(logger.data[0], undefined);
          assert.deepEqual(logger.data[1], { 0: 'on' });
          assert.deepEqual(logger.data[2], undefined);
          assert.deepEqual(logger.data[3], { 0: 'on' });

          var c = 4;
          for (var i = 1; i <= 10; i++, c++) {
            var o = [];
            o[i] = 'on';
            assert.deepEqual(logger.data[c], o);
          }
          for (var i = 0; i < 50 - 10 - 1; i++, c++) {
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

    //===================
    // depthContainerTest
    //===================

    test('multilevel', function(done) {
      var childHeight = 5;
      var containerHeight = 200;

      var instance = setup(0, childHeight, containerHeight, 4);

      var container = instance.container;

      addChildren(container, 10, function(child, i) {
        child.index = i + '';
        addChildren(child, 3, function(child, j) {
          child.index = i + ',' + j;
          addChildren(child, 3, function(child, k) {
          child.index = i + ',' + j + ',' + k;
            addChildren(child, 3, function(child, l) {
              child.index = i + ',' + j + ',' + k + ',' + l;
              child.style.height = '5px';
            });
          });
        });
      });

      instance.testInStages(
        [
          'nop',
          'scroll 153',
          'scroll 160',
          'rm 1,2,0',
          'scroll 100000',
          'scroll 0',
          'rm 0,0,0',
          'addbefore 0,0,0 0,0,1',
          'rm 1',
          [
            'rm 0,0,0',
            'addbefore 0,0,0 0,0,1',
            'rm 2'
          ],
          [ // rm from rm'd
            'rm 0,0,0',
            'addbefore 0,0,0 0,0,1',
            'rm 0'
          ],
          [ // add to rm'd
            'addbefore 2 3',
            'rm 3,0',
            'addbefore 3,0 3,1',
            'addchild 3,0,0 3,0',
            'addchild 3,0,1 3,0',
            'addchild 3,0,2 3,0',
            'addchild 3,0,0,0 3,0,0',
            'rm 3,0'
          ],
          [ // leave remaining child with no siblings
            'rm 2',
            'rm 3',
            'rm 4',
            'rm 5',
            'rm 6',
            'rm 8',
            'rm 9'
          ],
          [ // switch old child for new one
            'rm 7',
            'addroot 0'
          ],
          [ // give children to only child
            'addchild 0,0 0',
            'addchild 0,1 0',
            'addchild 0,2 0'
          ],
          [ //adding past maxdepth
            'addchild 0,0,0 0,0',
            'addchild 0,0,0,0 0,0,0',
            'addchild 0,0,0,0,0 0,0,0,0',
            'rm 0,0,0,0,0'
          ]
        ],
        function doneTesting(logger) {

          assert.deepEqual(logger.data[0], undefined);

          var expectedSize = (1) + (1 * 3) + (1 * 3 * 3) + (1 * 3 * 3 * 3) +
                             (1) + (1 * 1) + (1 * 1 * 3) + (1 * 1 * 2 * 3 +
                                                            1 * 1 * 1 * 1);
          assert.equal(size(logger.data[1]), expectedSize);
          for (var index in logger.data[1]) {
            assert.equal(logger.data[1][index], 'on');
          }

          var expectedOnSize = (1) + (1 * 1) + (1 * 1 * 1) + (1 * 1 * 1 * 1) +
                               (1) + (1 * 3) + (1 * 3 * 3) + (1 * 3 * 3 * 3) +
                               (1) + (1 * 1) + (1 * 1 * 2) + (1 * 1 * 2 * 3);
          var expectedOffSize = Math.round(expectedSize *
                                                      153 / containerHeight);
          expectedOnSize -= Math.round(expectedOnSize *
                                    (containerHeight - 153) / containerHeight);
          var numOn = onSize(logger.data[2]);
          var numOff = offSize(logger.data[2]);
          assert.equal(numOn, expectedOnSize - 3);
          assert.equal(numOff, expectedOffSize - 4);
          var offsBeforeOns = checkOffsBeforeOns(logger.data[2]);
          assert.equal(offsBeforeOns, true);

          assert.deepEqual(logger.data[3], { '2,0,2,0': 'on', '2,0,2': 'on'});

          assert.deepEqual(logger.data[4], { '2,0,2,1': 'on', '2,0,2,2': 'on',
                                             '2,1': 'on', '2,1,0': 'on',
                                             '2,1,0,0': 'on' });

          assert.equal(onSize(logger.data[5]), 52);
          assert.equal(offSize(logger.data[5]), 57);

          assert.equal(onSize(logger.data[6]), 52);
          assert.equal(offSize(logger.data[6]), 52);

          assert.deepEqual(logger.data[7], { '1,0,2,1': 'on', '1,0,2,2': 'on',
                                             '1,1': 'on', '1,1,0': 'on',
                                             '1,1,0,0': 'on' });

          assert.deepEqual(logger.data[8], { '0,0,0': 'on', '1,1,0,0': 'off',
                                             '1,1': 'off', '1,1,0': 'off' });

          assert.deepEqual(logger.data[9], { '2': 'on', '2,0,0': 'on',
            '2,0,0,0': 'on', '2,0,0,1': 'on', '2,0,0,2': 'on', '2,0,1': 'on',
            '2,0,1,0': 'on', '2,0,1,1': 'on', '2,0,1,2': 'on', '2,0,2': 'on',
            '2,0,2,0': 'on', '2,0,2,1': 'on', '2,0,2,2': 'on', '2,0': 'on'});

          assert.deepEqual(logger.data[10], { '3': 'on', '0,0,0': 'on',
            '3,0,0': 'on', '3,0,0,0': 'on', '3,0,0,1': 'on', '3,0,0,2': 'on',
            '3,0,1': 'on', '3,0,1,0': 'on', '3,0,1,1': 'on', '3,0,1,2': 'on',
            '3,0,2': 'on', '3,0,2,0': 'on', '3,0,2,1': 'on', '3,0,2,2': 'on',
            '3,0': 'on'});

          assert.deepEqual(logger.data[11], { '4': 'on', '3,1,0,0': 'on',
            '3,1,0,1': 'on', '3,1,0,2': 'on', '3,1,1': 'on', '3,1,1,0': 'on',
            '3,1,1,1': 'on', '3,1,1,2': 'on', '3,1,2': 'on', '3,1,2,0': 'on',
            '3,1,2,1': 'on', '3,1,2,2': 'on', '3,2': 'on', '3,2,0': 'on',
            '3,2,0,0': 'on', '3,2,0,1': 'on', '3,2,0,2': 'on', '3,2,1': 'on',
            '3,2,1,0': 'on', '3,2,1,1': 'on', '3,2,1,2': 'on', '3,2,2': 'on',
            '3,2,2,0': 'on', '3,2,2,1': 'on', '3,2,2,2': 'on', '4,0': 'on',
            '4,0,0': 'on', '4,0,0,0': 'on', '4,0,0,1': 'on', '4,0,0,2': 'on',
            '4,0,1': 'on', '4,0,1,0': 'on', '4,0,1,1': 'on', '4,0,1,2': 'on',
            '4,0,2': 'on', '4,0,2,0': 'on', '3,1': 'on', '3,1,0': 'on'});

          assert.deepEqual(logger.data[12], { '2': 'on', '4,0,2,1': 'on',
            '4,0,2,2': 'on', '4,1': 'on', '4,1,0': 'on', '4,1,0,0': 'on',
            '4,1,0,1': 'on', '4,1,0,2': 'on', '4,1,1': 'on', '4,1,1,0': 'on',
            '4,1,1,1': 'on', '4,1,1,2': 'on'});

          assert.deepEqual(logger.data[13], {'7,0,0,0': 'on', '7,0,0,1': 'on',
            '7,0,0,2': 'on', '7,0,0': 'on', '7,0,1': 'on', '7,0,1,0': 'on',
            '7,0,1,1': 'on', '7,0,1,2': 'on', '7,0,2': 'on', '7,0,2,0': 'on',
            '7,0,2,1': 'on', '7,0,2,2': 'on', '7,0': 'on', '7,1': 'on',
            '7,1,0': 'on', '7,1,0,0': 'on', '7,1,0,1': 'on', '7,1,0,2': 'on',
            '7,1,1': 'on', '7,1,1,0': 'on', '7,1,1,1': 'on', '7,1,1,2': 'on',
            '7,1,2': 'on', '7,1,2,0': 'on', '7,1,2,1': 'on', '7,1,2,2': 'on',
            '7,2': 'on', '7,2,0': 'on', '7,2,0,0': 'on', '7,2,0,1': 'on',
            '7,2,0,2': 'on', '7,2,1': 'on', '7,2,1,0': 'on', '7,2,1,1': 'on',
            '7,2,1,2': 'on', '7,2,2': 'on', '7,2,2,0': 'on', '7,2,2,1': 'on',
            '7,2,2,2': 'on'});
          assert.deepEqual(logger.data[14], { '0': 'on' });

          assert.deepEqual(logger.data[15], { '0,0': 'on', '0,1': 'on',
            '0,2': 'on' });

          assert.deepEqual(logger.data[16], { '0,0,0': 'on', '0,0,0,0': 'on' });

          for (var i = 17; i < logger.data.length; i++) {
            console.log(i, logger.data[i]);
          }

          instance.container.parentNode.removeChild(instance.container);
          done();
        });
    });

    function addChildren(parent, n, childFn) {
      for (var i = 0; i < n; i++) {
        var div = document.createElement('div');
        if (childFn)
          childFn(div, i);
        parent.appendChild(div);
      }
    }

    function offSize(obj) {
      var n = 0;
      for (var prop in obj) {
        if (obj[prop] === 'off')
          n++;
      }
      return n;
    }

    function onSize(obj) {
      var n = 0;
      for (var prop in obj) {
        if (obj[prop] === 'on')
          n++;
      }
      return n;
    }

    function size(obj) {
      var n = 0;
      for (var prop in obj)
        n++;
      return n;
    }

    function checkOffsBeforeOns(data) {
      var numbered = [];
      for (var index in data) {
        var n = index.replace(/,/g, '');
        while (n.indexOf('0') === 0 && n.length > 1)
          n = n.substr(1);
        numbered[n] = data[index];
      }
      while (
        (numbered[0] === 'off' || numbered[0] === undefined) &&
        numbered.length > 0
      ) {
        numbered.shift();
      }
      while (
        (numbered[0] === 'on' || numbered[0] === undefined) &&
        numbered.length > 0
      ) {
        numbered.shift();
      }
      return numbered.length === 0;
    }


  }

  //===================
  //  helpers
  //===================

  var nextId = 0;

  function setup(numChildren, childHeight, containerHeight, monitorDepth) {

    var container = createTestContainer(numChildren,
                                        childHeight,
                                        containerHeight);
    container.className = 'simpleContainer' + nextId;

    nextId += 1;

    var logger = new VisibilityLogger();
    var scrollDelta = 1;
    var monitor = monitorMultilevelChildVisibility(
      container,
      0,
      scrollDelta,
      monitorDepth,
      false,
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
          var addChildMatch = test.match(/addchild ([0-9,]+) ([0-9,]+)/);
          var addMatch = test.match(/add ([0-9,]+)/);
          var addRootMatch = test.match(/addroot ([0-9,]+)/);
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
          else if (addChildMatch) {
            var parent = getChildByIndexProp(container, '' + addChildMatch[2]);
            var child = document.createElement('div');
            child.style.height = childHeight + 'px';
            child.index = '' + addChildMatch[1];
            parent.appendChild(child);
          }
          else if (addMatch) {
            var child = document.createElement('div');
            child.style.height = childHeight + 'px';
            child.index = '' + addMatch[1];
            container.appendChild(child);
          }
          else if (addRootMatch) {
            var child = document.createElement('div');
            child.style.minHeight = childHeight + 'px';
            child.index = '' + addRootMatch[1];
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

