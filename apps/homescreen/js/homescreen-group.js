'use strict';

(function(exports) {
  // The ratio of the largest dimension the group should take.
  const SIZE_RATIO = 0.7;

  // Maximum number of icons that can be contained in a group.
  const MAX_CHILDREN = 6;

  // Possible states of a group.
  const STATE = {
    COLLAPSED: 0,
    EXPANDING: 1,
    EXPANDED: 2,
    COLLAPSING: 3
  };

  var proto = Object.create(HTMLElement.prototype);

  proto.createdCallback = function() {
    this.container = document.createElement('gaia-container');
    this.container.id = 'group-container';
    this._template = template.content.cloneNode(true);
    this._template.appendChild(this.container);

    var shadow = this.createShadowRoot();
    shadow.appendChild(this._template);

    this.background = shadow.getElementById('group-background');
    this.removedChildren = [];
    this.state = 0;

    // Make the group accessible/allow activation
    this.setAttribute('data-l10n-id', 'group');
    this.toggleA11y(true);

    var activate = () => {
      this.dispatchEvent(new CustomEvent('activated'));
    };

    this.addEventListener('keydown', (e) => {
      switch (e.keyCode) {
        case 32: // Space
        case 13: // Enter
          activate();
      }
    });
    this.addEventListener('click', activate);
  };

  proto.toggleA11y = function(enable) {
    if (enable) {
      this.tabIndex = 0;
      this.setAttribute('role', 'link');
    } else {
      this.removeAttribute('tabindex');
      this.removeAttribute('role');
    }
  };

  proto.transferFromContainer = function(child, container, callback, prepend) {
    container.removeChild(child, () => {
      if (prepend && this.container.firstChild) {
        this.container.insertBefore(child, this.container.firstChild, callback);
      } else {
        this.container.appendChild(child, callback);
      }
      var icon = child.firstElementChild;
      icon.showName = false;
    });
  };

  proto.transferToContainer = function(child, container, callback) {
    var icon = child.firstElementChild;
    this.container.removeChild(child, () => {
      icon.showName = true;

      this.removedChildren.push(child);
      this.finishRemovingChildren(container, callback);
    });
  };

  proto.finishRemovingChildren = function(container, callback) {
    var reparentRemovedChildren = (beforeChild, callback) => {
      for (var i = 0, iLen = this.removedChildren.length; i < iLen; i++) {
        var child = this.removedChildren[i];
        container.insertBefore(child, beforeChild,
                               (i === iLen - 1) ? callback : null);
      }
      this.removedChildren = [];
    };

    if (this.container.children.length === 1) {
      this.transferToContainer(this.container.firstChild, container, callback);
    } else if (this.state !== STATE.COLLAPSING &&
               this.container.children.length === 0) {
      // The children will be added back to the parent container after the
      // group is removed, so find the group's sibling to insert the children
      // before.
      var children = container.children;
      var sibling = null;
      for (var i = 0, iLen = children.length; i < iLen - 1; i++) {
        if (children[i] === this.parentNode) {
          sibling = children[i + 1];
          break;
        }
      }

      container.removeChild(this.parentNode,
        reparentRemovedChildren.bind(this, sibling, callback));
    } else if (this.state === STATE.COLLAPSED) {
      reparentRemovedChildren(this.parentNode, callback);
    }
  };

  proto.expand = function(parent) {
    // Make sure we transition from whatever state we're in correctly.
    switch (this.state) {
      case STATE.COLLAPSED:
        break;

      default:
        return;
    }

    /* The expanding animation works like so:
     * 1 Hide overflow on scroll container by setting a style class on the
     *   document body.
     * 2 We record the current screen rect of the group.
     * 3 Set offsets on the group to have it occupy the whole screen.
     * 4 Set an offset and size on the background and container so they still
     *   remain in the same position.
     * 5 Set transform on background so it expands into the full group area.
     * 6 Set style class on the icons container fades out.
     * 7 After the icon container fades out, change its style properties to
     *   fill the expanded group.
     * 8 Synchronise icon container.
     * 9 Set style property on icon container to fade it in.
     */
    this.state = STATE.EXPANDING;

    // Part 1.
    document.body.classList.add('expanding');

    // Part 2.
    var rect = this.getBoundingClientRect();
    var originalWidth = this.clientWidth;
    var originalHeight = this.clientHeight;
    var originalLeft = this.clientLeft;
    var originalTop = this.clientTop;

    var parentOffsetTop = parent.offsetTop;
    var targetLeft = Math.round(-rect.left);
    var targetTop = Math.round(parentOffsetTop - rect.top);
    var targetWidth = window.innerWidth;
    var targetHeight = window.innerHeight - parentOffsetTop;

    // Use absolute positioning instead of a transform so the fixed-positioning
    // used when dragging works correctly.
    parent.setUseTransform(this.parentNode, false);

    // We need opened groups to appear above the app grid. We can only
    // do this by setting a z-index on the gaia-container-child due to
    // the established stacking order.
    this.parentNode.parentNode.style.zIndex = '1';

    // Shrink the target rect depending on SIZE_RATIO
    if (targetHeight >= targetWidth) {
      targetTop += (targetHeight * (1 - SIZE_RATIO)) / 2;
      targetHeight *= SIZE_RATIO;
    } else {
      targetLeft += (targetWidth * (1 - SIZE_RATIO)) / 2;
      targetWidth *= SIZE_RATIO;
    }

    // Part 3.
    this.style.left = targetLeft + 'px';
    this.style.top = targetTop + 'px';
    this.style.width = targetWidth + 'px';
    this.style.height = targetHeight + 'px';

    // Part 4.
    this.container.style.left =
      this.background.style.left = (originalLeft - targetLeft) + 'px';
    this.container.style.top =
      this.background.style.top = (originalTop - targetTop) + 'px';
    this.container.style.width =
      this.background.style.width = originalWidth + 'px';
    this.container.style.height =
      this.background.style.height = originalHeight + 'px';

    // Part 5.
    var bgOffsetLeft = Math.round((targetWidth / 2) - (originalWidth / 2));
    var bgOffsetTop = Math.round((targetHeight / 2) - (originalHeight / 2));
    var bgLeft = Math.round(bgOffsetLeft + targetLeft) - originalLeft;
    var bgTop = Math.round(bgOffsetTop + targetTop) - originalTop;
    var bgTargetSize =
      Math.sqrt(2 * Math.pow(Math.max(targetWidth, targetHeight), 2));
    var bgScale = bgTargetSize / Math.max(originalWidth, originalHeight);
    this.background.style.transform =
      `translate(${bgLeft}px, ${bgTop}px) scale(${bgScale})`;

    var afterExpanding = () => {
      // Part 7.
      this.container.removeEventListener('transitionend', afterExpanding);

      document.body.classList.add('expanded');
      this.classList.add('expanded');
      this.container.classList.add('expanded');

      this.container.style.left = this.container.style.top =
      this.container.style.width = this.container.style.height = '';

      // Part 8.
      this.container.children.forEach(child => {
        child.firstElementChild.showName = true;
      });
      this.container.setAttribute('drag-and-drop', '');
      this.container.synchronise();

      // Part 9.
      document.body.classList.remove('expanding');
      this.classList.remove('expanding');
      this.container.classList.remove('expanding');

      // Focus the first icon
      this.toggleA11y(false);
      setTimeout(() => {
        this.container.focus();
      }, 0);

      this.state = STATE.EXPANDED;
    };
    this.container.addEventListener('transitionend', afterExpanding);

    // Part 6.
    this.classList.add('expanding');
    this.container.classList.add('expanding');
  };

  proto.collapse = function(parent, onPreComplete, onComplete) {
    switch (this.state) {
      case STATE.EXPANDED:
        break;

      default:
        return;
    }

    /* The collapsing animations works like so:
     * 1 Hide icon names and set style property on icon container to make it
     *   fade out.
     * 2 Set style property on group background to have it return to its
     *   original position.
     * 3 Remove offsets on group, container and background.
     * 4 Tidy up and call pre-complete callback.
     * 5 Remove collapsing classes on document body and self
     * 6 Synchronise container and set style property to have it fade in.
     * 7 Call complete callback.
     */
    this.state = STATE.COLLAPSING;
    this.classList.add('collapsing');
    document.body.classList.add('collapsing');
    this.classList.remove('expanded');
    document.body.classList.remove('expanded');

    // Part 1.
    this.container.removeAttribute('drag-and-drop');
    this.container.children.forEach(child => {
      child.firstElementChild.showName = false;
    });
    this.container.classList.add('collapsing');
    this.container.classList.remove('expanded');

    // Part 2.
    this.background.style.transform = '';

    var afterCollapsing = () => {
      this.background.removeEventListener('transitionend', afterCollapsing);

      // Part 3.
      this.background.style.left = this.background.style.top =
        this.background.style.width = this.background.style.height =
        this.background.style.transform = this.style.left = this.style.top =
        this.style.width = this.style.height = '';

      // Part 4.
      this.parentNode.parentNode.style.zIndex = '';
      parent.setUseTransform(this.parentNode, true);
      if (onPreComplete) {
        onPreComplete();
      }

      // Part 5.
      this.classList.remove('collapsing');
      document.body.classList.remove('collapsing');

      // Part 6.
      this.container.classList.remove('collapsing');
      this.container.synchronise();

      this.state = STATE.COLLAPSED;
      this.finishRemovingChildren(parent, onComplete);

      this.toggleA11y(true);
    };
    this.background.addEventListener('transitionend', afterCollapsing);
  };

  Object.defineProperty(proto, 'full', {
    get: function() {
      return this.container.children.length >= MAX_CHILDREN;
    },
    enumerable: true
  });

  var template = document.createElement('template');
  template.innerHTML =
    `<style>@import url('style/group.css');</style>
     <div id="group-background"></div>`;

  exports.Group = document.registerElement('homescreen-group',
                                           { prototype: proto });
}(window));
