suite('parentrunner', function() {

  var sinon;
  setup(function() {
    sinon = global.sinon.sandbox.create();
  });

  teardown(function() {
    sinon.restore();
  });

  var subject;
  var Parent =
    require('../lib/parentrunner').ParentRunner;

  suite('initialization', function() {
    var argv = [];
    setup(function() {
      subject = new Parent(argv);
    });

    test('.argv', function() {
      assert.equal(subject.argv, argv);
    });
  });

  suite('#run', function() {
    var childrunner = require('../lib/childrunner');
    var profileBase = {};

    function Reporter() {}
    function Host() {}
    function ProfileBuilder() {}

    function MockChild(options) {
      this.options = options;
      this.process = {};
      this.runner = {};

      this.spawn = (function() {
        this.calledSpawn = true;
      }.bind(this));
    }

    var result;
    setup(function() {
      sinon.stub(childrunner, 'ChildRunner', MockChild);

      result = subject.run({
        Host: Host,
        Reporter: Reporter,
        ProfileBuilder: ProfileBuilder,
        profileBase: profileBase
      });
    });

    test('reporter', function() {
      assert.ok(result instanceof Reporter);
    });

    test('invokes child', function() {
      assert.equal(subject.children.length, 1);
    });

    test('spawns child', function() {
      assert.ok(subject.children[0].calledSpawn);
    });

    suite('child', function() {
      var child;
      setup(function() {
        child = subject.children[0];
      });

      test('options', function() {
        var expected = {
          argv: subject.argv,
          Host: Host,
          ProfileBuilder: ProfileBuilder,
          profileBase: profileBase,
          verbose: undefined,
          runtime: undefined
        };
        assert.deepEqual(child.options, expected);
      });
    });
  });

});
