'use strict';
/* global evt, SettingsList */
(function(exports) {

  function SetupGroupList() {
  }

  var proto = SetupGroupList.prototype = new SettingsList();

  proto.confirmSelection = function sgl_confirmSelection() {
    var dom = this.spatialNavigation.getFocusedElement();
    switch(dom.id) {
      case 'menu-item-landing-page':
        console.log('landing-page clicked');
        break;
    }
  };

  exports.SetupGroupList = SetupGroupList;
})(window);
