suite('Tabs', function() {
  var Tabs;

  suiteSetup(function(done) {
    testRequire(['tabs'], function(tabs) {
      Tabs = tabs;
      done();
    });
  });

  setup(function() {
    this.element = document.createElement('div');
    this.element.innerHTML =
      '<li aria-selected="true"><a href="#link-0"></a></li>' +
      '<li><a href="#link-1"></a></li>' +
      '<li><a href="#link-2"></a></li>' +
      '<li><a href="#link-3"></a></li>';
    this.links = this.element.querySelectorAll('a');
    this.tabs = new Tabs(this.element);
    this.selectedSpy = this.sinon.spy();
    this.tabs.on('selected', this.selectedSpy);
  });

  suite('test click link 1', function() {
    setup(function() {
      this.links[0].click();
    });
    test('no event emitted (already selected)', function() {
      assert.equal(this.selectedSpy.callCount, 0);
    });
  });
  suite('test click link 2', function() {
    setup(function() {
      this.links[1].click();
    });
    test('event emitted', function() {
      assert.equal(this.selectedSpy.callCount, 1);
      assert.equal(this.selectedSpy.args[0][0].hash, '#link-1');
    });
    test('moved aria-selected', function() {
      assert.isTrue(this.links[1].parentNode.hasAttribute('aria-selected'));
      assert.equal(this.element.querySelectorAll('[aria-selected]').length, 1);
    });
    suite('test click link 2', function() {
      setup(function() {
        this.selectedSpy.reset();
        this.links[1].click();
      });
      test('no event emitted (already selected)', function() {
        assert.equal(this.selectedSpy.callCount, 0);
      });
    });
  });
});
