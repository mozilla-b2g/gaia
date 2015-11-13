'use strict';

(function(exports) {


  /**
   * This is PinnedAppsNavigation's constructor.
   * @param {Object} list [DOM container that contains pinned elements]
   */
  function PinnedAppsNavigation(list, selector) {
    if (!list) {
      throw new Error('List must be a dom container ' +
        'with elements to be navigated');
    }

    /**
     * This variable contains all elements that are
     * representing applications on the screen
     * @type {Array}
     */
    this.elements = [];

    /**
     * Index of the currently selected element of this.elements array
     * @type {Number}
     */
    this.selectedElemIndex = 0;

    /**
     * This variable is used to know selected element
     * has middle size or large size
     * @type {Boolean}
     */
    this.middleElem = null;

    /**
     * DOM container that has all elements
     * @type {Dom container}
     */
    this.elemList = list;

    /**
     * This is a selector that used for getting all pinned icons on main screen
     * @type {String}
     */
    if (selector && typeof selector === 'string'){
      this.selector = selector;
      this.refresh();
    }else{
      this.selector = '';
    }
  }

  PinnedAppsNavigation.prototype = {

    /**
     * This function resets Main homscreen's state to default one (with clock)
     * @return {[nothing]} [nothing]
     */
    reset: function reset() {
      this.elements.sort(function(elem1, elem2) {
        if (!elem1.dataset.index || !elem2.dataset.index) {
          return 1;
        }
        return elem1.dataset.index - elem2.dataset.index;
      });

      var selected = this.elemList.querySelector('.selected');

      if (selected) {
        selected.classList.remove('selected');
      }

      this.selectedElemIndex = 0;

      this.elements.forEach((elem) => {this.elemList.appendChild(elem);}, this);

      this.elements[this.selectedElemIndex].classList.add('selected');
      this.elements[this.selectedElemIndex].classList.add('middle');
      this.elemList.removeAttribute('style');
      this.middleElem = this.elements[this.selectedElemIndex];

      this.cleanIconsList();
    },


    /**
     * This function refresh elements by selector
     * @return {[nothins]} [nothing]
     */
    refresh: function refresh() {
      if (!this.selector) {
        console.error('Can not work without selector');
        return;
      }

      var allItems = document.querySelectorAll(this.selector);
      this.elements = Array.prototype.slice.call(allItems);
      this.selectedElemIndex = 0;

      if (!this.elements && !this.elements.length) {
        console.error('Can not find any elements by this selector');
        return;
      }

      this.elements[this.selectedElemIndex].classList.add('selected');
      this.elements[this.selectedElemIndex].classList.add('middle');
      this.middleElem = this.elements[this.selectedElemIndex];
    },


    cleanIconsList: function cleanIconsList() {
      var toRemoved = this.elemList.querySelector('.removed');
      var toRemoveOutFocus = this.elemList.querySelector('.out-focus');

      if (toRemoved) {
        this.elemList.removeChild(toRemoved);
      }

      if (toRemoveOutFocus) {
        toRemoveOutFocus.classList.remove('out-focus');
      }
    },

    /**
     * Handle event keydown
     * @param  {[Object]} e [default object]
     * @return {[nothing]}   [nothing]
     */
    handleEvent: function(e) {

      var self = this;

      /**
       * This function loops icons on the page.
       * It replaces elements on the page from last position to first positions.
       * @param  {number} n number of elements that will replaced
       * @return {none}
       */
      function cycleElements(n) {
        var removed = self.elements.splice(-n, n);
        for (var i = 0; i < removed.length; i++) {
          self.elemList.insertBefore(removed[i], self.elements[i]);
          self.elements.splice(i, 0, removed[i]);
        }
      }

      /**
       * Function that executs before navigation logic.
       * @return {none}
       */
      function preVerticalNavigation () {
        if (self.middleElem) {
          self.middleElem.classList.remove('middle');
          self.middleElem = null;
        }

        self.cleanIconsList();
      }

      var topStyle = null;

      app.clock.stop();

      //TODO: rewrite ArrowUp and ArrowDown implementation.
      //Made it more understandable and replace it to separate function
      switch(e.key) {
        case 'ArrowUp':
          e.preventDefault();
          preVerticalNavigation();
          app.clock.hide();

          if (this.elemList.dataset.scrollup) {
            this.elemList.style.top = this.elemList.dataset.scrollup;
          } else {
            this.elemList.style.top = '-6rem';
            this.elemList.dataset.scrollup = this.elemList.style.top;
          }

          var deltaElemsToStartScroll = 3;

          this.elements[this.selectedElemIndex].classList.remove('selected');
          if (this.selectedElemIndex >= 0 && this.selectedElemIndex < 4) {

            var cycledElem = deltaElemsToStartScroll - this.selectedElemIndex;
            cycleElements(cycledElem);
            this.selectedElemIndex += cycledElem;

            this.selectedElemIndex--;
            this.elements[this.selectedElemIndex].classList.add('selected');

          } else {

            this.selectedElemIndex--;
            this.elements[this.selectedElemIndex].classList.add('selected');

            if (this.selectedElemIndex > 3) {
              topStyle = parseFloat(this.elemList.style.top);
              this.elemList.style.top =  topStyle + 6 + 'rem';
              this.elemList.dataset.scrollup = this.elemList.style.top;
            }

          }

          var lastElem = this.elements[this.elements.length - 1];
          var clonedElem = lastElem.cloneNode(true);

          this.elemList.insertBefore(clonedElem, this.elements[0]);

          if (app.pinnedAppsManager.items[+clonedElem.dataset.index]){
            app.pinnedAppsManager.
                items[+clonedElem.dataset.index].
                refreshDomElem(clonedElem);
          }

          this.elements.splice(0, 0, clonedElem);
          this.elements[0].classList.add('out-focus');

          this.selectedElemIndex++;

          lastElem.classList.add('removed');
          this.elements.splice(-1, 1);

          break;

        case 'ArrowDown':
          e.preventDefault();
          preVerticalNavigation();
          app.clock.hide();

          this.elements[this.selectedElemIndex].classList.remove('selected');
          if (this.selectedElemIndex == (this.elements.length - 3)) {
            if (!this.elemList.dataset.scrolldown) {
              topStyle = parseFloat(this.elemList.style.top);
              this.elemList.style.top = topStyle - 6 + 'rem';
              this.elemList.dataset.scrolldown = this.elemList.style.top;
            }

            this.selectedElemIndex--;

            var removed = this.elements.splice(0, 1);

            var cloned = removed[0].cloneNode(true);

            removed[0].classList.add('removed');

            this.elemList.appendChild(cloned);

            if (app.pinnedAppsManager.items[+cloned.dataset.index]){
              app.pinnedAppsManager.
                  items[+cloned.dataset.index].
                  refreshDomElem(cloned);
            }

            this.elements[this.elements.length] = cloned;

            this.selectedElemIndex++;
            this.elements[this.selectedElemIndex].classList.add('selected');

            this.elemList.style.top = this.elemList.dataset.scrolldown;
          } else {
            this.selectedElemIndex++;
            this.elements[this.selectedElemIndex].classList.add('selected');

            topStyle = parseFloat(this.elemList.style.top);
            this.elemList.style.top = topStyle - 6 + 'rem';
            this.elemList.dataset.scrolldown = this.elemList.style.top;
          }

          if (this.selectedElemIndex == 1) {
            this.elemList.style.top = '0rem';
          }

          break;

        case 'Accept':
          e.preventDefault();
          var elemId = this.elements[this.selectedElemIndex].getAttribute('id');
          if ( elemId === 'moreApps') {
            app.showMoreApps();
          } else {

            this.elements[this.selectedElemIndex].click();
          }

          break;
      }

    },

    /**
     * Setter to set selector
     * @param  {string} selector [selector that the navigation can take]
     * @return {[nothing]}          [nothing]
     */
    set points_selector(selector) {
      this.selector = selector;
      this.refresh();
    },

  };

  exports.PinnedAppsNavigation = PinnedAppsNavigation;

}(window));
