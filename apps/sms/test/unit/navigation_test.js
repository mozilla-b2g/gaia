/* global
    Navigation,
    MocksHelper,
    Promise,
    TransitionEvent
 */

'use strict';

require('/js/utils.js');
require('/test/unit/mock_utils.js');

require('/js/navigation.js');

var mocksHelperForNavigation = new MocksHelper([
  'Utils'
]).init();

suite('navigation >', function() {

  var fakeContainer;
  var Panel1, Panel2, Panel3, Panel4;

  var saved = new Map();

  function stubObject(object, properties) {
    var savedProperties = {};
    saved.set(object, savedProperties);

    for (var key in properties) {
      savedProperties[key] = object[key];
      object[key] = properties[key];
    }
  }

  function restore() {
    saved.forEach(function(object, properties) {
      for (var key in properties) {
        object[key] = properties[key];
      }
    });

    saved.clear();
  }

  mocksHelperForNavigation.attachTestHelpers();

  setup(function() {
    fakeContainer = document.createElement('div');
    fakeContainer.id = 'main-wrapper';
    document.body.appendChild(fakeContainer);

    Panel1 = {};
    Panel2 = {};
    Panel3 = {
      beforeEnter: sinon.stub(),
      beforeLeave: sinon.stub(),
      afterEnter: sinon.stub(),
      afterLeave: sinon.stub()
    };

    Panel4 = {
      beforeEnter: sinon.stub(),
      beforeLeave: sinon.stub(),
      afterEnter: sinon.stub(),
      afterLeave: sinon.stub()
    };

    stubObject(Navigation, {
      panelObjects: {
        Panel1: Panel1,
        Panel2: Panel2,
        Panel3: Panel3,
        Panel4: Panel4
      },
      defaultPanel: 'panel1',
      panels: {
        'panel1': {
          behaviour: 'Panel1',
          wrapperPosition: 'left'
        },
        'panel2': {
          behaviour: 'Panel2',
          wrapperPosition: 'left'
        },
        'panel3': {
          behaviour: 'Panel3',
          wrapperPosition: 'left'
        },
        'panel4': {
          behaviour: 'Panel4',
          wrapperPosition: 'left'
        },
        'bad-panel': {}
      }
    });
  });

  teardown(function() {
    fakeContainer.remove();
    restore();
  });

  suite('init >', function() {
    setup(function() {
      // we don't care about the slide operation in this test
      this.sinon.stub(Navigation, 'toPanel');
    });

    test('currentPanel is the default panel', function() {
      Navigation.init();
      sinon.assert.calledWith(Navigation.toPanel, 'panel1');
    });

    test('The hash is controlling the panel', function() {
      window.location.hash = '#panel2';
      Navigation.init();
      sinon.assert.calledWith(Navigation.toPanel, 'panel2');
    });

    test('The hash is controlling panels and args', function() {
      window.location.hash = '#panel2&id=1';
      Navigation.init();
      sinon.assert.calledWithMatch(Navigation.toPanel, 'panel2', { id: '1' });
    });
  });

  suite('toPanel >', function() {
    setup(function(done) {
      this.sinon.stub(Navigation, 'slide').returns(Promise.resolve());
      Navigation.init().then(done, done);
    });

    test('Return a rejected promise if the panel is unknown', function(done) {
      Navigation.toPanel('unknown').then(
        function onresolve() {
          done(new Error('should not return a resolved promise'));
        }, function onreject() {
          // we don't pass "done" directly because we don't want that done gets
          // an argument as it interprets this as a failure
          done();
        }
      );
    });

    test('Return a rejected promise if the panel is badly configured',
    function(done) {
      Navigation.toPanel('bad-panel').then(
        function onresolve() {
          done(new Error('should not return a resolved promise'));
        }, function onreject() {
          done();
        }
      );
    });

    test('Queue panel transition requests', function(done) {
      Navigation.toPanel('panel3');
      Navigation.toPanel('panel4').then(function() {
        sinon.assert.callOrder(
          Panel3.beforeEnter,
          Panel3.afterEnter,
          Panel4.beforeEnter,
          Panel4.afterEnter
        );
      }).then(done, done);
    });

    test('Queued panel also forwards rejections', function(done) {
      Panel4.beforeEnter.throws(new Error('error while entering panel3'));

      Promise.all([
        Navigation.toPanel('panel3').then(() => 'resolved', () => 'rejected'),
        Navigation.toPanel('panel4').then(() => 'resolved', () => 'rejected')
      ]).then(function(results) {
        assert.deepEqual(results, [ 'resolved', 'rejected' ]);

        sinon.assert.callOrder(
          Panel3.beforeEnter,
          Panel3.afterEnter,
          Panel4.beforeEnter
        );
      }).then(done, done);
    });


    suite('lifecycle >', function() {
      setup(function(done) {
        Navigation.toPanel('panel3').then(function() {
          // reseting lifecycle functions because we want to test the next
          // transition
          Panel3.beforeLeave.reset();
          Panel3.afterLeave.reset();
          Panel3.beforeEnter.reset();
          Panel3.afterEnter.reset();
          Panel4.beforeLeave.reset();
          Panel4.afterLeave.reset();
          Panel4.beforeEnter.reset();
          Panel4.afterEnter.reset();
          Navigation.slide.reset();
        }).then(done, done);
      });

      test('lifecycle order', function(done) {
        Navigation.toPanel('panel4').then(function() {
          sinon.assert.callOrder(
            Panel3.beforeLeave,
            Panel4.beforeEnter,
            Navigation.slide,
            Panel3.afterLeave,
            Panel4.afterEnter
          );
        }).then(done, done);
      });

      test('isCurrentPanel is changed at the right time', function(done) {
        var slidePromise = {
          then: function lazyThen(ifResolved /*, ifRejected */) {
            return Promise.resolve().then(function() {
              assert.isFalse(Navigation.isCurrentPanel('panel3'));
              assert.isFalse(Navigation.isCurrentPanel('panel4'));
            }).then(ifResolved, done);
          }
        };
        Navigation.slide.returns(slidePromise);

        var results = [];

        Panel3.beforeLeave = function() {
          results.push(Navigation.isCurrentPanel('panel3'));
        };
        Panel3.afterLeave = function() {
          results.push(Navigation.isCurrentPanel('panel4'));
        };
        Panel4.beforeEnter = function() {
          results.push(Navigation.isCurrentPanel('panel3'));
        };
        Panel4.afterEnter = function() {
          results.push(Navigation.isCurrentPanel('panel4'));
        };

        Navigation.toPanel('panel4').then(function() {
          assert.equal(results.length, 4);
          results.forEach(function(val, i) {
            assert.ok(val, 'result ' + i);
          });
        }).then(done, done);
      });

      test('lifecycle methods get passed the correct args', function(done) {
        var expectedArgs = {
          id: 1,
          meta: {
            next: {
              panel: 'panel4',
              args: {
                id: 1
              }
            },
            prev: {
              panel: 'panel3',
              args: undefined
            }
          }
        };

        Navigation.toPanel('panel4', { id: 1 }).then(function() {
          sinon.assert.calledWithMatch(Panel3.beforeLeave, expectedArgs);
          sinon.assert.calledWithMatch(Panel3.afterLeave, expectedArgs);
          sinon.assert.calledWithMatch(Panel4.beforeEnter, expectedArgs);
          sinon.assert.calledWithMatch(Panel4.afterEnter, expectedArgs);
        }).then(done, done);
      });

      suite('beforeLeave failures >', function() {
        test('throwing', function(done) {
          Panel3.beforeLeave.throws();

          Navigation.toPanel('panel4').then(function resolved_unexpected() {
            throw new Error('toPanel should not be resolved');
          }, function rejected_expected() {
            sinon.assert.notCalled(Panel4.beforeEnter);
            sinon.assert.notCalled(Panel3.afterLeave);
            sinon.assert.notCalled(Panel4.afterEnter);
            sinon.assert.notCalled(Navigation.slide);
            assert.ok(Navigation.isCurrentPanel('panel3'));
            assert.isFalse(Navigation.transitioning);
          }).then(done, done);
        });

        test('returning a rejected promise', function(done) {
          Panel3.beforeLeave.returns(Promise.reject());

          Navigation.toPanel('panel4').then(function resolved_unexpected() {
            throw new Error('toPanel should not be resolved');
          }, function rejected_expected() {
            sinon.assert.notCalled(Panel4.beforeEnter);
            sinon.assert.notCalled(Panel3.afterLeave);
            sinon.assert.notCalled(Panel4.afterEnter);
            sinon.assert.notCalled(Navigation.slide);
            assert.ok(Navigation.isCurrentPanel('panel3'));
            assert.isFalse(Navigation.transitioning);
          }).then(done, done);
        });
      });

      suite('beforeEnter failures >', function() {
        test('throwing', function(done) {
          Panel4.beforeEnter.throws();

          Navigation.toPanel('panel4').then(function resolved_unexpected() {
            throw new Error('toPanel should not be resolved');
          }, function rejected_expected() {
            sinon.assert.notCalled(Panel3.afterLeave);
            sinon.assert.notCalled(Panel4.afterEnter);
            sinon.assert.notCalled(Navigation.slide);
            assert.ok(Navigation.isCurrentPanel('panel3'));
            assert.isFalse(Navigation.transitioning);
          }).then(done, done);
        });

        test('returning a rejected promise', function(done) {
          Panel4.beforeEnter.returns(Promise.reject());

          Navigation.toPanel('panel4').then(function resolved_unexpected() {
            throw new Error('toPanel should not be resolved');
          }, function rejected_expected() {
            sinon.assert.notCalled(Panel3.afterLeave);
            sinon.assert.notCalled(Panel4.afterEnter);
            sinon.assert.notCalled(Navigation.slide);
            assert.ok(Navigation.isCurrentPanel('panel3'));
            assert.isFalse(Navigation.transitioning);
          }).then(done, done);
        });
      });

      suite('afterLeave failures >', function() {
        test('throwing', function(done) {
          Panel3.afterLeave.throws();

          Navigation.toPanel('panel4').then(function resolved_expected() {
            sinon.assert.called(Panel4.afterEnter);
            assert.ok(Navigation.isCurrentPanel('panel4'));
            assert.isFalse(Navigation.transitioning);
          }, function rejected_unexpected() {
            throw new Error('toPanel should not be rejected');
          }).then(done, done);
        });

        test('returning a rejected promise', function resolved_expected(done) {
          Panel3.afterLeave.returns(Promise.reject());

          Navigation.toPanel('panel4').then(function() {
            sinon.assert.called(Panel4.afterEnter);
            assert.ok(Navigation.isCurrentPanel('panel4'));
            assert.isFalse(Navigation.transitioning);
          }, function rejected_unexpected() {
            throw new Error('toPanel should not be rejected');
          }).then(done, done);
        });
      });

      suite('afterEnter failures >', function() {
        test('throwing', function(done) {
          Panel4.afterEnter.throws();
          this.sinon.stub(console, 'error');

          Navigation.toPanel('panel4').then(function resolved_expected() {
            assert.ok(Navigation.isCurrentPanel('panel4'));
            assert.isFalse(Navigation.transitioning);
            sinon.assert.called(console.error);
          }, function rejected_unexpected() {
            throw new Error('toPanel should not be rejected');
          }).then(done, done);
        });

        test('returning a rejected promise', function(done) {
          Panel4.afterEnter.returns(Promise.reject());
          this.sinon.stub(console, 'log');

          Navigation.toPanel('panel4').then(function resolved_expected() {
            assert.ok(Navigation.isCurrentPanel('panel4'));
            assert.isFalse(Navigation.transitioning);
            sinon.assert.called(console.log);
          }, function rejected_unexpected() {
            throw new Error('toPanel should not be rejected');
          }).then(done, done);
        });
      });
    });

    test('Remove any focus left on specific elements ', function() {
      this.sinon.spy(document.activeElement, 'blur');
      Navigation.toPanel('panel1');
      sinon.assert.called(document.activeElement.blur);
    });
  });

  suite('isCurrentPanel()', function() {
    setup(function(done) {
      this.sinon.stub(Navigation, 'slide').returns(Promise.resolve());
      Navigation.init().then(done, done);
    });

    test('returns false if the argument is falsy', function() {
      assert.isFalse(Navigation.isCurrentPanel(null));
      assert.isFalse(Navigation.isCurrentPanel());
    });

    test('returns the correct value without args', function(done) {
      Navigation.toPanel('panel1').then(function() {
        assert.isTrue(Navigation.isCurrentPanel('panel1'));
        assert.isFalse(Navigation.isCurrentPanel('panel2'));
        assert.isFalse(Navigation.isCurrentPanel('panel1', { prop: 1 }));
      }).then(done, done);
    });

    test('returns the correct value with args', function(done) {
      Navigation.toPanel('panel1', { prop1: 1, prop2: 'prop2' })
      .then(function() {
        assert.isTrue(Navigation.isCurrentPanel('panel1'));
        assert.isTrue(Navigation.isCurrentPanel('panel1', { prop1: 1 }));
        assert.isTrue(Navigation.isCurrentPanel('panel1', { prop2: 'prop2' }));
        assert.isTrue(
          Navigation.isCurrentPanel('panel1', { prop1: 1, prop2: 'prop2' })
        );

        assert.isFalse(Navigation.isCurrentPanel('panel2'));
        assert.isFalse(Navigation.isCurrentPanel('panel1', { prop1: 2 }));
        assert.isFalse(
          Navigation.isCurrentPanel('panel1', { prop1: 1, prop2: 'prop1' })
        );
        assert.isFalse(
          Navigation.isCurrentPanel('panel1', { prop2: 'prop1' })
        );
      }).then(done, done);
    });
  });

  suite('slide()', function() {
    var wrapper;

    setup(function() {
      loadBodyHTML('/index.html');
      wrapper = document.getElementById('main-wrapper'),
      Navigation.init();
    });

    teardown(function() {
      document.body.innerHTML = '';
    });

    function transitionendEvent() {
      return new TransitionEvent('transitionend', {
        bubbles: true,
        propertyName: 'transform'
      });
    }

    test('does not resolve the promise after 1 transitionend event',
    function(done) {
      var afterSlide = sinon.stub();
      Navigation.slide('left').then(afterSlide);

      wrapper.children[0].dispatchEvent(transitionendEvent());

      Promise.resolve().then(function() {
        sinon.assert.notCalled(afterSlide);
      }).then(done, done);
    });

    test('resolve the promise after 2 transitionend events', function(done) {
      var afterSlide = sinon.stub();
      Navigation.slide('left').then(afterSlide).then(done, done);

      wrapper.children[0].dispatchEvent(transitionendEvent());
      wrapper.children[1].dispatchEvent(transitionendEvent());
    });

    test('the event listener is correctly removed', function() {
      this.sinon.spy(wrapper, 'removeEventListener');

      Navigation.slide('left');

      wrapper.children[0].dispatchEvent(transitionendEvent());
      wrapper.children[1].dispatchEvent(transitionendEvent());

      sinon.assert.calledWith(wrapper.removeEventListener, 'transitionend');
    });
  });
});
