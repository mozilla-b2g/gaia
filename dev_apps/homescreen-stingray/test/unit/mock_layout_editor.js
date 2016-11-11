'use strict';

(function(exports) {

  function MockLayoutEditor(options) {
    MockLayoutEditor.singleton._options = options;
    return MockLayoutEditor.singleton;
  }

  MockLayoutEditor.singleton = {
    placeHolders: [
      {static: true, elm: {}},
      {static: true, elm: {}},
      {elm: {}},
      {elm: {}},
      {elm: {}},
      {elm: {}}
    ],
    init: function() {
    },
    uninit: function() {
    },
    reset: function() {
    },
    getFirstNonStatic: function() {
    },
    exportConfig: function() {
    },
    addWidget: function() {
    },
    loadWidget: function() {
    },
    removeWidget: function() {
    },
    removeWidgets: function() {
    },
    updateWidgets: function() {
    },
    getNonStaticPlaces: function() {
      var ret = [];
      for (var i = 0; i < this.placeHolders.length; i++) {
        var place = this.placeHolders[i];
        if (!place.static) {
          ret.push(place);
        }
      }
      return ret;
    },
    getStaticPlaces: function() {
      var ret = [];
      for (var i = 0; i < this.placeHolders.length; i++) {
        var place = this.placeHolders[i];
        if (place.static) {
          ret.push(place);
        }
      }
      return ret;
    },
    mTeardown: function() {
      this.placeHolders = [
        {static: true, elm: {}},
        {static: true, elm: {}},
        {elm: {}},
        {elm: {}},
        {elm: {}},
        {elm: {}}
      ];
    }
  };

  MockLayoutEditor.mTeardown = MockLayoutEditor.singleton.mTeardown;
  exports.MockLayoutEditor = MockLayoutEditor;
})(window);
