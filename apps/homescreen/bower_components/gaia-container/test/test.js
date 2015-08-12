/* global sinon, assert, suite, setup, teardown, test */
'use strict';

suite('GaiaContainer', () => {
  var sinonSandbox, dom, el;

  setup(() => {
    sinonSandbox = sinon.sandbox.create();
    // DOM container to put test cases
    dom = document.createElement('div');
    dom.innerHTML = '<gaia-container></gaia-container>';
    el = dom.firstElementChild;
    document.body.appendChild(dom);
  });

  teardown(() => {
    sinonSandbox.restore();
    document.body.removeChild(dom);
    dom = null;
  });

  suite('Drag and drop feature', () => {
    test('drag-and-drop attribute should not be set by default', () => {
      assert.equal(el.getAttribute('drag-and-drop'), null);
      assert.equal(el.hasAttribute('drag-and-drop'), false);
      assert.equal(el.dragAndDrop, false);
    });

    test('.dragAndDrop property value should change with the attribute', () => {
      dom.innerHTML = '<gaia-container drag-and-drop></gaia-container>';
      el = dom.firstElementChild;
      assert.equal(el.getAttribute('drag-and-drop'), '');
      assert.equal(el.hasAttribute('drag-and-drop'), true);
      assert.equal(el.dragAndDrop, true);

      el.removeAttribute('drag-and-drop');
      assert.equal(el.getAttribute('drag-and-drop'), null);
      assert.equal(el.hasAttribute('drag-and-drop'), false);
      assert.equal(el.dragAndDrop, false);
    });

    test('.dragAndDropTimeout should only accept positive value', () => {
      var otherValue = 9999;
      assert.equal(typeof el.dragAndDropTimeout, 'number');

      el.dragAndDropTimeout = otherValue;
      assert.equal(el.dragAndDropTimeout, otherValue);

      el.dragAndDropTimeout = 0;
      el.dragAndDropTimeout = -5555;
      assert.equal(el.dragAndDropTimeout, otherValue);
    });

    suite('Events', () => {
      var icon;
      setup(() => {
        icon = document.createElement('div');
        el.appendChild(icon);
        el.dragAndDropTimeout = 1;
      });

      test('drag-start', done => {
        el.handleEvent({
          type: 'touchstart',
          target: icon,
          touches: [{
            pageX: 0,
            pageY: 0,
            clientX: 0,
            clientY: 0
          }]
        });

        el.addEventListener('drag-start', () => {
          done();
        });
      });

      test('drag-start resets last-drag', done => {
        el._dnd.last.pageX = el._dnd.last.pageY =
          el._dnd.last.clientX = el._dnd.last.clientY =
          el._dnd.last.timeStamp = 100;

        el.handleEvent({
          type: 'touchstart',
          target: icon,
          timeStamp: 0,
          touches: [{
            pageX: 0,
            pageY: 0,
            clientX: 0,
            clientY: 0
          }]
        });

        el.addEventListener('drag-start', () => {
          assert.equal(el._dnd.last.pageX, 0);
          assert.equal(el._dnd.last.pageY, 0);
          assert.equal(el._dnd.last.clientX, 0);
          assert.equal(el._dnd.last.clientY, 0);
          assert.equal(el._dnd.last.timeStamp, 0);
          done();
        });
      });
    });
  });

  suite('DOM manipulation', () => {
    var nodeA, nodeB;

    setup(() => {
      nodeA = document.createElement('div');
      nodeB = document.createElement('div');

      el.appendChild(nodeA);
    });

    test('should add and remove child nodes', done => {
      assert.equal(el.children.length, 1);

      el.appendChild(nodeB);

      assert.equal(el.children.length, 2);
      assert.equal(el.firstChild, nodeA);
      assert.equal(el.lastChild, nodeB);

      el.removeChild(nodeB, () => {
        assert.equal(el.children.length, 1);
        assert.equal(el.firstChild, nodeA);
        assert.equal(el.lastChild, nodeA);
        done();
      });
    });

    test('.replaceChild()', done => {
      el.appendChild(nodeB);

      el.replaceChild(nodeB, nodeA, () => {
        assert.equal(el.children.length, 2);
        assert.equal(el.firstChild, nodeA);
        assert.equal(el.lastChild, nodeB);
        done();
      });
    });

    test('.insertBefore()', done => {
      el.insertBefore(nodeB, nodeA, () => {
        assert.equal(el.children.length, 2);
        assert.equal(el.firstChild, nodeB);
        assert.equal(el.lastChild, nodeA);
        done();
      });
    });

    test('.reorderChild()', done => {
      el.appendChild(nodeB);

      el.reorderChild(nodeB, nodeA, () => {
        assert.equal(el.children.length, 2);
        assert.equal(el.firstChild, nodeB);
        assert.equal(el.lastChild, nodeA);

        el.reorderChild(nodeB, null, () => {
          assert.equal(el.children.length, 2);
          assert.equal(el.firstChild, nodeA);
          assert.equal(el.lastChild, nodeB);
          done();
        });
      });
    });
  });

  suite('Utility functions', () => {
    test('.getBoundingClientRect()', done => {
      var nodeA = document.createElement('div');
      nodeA.style.width = '200px';
      nodeA.style.height = '100px';

      el.style.paddingLeft = '100px';
      el.style.paddingTop = '50px';

      el.appendChild(nodeA, () => {
        var rect = el.getChildOffsetRect(nodeA);
        assert.equal(rect.width, 200);
        assert.equal(rect.height, 100);
        assert.equal(rect.left, 100);
        assert.equal(rect.top, 50);
        assert.equal(rect.right, 300);
        assert.equal(rect.bottom, 150);
        done();
      });
    });
  });
});
