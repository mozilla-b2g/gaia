'use strict';
/* exported CSSLintPlugin */

var CSSLintPlugin = {
  id: 'lowercase-selectors',
  name: 'use only lowercase selectors',
  desc: 'Selectors should be in lowercase.',
  browsers: 'All',
  init: function(parser, reporter) {
    var rule = this;
    parser.addListener('startrule', function(event) {
      var selectors = event.selectors;
      for (var i = 0; i < selectors.length; i++) {
        var selector = selectors[i].text;
        if (/([A-Z])/.test(selector)) {
          reporter.report('Selectors should be in lowercase',
            event.line, event.col, rule);
        }
      }
    });
  }
};
