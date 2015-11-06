'use strict';

(function(exports) {


  /**
   * This is PinAppNavigation's constructor.
   * @param {Object} list [DOM container that contains pin elements]
   */
  function PinAppNavigation(list) {
    if (!list && typeof list !== 'object') {
      console.error('List of pin apps must be an object');
      return;
    }

    this.elemList = list;
    window.removeEventListener('keydown', this);
    window.addEventListener('keydown', this);
  }


  PinAppNavigation.prototype = {

    selector: '',
    elements: null,
    preventDef: false,
    selectedElemIndex: 0,
    elemList: null,
    prevVerticalKey: null,

    middleElem: false,


    /**
     * This function reset all pinns to default values.
     * @return {[nothing]} [nothing]
     */
    reset: function reset() {

      window.addEventListener('keydown', this);

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

      for (var elemIndex in this.elements) {
        this.elemList.appendChild(this.elements[elemIndex]);
      }

      this.elements[this.selectedElemIndex].classList.add('selected');
      this.elements[this.selectedElemIndex].classList.add('middle');
      this.elemList.removeAttribute('style');
      this.middleElem = true;

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

      if (!this.elements && !this.elements.length) {
        console.error('Can not find any elements by this selector');
        return;
      }

      this.elements[this.selectedElemIndex].classList.add('selected');
      this.elements[this.selectedElemIndex].classList.add('middle');
      this.middleElem = true;
    },


    /**
     * Handle event keydown
     * @param  {[Object]} e [default object]
     * @return {[nothing]}   [nothing]
     */
    handleEvent: function(e) {

      var self = this;

      function cycleElements(index) {

        var removed = self.elements.splice(-index, index);

        for (var i = 0; i < removed.length; i++) {

          self.elemList.insertBefore(removed[i], self.elements[i]);
          self.elements.splice(i, 0, removed[i]);

        }

      }

      if (this.preventDef) {
        e.preventDefault();
      }

      function preVerticalNavigation () {
        if (self.middleElem) {
          document.querySelector('.middle').classList.remove('middle');
          self.middleElem = false;
        }


        var toRemoved = self.elemList.querySelector('.removed');
        var toRemoveOutFocus = self.elemList.querySelector('.out-focus');

        if (toRemoved) {
          self.elemList.removeChild(toRemoved);
        }

        if (toRemoveOutFocus) {
          toRemoveOutFocus.classList.remove('out-focus');
        }
      }

      if (this.preventDef){
        e.preventDefault();
      }

      var topStyle = null;

      switch(e.key) {
        case 'ArrowUp':

          preVerticalNavigation();
          document.getElementById('clock').classList.add('not-visible');

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

          if (app.pinManager.items[+clonedElem.dataset.index]){
            app.pinManager.
                items[+clonedElem.dataset.index].
                refreshDomElem(clonedElem);
          }

          this.elements.splice(0, 0, clonedElem);
          this.elements[0].classList.add('out-focus');

          this.selectedElemIndex++;

          lastElem.classList.add('removed');
          this.elements.splice(-1, 1);

          this.prevVerticalKey = 'up';


          break;

        case 'ArrowDown':

          preVerticalNavigation();
          document.getElementById('clock').classList.add('not-visible');

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

            if (app.pinManager.items[+cloned.dataset.index]){
              app.pinManager.
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

          this.prevVerticalKey = 'down';

          if (this.selectedElemIndex == 1) {
            this.elemList.style.top = '0rem';
          }

          break;

        case 'Accept':

          window.removeEventListener('keydown', this);

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

    /**
     * Setter for preventDefault parameter. Default value is false.
     * @param  {boolean} value  if true preventDefault()
     *                          function will be called there
     * @return {nothing}
     */
    set prevent(value) {
      if (typeof value === 'boolean') {
        this.preventDef = value;
      }
    }

  };

  exports.PinAppNavigation = PinAppNavigation;

}(window));
