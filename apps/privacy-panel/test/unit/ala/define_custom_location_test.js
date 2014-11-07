'use strict';

var htmlHelper;
//var realMozSettings;

suite('ALA CustomLocation', function() {

  suiteSetup(function(done) {
    require(['html_helper'], function(html) {
      htmlHelper = html;
      done();
    });
    //require(['mocks/mock_settings_listener'],
    //  function(mozSettings) {
    //    realMozSettings = navigator.mozSettings;
    //    navigator.mozSettings = mozSettings;
    //    done();
    //  });
  });

  setup(function(done) {
    require(['ala/define_custom_location'], ALADefineCustomLocation => {
      var section, test;

      this.subject = ALADefineCustomLocation;
      this.template = htmlHelper.get
      ('../../templates/ala/custom.html');

      test = document.getElementById('test');
      section = document.createElement('section');
      section.id = 'ala-custom';
      section.innerHTML = this.template;

      test.appendChild(section);

      done();
    });
  });
});