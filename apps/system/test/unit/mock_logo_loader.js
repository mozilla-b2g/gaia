'use strict';

var MockLogoLoader = function() {
};

MockLogoLoader.prototype = {
  _initVideo: function() {},
  _initImage: function() {},
  _onLogoLoaded: function() {}
};

window.LogoLoader = MockLogoLoader;
