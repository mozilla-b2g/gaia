/* global Group */
'use strict';

require('/shared/test/unit/load_body_html_helper.js');
require('/js/homescreen-group.js');

suite('Group', () => {
  var group;

  function getFakeIcon() {
    var container = document.createElement('div');
    var icon = document.createElement('div');
    container.appendChild(icon);
    icon.showName = true;
    return container;
  }

  function getMockContainer() {
    var container = document.createElement('div');
    container.insertBefore = (child, callback) => { callback(); };
    container.removeChild = (child, callback) => { callback(); };
    container.setUseTransform = () => {};
    Object.defineProperty(container, 'children', {
      value: [],
      configurable: true
    });
    return container;
  }

  setup(() => {
    loadBodyHTML('_index.html');
    group = new Group();
    group.container.children.forEach = () => {};
    group.container.synchronise = () => {};
  });

  suite('Group#toggleA11y()', () => {
    test('Adds tabindex and a11y role', () => {
      group.removeAttribute('tabindex');
      group.removeAttribute('role');
      group.toggleA11y(true);
      assert.equal(group.tabIndex, 0);
      assert.equal(group.getAttribute('role'), 'link');
    });

    test('Removes tabindex and a11y role', () => {
      group.tabIndex = 0;
      group.setAttribute('role', 'link');
      group.toggleA11y(false);
      assert.equal(group.tabIndex, -1);
      assert.equal(group.getAttribute('role'), null);
    });
  });

  suite('Group#transferFromContainer()', () => {
    var appendChildStub, mockIcon, mockContainer;

    setup(() => {
      appendChildStub = sinon.stub(group.container, 'appendChild');
      mockIcon = getFakeIcon();
      mockContainer = getMockContainer();
    });

    teardown(() => {
      appendChildStub.restore();
    });

    test('Appends child to internal container', () => {
      group.transferFromContainer(mockIcon, mockContainer, 'abc');
      assert.isTrue(appendChildStub.calledWith(mockIcon, 'abc'));
    });

    test('Prepends child to internal container', () => {
      var fakeContainer = {
        firstChild: 'abc',
        insertBefore: () => {}
      };
      var insertBeforeStub = sinon.stub(fakeContainer, 'insertBefore');
      var realContainer = group.container;

      group.container = fakeContainer;
      group.transferFromContainer(mockIcon, mockContainer, 'def', true);
      group.container = realContainer;

      assert.isTrue(insertBeforeStub.calledWith(mockIcon, 'abc', 'def'));
    });

    test('Hides icon name', () => {
      group.transferFromContainer(mockIcon, mockContainer);
      assert.isFalse(mockIcon.firstElementChild.showName);
    });
  });

  suite('Group#transferToContainer()', () => {
    var realContainer, mockIcon, finishRemovingChildrenStub, removeChildSpy;

    setup(() => {
      realContainer = group.container;
      group.container = getMockContainer();
      mockIcon = getFakeIcon();
      finishRemovingChildrenStub = sinon.stub(group, 'finishRemovingChildren');
      removeChildSpy = sinon.spy(group.container, 'removeChild');
    });

    teardown(() => {
      group.container = realContainer;
      group.removedChildren = [];
      finishRemovingChildrenStub.restore();
    });

    test('Removes child', () => {
      group.transferToContainer(mockIcon, 'abc');
      assert.isTrue(removeChildSpy.calledOnce);
    });

    test('Shows icon name', () => {
      mockIcon.firstElementChild.showName = false;
      group.transferToContainer(mockIcon, 'abc');
      assert.isTrue(mockIcon.firstElementChild.showName);
    });

    test('Defers finalising of child removal', () => {
      group.transferToContainer(mockIcon, 'abc', 'def');
      assert.isTrue(finishRemovingChildrenStub.calledWith('abc', 'def'));
      assert.notEqual(group.removedChildren.indexOf(mockIcon), -1);
    });
  });

  suite('Group#finishRemovingChildren()', () => {
    var mockContainer, insertBeforeStub, removeChildStub;

    function addFakeChildren(n) {
      for (var i = 0; i < n; i++) {
        group.container.appendChild(getFakeIcon());
      }
    }

    setup(() => {
      Object.defineProperty(group, 'parentNode', {
        configurable: true,
        value: 'parent'
      });

      mockContainer = getMockContainer();
      insertBeforeStub = sinon.stub(mockContainer, 'insertBefore');
      removeChildStub = sinon.stub(mockContainer, 'removeChild');
    });

    teardown(() => {
      delete group.parentNode;
      while (group.container.children.length) {
        group.container.removeChild(group.container.firstChild);
      }
    });

    test('Reparents children before self when collapsed', () => {
      addFakeChildren(2);
      group.removedChildren = [
        'abc', 'def'
      ];
      group.finishRemovingChildren(mockContainer, 'callback');

      assert.isTrue(insertBeforeStub.calledTwice);
      assert.equal(insertBeforeStub.getCall(0).args[0], 'abc');
      assert.equal(insertBeforeStub.getCall(0).args[1], 'parent');
      assert.equal(insertBeforeStub.getCall(0).args[2], null);
      assert.equal(insertBeforeStub.getCall(1).args[0], 'def');
      assert.equal(insertBeforeStub.getCall(1).args[1], 'parent');
      assert.equal(insertBeforeStub.getCall(1).args[2], 'callback');
    });

    test('Removes self when empty', () => {
      group.finishRemovingChildren(mockContainer);
      assert.isTrue(removeChildStub.calledWith('parent'));
    });

    test('Removes the last icon when only one icon left', () => {
      var transferToContainerStub = sinon.stub(group, 'transferToContainer');
      addFakeChildren(1);
      group.finishRemovingChildren(mockContainer, 'callback');
      assert.isTrue(transferToContainerStub.calledWith(
        group.container.firstChild, mockContainer, 'callback'));
    });
  });

  suite('Group expanding and collapsing', () => {
    setup(() => {
      var parent = getMockContainer();
      document.createElement('div').appendChild(parent);
      Object.defineProperty(group, 'parentNode', {
        configurable: true,
        value: parent
      });
    });

    teardown(() => {
      delete group.parentNode;
    });

    suite('Group#expand()', () => {
      test('Group is expanded', () => {
        group.state = 0; // Collapsed
        group.expand(getMockContainer());
        assert.equal(group.state, 1); // Expanding
        group.container.dispatchEvent(new CustomEvent('transitionend'));
        assert.equal(group.state, 2); // Expanded
      });

      test('Nothing happens if group is not collapsed', () => {
        group.state = 2; // Expanded
        group.expand(getMockContainer());
        assert.equal(group.state, 2);
      });
    });

    suite('Group#collapse()', () => {
      test('Group is collapsed', () => {
        group.state = 2; // Expanded
        group.collapse(getMockContainer());
        assert.equal(group.state, 3); // Collapsing
        group.background.dispatchEvent(new CustomEvent('transitionend'));
        assert.equal(group.state, 0); // Collapsed
      });

      test('Nothing happens if group is not expanded', () => {
        group.state = 0; // Collapsed
        group.collapse(getMockContainer());
        assert.equal(group.state, 0); // Collapsed
      });
    });
  });
});
