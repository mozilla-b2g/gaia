'use strict';
(function (exports) {

  var MoreAppsNavigation = {
    controls: null,
    selectedElemIndex: 0,
    selectElement: null,

    init: function () {
      this.controls = app.grid.getItems();
      this.reset();
    },

    reset: function () {
      if (this.selectElement) {
        this.selectElement.classList.remove('selected');
      }
      this.selectedElemIndex = 0;
      this.selectElement = this.controls[this.selectedElemIndex].element;
      this.selectElement.classList.add('selected');
      this.clearNavigationEvents();
      window.addEventListener('keydown', this);
    },

    clearNavigationEvents: function () {
      window.removeEventListener('keydown', this);
    },

    handleEvent: function (e) {
      var deltaIndex = 0;
      e.preventDefault();
      switch (e.key) {
        case 'ArrowUp':
          deltaIndex = -2;
          this.changeSelectElem(deltaIndex);
          if (!this.isVisible(this.selectElement)) {
            this.selectElement.scrollIntoView({behavior:"smooth", block: "start"});
          }
          break;
        case 'ArrowDown':
          deltaIndex = 2;
          this.changeSelectElem(deltaIndex);
          if (!this.isVisible(this.selectElement)) {
            this.selectElement.childNodes[0].scrollIntoView({behavior:"smooth", block: "end"});
          }
          break;
        case 'ArrowLeft':
          deltaIndex = -1;
          this.changeSelectElem(deltaIndex);
          if (!this.isVisible(this.selectElement)) {
            this.selectElement.scrollIntoView({behavior:"smooth", block: "start"});
          }
          break;
        case 'ArrowRight':
          deltaIndex = 1;
          this.changeSelectElem(deltaIndex);
          if (!this.isVisible(this.selectElement)) {
            this.selectElement.childNodes[0].scrollIntoView({behavior:"smooth", block: "end"});
          }
          break;
        case 'Accept':
          window.removeEventListener('keydown', this);
          this.selectElement.click();
          break;
        case 'BrowserBack':
        case 'Backspace':
          app.backToMainScreen();
          break;
      }
    },

    changeSelectElem: function (deltaIndex) {
      this.selectElement.classList.remove('selected');
      var temp = this.selectedElemIndex + deltaIndex;
      if (temp > -1 && temp < this.controls.length) {
        this.selectedElemIndex = temp;
      }
      this.selectElement = this.controls[this.selectedElemIndex].element;
      this.selectElement.classList.add('selected');
    },

    isVisible: function (element) {
      var height = document.documentElement.clientHeight;
      var elementRects = element.getClientRects()[0];
      if (elementRects.bottom > height) {
        return false;
      } else if (elementRects.top < 0) {
        return false;
      }
      return true;
    }
  };

  exports.MoreAppsNavigation = MoreAppsNavigation;
})(this);
