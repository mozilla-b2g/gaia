(function(window) {
  var support;

  if (typeof(window.testSupport) === 'undefined') {
    window.testSupport = {};
  }

  support = window.testSupport;
  support.mochaGenerators = {

    /**
     * Overloads a test function to be capable
     * of using generators/yield for control flow.
     *
     *    test('yield', function(){
     *      function sleep(time) {
     *        setTimeout(time, MochaTask.next);
     *      }
     *
     *      yield sleep(5);
     *
     *      //..
     *
     *    });
     *
     *
     * @param {String} type name of mocha function.
     */
    overload: function overload(type) {
      var orig = window[type];

      window[type] = function() {
        var args = Array.prototype.slice.call(arguments),
            cb = args.pop();

        function wrapper(done) {
          var gen, useDone = cb.length > 0;

          if (useDone) {
            gen = cb.call(this, done);
          } else {
            gen = cb.call(this);
          }

          if (gen && gen.next) {
            MochaTask.start(gen, function(e) {
              done();
            }, function(e) {
              done(e);
            });
          } else {
            if (!useDone) {
              done();
            }
          }
        }

        wrapper.toString = function() {
          return cb.toString();
        }

        args.push(wrapper);
        orig.apply(window, args);
      }
    }

  };

}(this));
