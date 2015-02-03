'use strict';

suite('about software info >', function() {
  var commitInfo;

  var modules = [
    'panels/about_more_info/commit_info'
  ];

  var maps = {};

  var elements = {
    dispDate: document.createElement('li'),
    dispHash: document.createElement('li')
  };

  setup(function(done) {
    testRequire(modules, maps, function(CommitInfo) {
      commitInfo = CommitInfo();
      commitInfo._elements = elements;
      done();
    });
  });

  suite('Initialization >', function() {
    setup(function() {
      this.sinon.stub(commitInfo, '_loadGaiaCommit');
      commitInfo.init(elements);
    });

    test('function called', function() {
      assert.ok(commitInfo._loadGaiaCommit.called);
    });
  });
});

