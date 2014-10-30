var Children = require('./childrunner');

function ParentRunner(argv) {
  this.argv = argv;
}

ParentRunner.prototype = {
  /**
   * Array of all currently running children.
   *
   * @type {Array}
   */
  children: null,

  /**
   * Runs the mocha tests with a given reporter.
   *
   * # Options
   *  - (Function) Reporter: class for test output.
   *  - (Function) Host: Host class (not instance) to be used in tests.
   *  - (Function) ProfileBuilder: profile builder class (not instance).
   *  - (Object) profileBase: profile options for every build.
   *  - (boolean) verbose: whether or not to proxy console.* calls from gecko.
   *
   * @param {Object} options for test run.
   * @return {Mocha.reporters.Base} reporter _instance_.
   */
  run: function(options) {
    // create the list of children.
    this.children = [];

    // XXX: Eventually we want multiple children running.
    var child = new Children.ChildRunner({
      Host: options.Host,
      ProfileBuilder: options.ProfileBuilder,
      argv: this.argv,
      profileBase: options.profileBase,
      verbose: options.verbose,
      runtime: options.runtime
    });

    // keep track of all children- mostly for future use.
    this.children.push(child);

    // spawn the process
    child.spawn();

    // since we deal with only one child right now just copy over the child's
    // process and runner.
    this.process = child.process;
    this.runner = child.runner;

    return new options.Reporter(child.runner);
  }
};

module.exports.ParentRunner = ParentRunner;
