'use strict';

var GtPanels = require('../lib/panels/guided_tour');

marionette('guided tour panels', function() {
  var client = marionette.client({
    settings: {
      'privacy-panel-gt-complete': true
    }
  });
  var subject;

  setup(function() {
    subject = new GtPanels(client);
    subject.init();
  });

  test('ability to get through guided tour flow', function() {
    subject.getThruPanel(subject.selectors.gtWelcome);
    subject.getThruPanel(subject.selectors.gtAlaExplain);
    subject.getThruPanel(subject.selectors.gtAlaBlur);
    subject.getThruPanel(subject.selectors.gtAlaCustom);
    subject.getThruPanel(subject.selectors.gtAlaExceptions);
    subject.getThruPanel(subject.selectors.gtRpExplain);
    subject.getThruPanel(subject.selectors.gtRpPassphrase);
    subject.getThruPanel(subject.selectors.gtRpLocate);
    subject.getThruPanel(subject.selectors.gtRpRing);
    subject.getThruPanel(subject.selectors.gtRpLock);
  });

  test('ability to close guided tour after 4ths screen', function() {
    subject.getThruPanel(subject.selectors.gtWelcome);
    subject.getThruPanel(subject.selectors.gtAlaExplain);
    subject.getThruPanel(subject.selectors.gtAlaBlur);
    subject.getThruPanel(subject.selectors.gtAlaCustom);
    subject.tapOnCloseBtn(subject.selectors.gtAlaExceptions);
    subject.waitForPanel(subject.selectors.rootPanel);
  });

  test('ability to get back to previous gt panels', function() {
    subject.getThruPanel(subject.selectors.gtWelcome);
    subject.getThruPanel(subject.selectors.gtAlaExplain);
    subject.getThruPanel(subject.selectors.gtAlaBlur);
    subject.getThruPanel(subject.selectors.gtAlaCustom);
    subject.getThruPanel(subject.selectors.gtAlaExceptions);
    subject.getThruPanel(subject.selectors.gtRpExplain);
    subject.getThruPanel(subject.selectors.gtRpPassphrase);
    subject.getThruPanel(subject.selectors.gtRpLocate);
    subject.getThruPanel(subject.selectors.gtRpRing);
    subject.getBack(subject.selectors.gtRpLock);
    subject.getBack(subject.selectors.gtRpRing);
    subject.getBack(subject.selectors.gtRpLocate);
    subject.getBack(subject.selectors.gtRpPassphrase);
    subject.getBack(subject.selectors.gtRpExplain);
    subject.getBack(subject.selectors.gtAlaExceptions);
    subject.getBack(subject.selectors.gtAlaCustom);
    subject.getBack(subject.selectors.gtAlaBlur);
    subject.getBack(subject.selectors.gtAlaExplain);
    subject.waitForPanel(subject.selectors.gtWelcome);
  });
});
