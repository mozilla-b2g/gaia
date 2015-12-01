'use strict';

(function(exports) {
  // The ratio of the largest dimension the group should take.
  const SIZE_RATIO = 0.7;

  // Maximum number of icons that can be contained in a group.
  const MAX_CHILDREN = 6;

  // Possible states of a group.
  const COLLAPSED = 0;
  const EXPANDING = 1;
  const EXPANDED = 2;
  //const COLLAPSING = 3;

  var proto = Object.create(HTMLElement.prototype);

  proto.createdCallback = function() {
    this.container = document.createElement('gaia-container');
    this.container.id = 'group-container';
    this._template = template.content.cloneNode(true);
    this._template.appendChild(this.container);

    var shadow = this.createShadowRoot();
    shadow.appendChild(this._template);

    this.background = shadow.getElementById('group-background');
    this.state = 0;
  };

  proto.transferFromContainer = function(child, container) {
    container.removeChild(child, () => {
      this.container.appendChild(child);
      var icon = child.firstElementChild;
      icon.showName = false;
    });
  };

  proto.transferToContainer = function(child, container) {
    var icon = child.firstElementChild;
    this.container.removeChild(child, () => {
      container.insertBefore(child, this.nextSibling);
      icon.showName = true;
    });
  };

  proto.expand = function(parent) {
    // Make sure we transition from whatever state we're in correctly.
    switch (this.state) {
      case COLLAPSED:
        break;

      default:
        return;
    }

    /* The expanding animation works like so:
     * 1 Hide overflow on parent container (to disable scrolling) by setting
     *   style class on it.
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
    this.state = EXPANDING;

    // Part 1.
    parent.classList.add('expanding');

    // Part 2.
    var rect = this.getBoundingClientRect();
    var originalWidth = this.clientWidth;
    var originalHeight = this.clientHeight;

    var parentOffsetTop = parent.offsetTop;
    var targetLeft = Math.round(-rect.left);
    var targetTop = Math.round(parentOffsetTop - rect.top);
    var targetWidth = window.innerWidth;
    var targetHeight = window.innerHeight - parentOffsetTop;

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
      this.background.style.left = -targetLeft + 'px';
    this.container.style.top =
      this.background.style.top = -targetTop + 'px';
    this.container.style.width =
      this.background.style.width = originalWidth + 'px';
    this.container.style.height =
      this.background.style.height = originalHeight + 'px';

    // Part 5.
    var bgOffsetLeft = Math.round((targetWidth / 2) - (originalWidth / 2));
    var bgOffsetTop = Math.round((targetHeight / 2) - (originalHeight / 2));
    var bgLeft = Math.round(bgOffsetLeft + targetLeft);
    var bgTop = Math.round(bgOffsetTop + targetTop);
    var bgTargetSize =
      Math.sqrt(2 * Math.pow(Math.max(targetWidth, targetHeight), 2));
    var bgScale = bgTargetSize / Math.max(originalWidth, originalHeight);
    this.background.style.transform =
      'translate(' + bgLeft + 'px, ' + bgTop + 'px) scale(' + bgScale + ')';

    var afterExpanding = () => {
      // Part 7.
      this.container.removeEventListener('transitionend', afterExpanding);

      parent.classList.add('expanded');
      this.classList.add('expanded');
      this.container.classList.add('expanded');

      this.container.style.left = this.container.style.top =
      this.container.style.width = this.container.style.height = '';

      // Restore icon titles
      this.container.children.forEach(child => {
        child.firstElementChild.showName = true;
      });

      // Part 8.
      this.container.synchronise();

      // Part 9.
      parent.classList.remove('expanding');
      this.classList.remove('expanding');
      this.container.classList.remove('expanding');

      this.state = EXPANDED;
    };
    this.container.addEventListener('transitionend', afterExpanding);

    // Part 6.
    this.classList.add('expanding');
    this.container.classList.add('expanding');
  };

  proto.collapse = function(parent) {
    console.log('Group collapsed');
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
