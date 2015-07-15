var expect = require('chai').expect;
var htmlTransformer = require('../html_transformer');

suite('htmlTransformer', function() {
  var subject;

  setup(function() {
    return htmlTransformer.load(__dirname + '/fixtures/basic.html')
    .then(function(result) {
      subject = result;
    });
  });

  test('should be an HTMLTransformer', function() {
    expect(subject).to.be.an.instanceOf(htmlTransformer.HTMLTransformer);
  });

  test('should load html', function() {
    var doc = subject.window.document;
    var p = doc.querySelector('p');
    expect(p.textContent).to.equal('A really great thing to say');
  });

  test('#getSharedDependencies', function() {
    expect(subject.getSharedDependencies())
      .to
      .deep
      .equal([
        'shared/style/toolbars.css',
        'shared/elements/gaia-theme/style.css',
        'shared/js/component_utils.js',
        'shared/elements/gaia_subheader/script.js',
        'shared/style/tabs.css',
        'shared/elements/gaia-theme/other.css',
        'shared/js/gesture_detector.js'
      ]);
  });
});
