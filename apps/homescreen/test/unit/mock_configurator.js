'use strict';

(function() {

  var singleVariantConf = {
    'https://aHost/aMan1': {
      'screen': 1,
      'manifest' : 'https://aHost/aMan1',
      'location' : 15},
    'https://aHost/aMan2' : {
      'screen' : 2,
      'manifest' : 'https://aHost/aMan2',
      'location' : 6},
    'https://aHost/aMan3' : {
      'screen' : 2,
      'manifest' : 'https://aHost/aMan3',
      'location': 0},
    'https://aHost/aMan4': {
      'screen': 1,
      'manifest' : 'https://aHost/aMan4',
      'location' : 0},
    'https://aHost/aMan5' : {
      'screen' : 1,
      'manifest' : 'https://aHost/aMan5',
      'location' : 0},
    'https://aHost/aMan6' : {
      'screen' : 1,
      'manifest' : 'https://aHost/aMan5',
      'location' : 1},
    'https://aHost/aMan7' : {
      'screen' : 2,
      'manifest' : 'https://aHost/aMan5',
      'location' : 3},
    'https://aHost/aMan8' : {
      'screen' : 2,
      'manifest' : 'https://aHost/aMan6',
      'location': 0}
  };

  var MockConfigurator = {
    mSimPresentOnFirstBoot: true,
    mIsSVReady: true,
    getSection: function() { return null; },
    getSingleVariantApps: function() {
      return singleVariantConf;
    },
    get isSimPresentOnFirstBoot() {
      return this.mSimPresentOnFirstBoot;
    },
    get isSingleVariantReady() {
      return this.mIsSVReady;
    }
  };

  window.MockConfigurator = MockConfigurator;
})();
