/* global
    AnimationEvent,
    HashChangeEvent,
    MocksHelper,
    Navigation,
    NavigationFactory,
    Promise
 */

'use strict';

require('/shared/js/event_dispatcher.js');

require('/views/shared/js/utils.js');
require('/views/shared/test/unit/mock_utils.js');

require('/views/shared/js/navigation.js');

var mocksHelperForNavigation = new MocksHelper([
  'Utils'
]).init();

suite('navigation >', function() {
  var FAKE_VIEW_OBJECTS =
    ['InboxView', 'ConversationView', 'ReportView', 'GroupView'];

  var fakeWindow, fakeLocation;
  var elements;

  mocksHelperForNavigation.attachTestHelpers();

  function fakeViewObjects() {
    FAKE_VIEW_OBJECTS.forEach((objectName) => {
      fakeWindow[objectName] = {
        beforeLeave: sinon.stub(),
        beforeEnter: sinon.stub(),
        afterLeave: sinon.stub(),
        afterEnter: sinon.stub()
      };
    });
  }

  function resetViewObjectStubs() {
    FAKE_VIEW_OBJECTS.map(
      (objectName) => fakeWindow[objectName]
    ).forEach((viewObject) => {
      ['beforeLeave', 'beforeEnter', 'afterLeave', 'afterEnter'].forEach(
        (stepName) => viewObject[stepName].reset()
      );
    });
  }

  function fakeAssign(url) {
    if (url.startsWith('#')) {
      setFakeLocation({ hash: url });
      Promise.resolve().then(
        () => window.dispatchEvent(new HashChangeEvent('hashchange'))
      );
    }
  }

  function setFakeLocation({ pathname, hash }) {
    if (pathname !== undefined) {
      fakeLocation.pathname = pathname;
    }

    if (hash !== undefined) {
      fakeLocation.hash = hash;
    }

    fakeLocation.href =
      'app://sms.gaiamobile.org' + fakeLocation.pathname + fakeLocation.hash;
  }

  function findViewElements() {
    elements = {};
    FAKE_VIEW_OBJECTS.forEach((viewName) => {
      elements[viewName] = document.querySelector('.panel-' + viewName);
    });
  }

  setup(function() {
    this.sinon.stub(window, 'setTimeout').yieldsAsync();
    loadBodyHTML('/index.html');

    fakeLocation = {
      assign: sinon.spy(fakeAssign),
      hash: '',
      href: 'app://sms.gaiamobile.org/',
      pathname: '/' // old architecture
    };

    fakeWindow = Object.create(window, {
      location: {
        get: () => fakeLocation
      },
      addEventListener: {
        get: () => (...args) => window.addEventListener(...args)
      },
      removeEventListener: {
        get: () => (...args) => window.removeEventListener(...args)
      },
      history: {
        value: {
          back: () => {}
        }
      }
    });

    findViewElements();
    fakeViewObjects();
  });

  teardown(function() {
    Navigation.cleanup();
    fakeWindow = null;
    elements = null;
    window.Navigation = null;
    document.body.innerHTML = '';
  });

  suite('non split views >', function() {
    setup(function() {
      window.Navigation = NavigationFactory(fakeWindow);
    });

    suite('init() >', function() {
      test('display the right panel', function(done) {
        assert.isFalse(elements.InboxView.classList.contains('panel-active'));
        Navigation.init().then(() => {
          assert.ok(elements.InboxView.classList.contains('panel-active'));
        }).then(done, done);
      });

      test('runs lifecycle methods for the right view', function(done) {
        setFakeLocation({ hash: '#/composer?id=3' });

        var transitionArgs = { id: '3' };
        Navigation.init().then(() => {
          sinon.assert.calledWithMatch(
            fakeWindow.ConversationView.beforeEnter,
            transitionArgs
          );
          sinon.assert.calledWithMatch(
            fakeWindow.ConversationView.afterEnter,
            transitionArgs
          );
          assert.ok(Navigation.isCurrentPanel('composer', { id: 3 }));
        }).then(done, done);
      });

      test('Do nothing when an unknown view is asked (hash)', function(done) {
        this.sinon.stub(console, 'error');

        setFakeLocation({ hash: '#/unknown?id=3' });

        Navigation.init().catch(() => {}).then(() => {
          sinon.assert.notCalled(fakeWindow.InboxView.beforeEnter);
          sinon.assert.notCalled(fakeWindow.InboxView.afterEnter);
          assert.isFalse(Navigation.isCurrentPanel('thread-list'));
          assert.isFalse(elements.InboxView.classList.contains('panel-active'));
          sinon.assert.calledTwice(console.error);
        }).then(done, done);
      });
    });

    suite('back() >', function() {
      setup(function(done) {
        Navigation.init().then(done, done);
      });

      test('Properly returns back in history', function(done) {
        this.sinon.stub(fakeWindow.history, 'back', () => {
          fakeAssign('#/composer');
        });

        Navigation.back().then(() => {
          sinon.assert.called(fakeWindow.InboxView.beforeLeave);
          sinon.assert.called(fakeWindow.history.back);
        }).then(done, done);
      });
    });

    suite('toPanel >', function() {
      setup(function(done) {
        Navigation.init().then(done, done);
      });

      test('Return a rejected promise if the panel is unknown', function(done) {
        Navigation.toPanel('unknown').then(
          function onresolve() {
            done(new Error('should not return a resolved promise'));
          }, function onreject() {
            // we don't pass "done" directly because we don't want that done
            // gets an argument as it interprets this as a failure
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

      test('Queue panel requests while not ready', function(done) {
        var fakeInbox = fakeWindow.InboxView;
        var fakeConversation = fakeWindow.ConversationView;
        fakeWindow.InboxView = null;
        fakeWindow.ConversationView = null;

        Navigation.toPanel('composer');
        Navigation.toPanel('thread', { id: 1 }).then(function() {
          sinon.assert.callOrder(
            fakeWindow.InboxView.beforeLeave,
            fakeWindow.ConversationView.beforeEnter,
            fakeWindow.InboxView.afterLeave,
            fakeWindow.ConversationView.afterEnter
          );
        }).then(done, done);

        setTimeout(() => {
          fakeWindow.InboxView = fakeInbox;
          fakeWindow.ConversationView = fakeConversation;
          Navigation.setReady();
        });
      });

      test('Queue panel transition requests', function(done) {
        Navigation.toPanel('thread-list');
        Navigation.toPanel('composer').then(function() {
          sinon.assert.callOrder(
            fakeWindow.InboxView.beforeEnter,
            fakeWindow.InboxView.afterEnter,
            fakeWindow.ConversationView.beforeEnter,
            fakeWindow.ConversationView.afterEnter
          );
        }).then(done, done);
      });

      test('Queued panel also forwards rejections', function(done) {
        fakeWindow.ConversationView.beforeLeave.throws(
          new Error('error while entering ReportView')
        );

        var req1 = Navigation.toPanel('thread', {id: 1}).then(
          () => 'resolved', () => 'rejected'
        );
        var req2 = Navigation.toPanel('report-view', {id: 1}).then(
          () => 'resolved', () => 'rejected'
        );
        Promise.all([req1, req2]).then(function(results) {
          assert.deepEqual(results, [ 'resolved', 'rejected' ]);

          sinon.assert.callOrder(
            fakeWindow.ConversationView.beforeEnter,
            fakeWindow.ConversationView.afterEnter,
            fakeWindow.ConversationView.beforeLeave
          );
        }).then(done, done);
      });

      suite('lifecycle >', function() {
        var panel1, panel2, panelName1, panelName2, panelName3;
        setup(function(done) {
          panel1 = fakeWindow.ConversationView;
          panel2 = fakeWindow.ReportView;
          panelName1 = 'thread';
          panelName2 = 'report-view';
          panelName3 = 'thread-list';

          Navigation.toPanel(panelName1).then(function() {
            // reseting lifecycle functions because we want to test the next
            // transition
            resetViewObjectStubs();
          }).then(done, done);
        });

        test('lifecycle order', function(done) {
          var onNavigatedStub = sinon.stub();
          Navigation.on('navigated', onNavigatedStub);
          Navigation.toPanel(panelName2).then(function() {
            sinon.assert.callOrder(
              panel1.beforeLeave,
              panel2.beforeEnter,
              panel2.afterEnter,
              panel1.afterLeave,
              onNavigatedStub
            );
          }).then(done, done);
        });

        test('isCurrentPanel is changed at the right time', function(done) {
          var results = [];

          panel1.beforeLeave = function() {
            results.push(Navigation.isCurrentPanel(panelName1));
          };
          panel1.afterLeave = function() {
            results.push(Navigation.isCurrentPanel(panelName2));
          };
          panel2.beforeEnter = function() {
            results.push(Navigation.isCurrentPanel(panelName1));
          };
          panel2.afterEnter = function() {
            results.push(Navigation.isCurrentPanel(panelName2));
          };

          Navigation.toPanel(panelName2).then(function() {
            assert.equal(results.length, 4);
            results.forEach(function(val, i) {
              assert.ok(val, 'result ' + i);
            });
          }).then(done, done);
        });

        test('lifecycle methods get passed the correct args', function(done) {
          var expectedArgs = {
            id: sinon.match(1),
            meta: {
              next: {
                panel: panelName2,
                args: sinon.match({
                  id: sinon.match(1)
                })
              },
              prev: {
                panel: panelName1,
                args: sinon.match.object
              }
            }
          };

          Navigation.toPanel(panelName2, { id: 1 }).then(function() {
            sinon.assert.calledWithMatch(panel1.beforeLeave, expectedArgs);
            sinon.assert.calledWithMatch(panel1.afterLeave, expectedArgs);
            sinon.assert.calledWithMatch(panel2.beforeEnter, expectedArgs);
            sinon.assert.calledWithMatch(panel2.afterEnter, expectedArgs);
          }).then(done, done);
        });

        suite('beforeLeave failures >', function() {
          test('throwing', function(done) {
            panel1.beforeLeave.onFirstCall().throws();

            Navigation.toPanel(panelName2).then(function resolved_unexpected() {
              throw new Error('toPanel should not be resolved');
            }, function rejected_expected() {
              sinon.assert.notCalled(panel2.beforeEnter);
              sinon.assert.notCalled(panel1.afterLeave);
              sinon.assert.notCalled(panel2.afterEnter);
              assert.ok(Navigation.isCurrentPanel(panelName1));

              // check we can have a new transition
              return Navigation.toPanel(panelName3);
            }).then(done, done);
          });

          test('returning a rejected promise', function(done) {
            panel1.beforeLeave.onFirstCall().returns(Promise.reject());

            Navigation.toPanel(panelName2).then(function resolved_unexpected() {
              throw new Error('toPanel should not be resolved');
            }, function rejected_expected() {
              sinon.assert.notCalled(panel2.beforeEnter);
              sinon.assert.notCalled(panel1.afterLeave);
              sinon.assert.notCalled(panel2.afterEnter);
              assert.ok(Navigation.isCurrentPanel(panelName1));

              // check we can have a new transition
              return Navigation.toPanel(panelName3);
            }).then(done, done);
          });
        });

        suite('beforeEnter failures >', function() {
          test('throwing', function(done) {
            panel2.beforeEnter.onFirstCall().throws();

            Navigation.toPanel(panelName2).then(function resolved_expected() {
              sinon.assert.callOrder(
                panel1.beforeLeave,
                panel2.beforeEnter,
                panel2.afterEnter,
                panel1.afterLeave
              );
              assert.ok(Navigation.isCurrentPanel(panelName2));

              // check we can have a new transition
              return Navigation.toPanel(panelName3);
            }, function rejected_unexpected() {
              throw new Error('toPanel should not be rejected');
            }).then(done, done);
          });

          test('returning a rejected promise', function(done) {
            panel2.beforeEnter.onFirstCall().returns(Promise.reject());

            Navigation.toPanel(panelName2).then(function resolved_expected() {
              sinon.assert.callOrder(
                panel1.beforeLeave,
                panel2.beforeEnter,
                panel2.afterEnter,
                panel1.afterLeave
              );
              assert.ok(Navigation.isCurrentPanel(panelName2));

              // check we can have a new transition
              return Navigation.toPanel(panelName3);
            }, function rejected_unexpected() {
              throw new Error('toPanel should not be rejected');
            }).then(done, done);
          });
        });

        suite('afterLeave failures >', function() {
          test('throwing', function(done) {
            panel1.afterLeave.onFirstCall().throws();

            Navigation.toPanel(panelName2).then(function resolved_expected() {
              sinon.assert.called(panel2.afterEnter);
              assert.ok(Navigation.isCurrentPanel(panelName2));

              // check we can have a new transition
              return Navigation.toPanel(panelName3);
            }, function rejected_unexpected() {
              throw new Error('toPanel should not be rejected');
            }).then(done, done);
          });

          test('returning a rejected promise', function(done) {
            panel1.afterLeave.onFirstCall().returns(Promise.reject());

            Navigation.toPanel(panelName2).then(function resolved_expected() {
              sinon.assert.called(panel2.afterEnter);
              assert.ok(Navigation.isCurrentPanel(panelName2));

              // check we can have a new transition
              return Navigation.toPanel(panelName3);
            }, function rejected_unexpected() {
              throw new Error('toPanel should not be rejected');
            }).then(done, done);
          });
        });

        suite('afterEnter failures >', function() {
          test('throwing', function(done) {
            panel2.afterEnter.onFirstCall().throws();
            this.sinon.stub(console, 'error');

            Navigation.toPanel(panelName2).then(function resolved_expected() {
              assert.ok(Navigation.isCurrentPanel(panelName2));
              sinon.assert.called(console.error);

              // check we can have a new transition
              return Navigation.toPanel(panelName3);
            }, function rejected_unexpected() {
              throw new Error('toPanel should not be rejected');
            }).then(done, done);
          });

          test('returning a rejected promise', function(done) {
            panel2.afterEnter.onFirstCall().returns(Promise.reject());
            this.sinon.stub(console, 'log');

            Navigation.toPanel(panelName2).then(function resolved_expected() {
              assert.ok(Navigation.isCurrentPanel(panelName2));
              sinon.assert.called(console.log);

              // check we can have a new transition
              return Navigation.toPanel(panelName3);
            }, function rejected_unexpected() {
              throw new Error('toPanel should not be rejected');
            }).then(done, done);
          });
        });
      });

      test('Remove any focus left on specific elements ', function() {
        this.sinon.spy(document.activeElement, 'blur');
        Navigation.toPanel('thread');
        sinon.assert.called(document.activeElement.blur);
      });
    });

    suite('URL manipulation >', function() {
      setup(function(done) {
        Navigation.init().then(done, done);
      });

      test('toPanel changes the location', function(done) {
        Navigation.toPanel('composer', { id: 3 }).then(() => {
          sinon.assert.calledWith(
            fakeWindow.location.assign,
            '#/composer?id=3'
          );

          return Navigation.toPanel('thread-list');
        }).then(() => {
          sinon.assert.calledWith(
            fakeWindow.location.assign,
            '#'
          );
        }).then(done, done);
      });
    });

    test('isDefaultPanel() correctly determines default panel', function() {
      // If hash is empty.
      setFakeLocation({ hash: '' });
      assert.isTrue(Navigation.isDefaultPanel());

      // False if hash set to some different panel.
      setFakeLocation({ hash: '#/composer' });
      assert.isFalse(Navigation.isDefaultPanel());
    });

    suite('isCurrentPanel()', function() {
      var view1 = 'thread-list';
      var view2 = 'thread';

      setup(function(done) {
        Navigation.init().then(done, done);
      });

      test('returns false if the argument is falsy', function() {
        assert.isFalse(Navigation.isCurrentPanel(null));
        assert.isFalse(Navigation.isCurrentPanel());
      });

      test('returns the correct value without args', function() {
        assert.isTrue(Navigation.isCurrentPanel(view1));
        assert.isFalse(Navigation.isCurrentPanel(view2));
        assert.isFalse(Navigation.isCurrentPanel(view1, { prop: 1 }));
      });

      test('returns the correct value with args', function(done) {
        Navigation.toPanel(view2, { prop1: 1, prop2: 'prop2' })
        .then(function() {
          assert.isTrue(Navigation.isCurrentPanel(view2));
          assert.isTrue(Navigation.isCurrentPanel(view2, { prop1: 1 }));
          assert.isTrue(Navigation.isCurrentPanel(view2, { prop2: 'prop2' }));
          assert.isTrue(
            Navigation.isCurrentPanel(view2, { prop1: 1, prop2: 'prop2' })
          );

          assert.isFalse(Navigation.isCurrentPanel(view1));
          assert.isFalse(Navigation.isCurrentPanel(view2, { prop1: 2 }));
          assert.isFalse(
            Navigation.isCurrentPanel(view2, { prop1: 1, prop2: 'prop1' })
          );
          assert.isFalse(
            Navigation.isCurrentPanel(view2, { prop2: 'prop1' })
          );
        }).then(done, done);
      });
    });

    suite('sliding views', function() {
      setup(function(done) {
        // neutralizes the setTimeout fallback
        window.setTimeout.restore();
        Navigation.init().then(done, done);
      });

      function animationEndEvent() {
        return new AnimationEvent('animationend', {
          bubbles: true,
          animationName: 'some-name'
        });
      }

      test('resolve the promise after animationend events', function(done) {
        var panel = document.querySelector('.panel-ConversationView');
        this.sinon.spy(panel, 'removeEventListener');
        setTimeout(
          () => panel.dispatchEvent(animationEndEvent())
        );
        this.sinon.stub(window, 'setTimeout');

        Navigation.toPanel('thread').then(() => {
          sinon.assert.calledWith(panel.removeEventListener, 'animationend');
        }).then(done, done);
      });
    });
  });

  suite('split views >', function() {
    setup(function() {
      setFakeLocation({ pathname: '/views/inbox/' });

      window.Navigation = NavigationFactory(fakeWindow);
    });

    suite('init()) >', function() {
      test('display the right panel', function(done) {
        assert.isFalse(elements.InboxView.classList.contains('panel-active'));
        Navigation.init().then(() => {
          assert.ok(elements.InboxView.classList.contains('panel-active'));
        }).then(done, done);
      });

      test('find the right split view', function(done) {
        setFakeLocation({ pathname: '/views/conversation/', hash: '#?id=3'});

        var transitionArgs = { id: '3' };
        Navigation.init().then(() => {
          sinon.assert.calledWithMatch(
            fakeWindow.ConversationView.beforeEnter,
            transitionArgs
          );
          sinon.assert.calledWithMatch(
            fakeWindow.ConversationView.afterEnter,
            transitionArgs
          );
          assert.ok(Navigation.isCurrentPanel('thread', { id: 3 }));
        }).then(done, done);
      });

      test('find the right split subview', function(done) {
        setFakeLocation(
          { pathname: '/views/conversation/', hash: '#/report-view?id=3' }
        );

        var transitionArgs = { id: '3' };
        Navigation.init().then(() => {
          sinon.assert.calledWithMatch(
            fakeWindow.ReportView.beforeEnter,
            transitionArgs
          );
          sinon.assert.calledWithMatch(
            fakeWindow.ReportView.afterEnter,
            transitionArgs
          );
          assert.ok(Navigation.isCurrentPanel('report-view', { id: 3 }));
        }).then(done, done);
      });

      test('Do nothing when an unknown view is asked (hash)', function(done) {
        this.sinon.stub(console, 'error');

        setFakeLocation({ hash: '#/unknown?id=3' });

        Navigation.init().catch(() => {}).then(() => {
          sinon.assert.notCalled(fakeWindow.InboxView.beforeEnter);
          sinon.assert.notCalled(fakeWindow.InboxView.afterEnter);
          assert.isFalse(Navigation.isCurrentPanel('thread-list'));
          assert.isFalse(elements.InboxView.classList.contains('panel-active'));
          sinon.assert.calledTwice(console.error);
        }).then(done, done);
      });

      test('Do nothing when an unknown view is asked (path)', function(done) {
        this.sinon.stub(console, 'error');

        setFakeLocation({ pathname: '/unknown/' });

        Navigation.init().catch(() => {}).then(() => {
          sinon.assert.notCalled(fakeWindow.InboxView.beforeEnter);
          sinon.assert.notCalled(fakeWindow.InboxView.afterEnter);
          assert.isFalse(Navigation.isCurrentPanel('thread-list'));
          assert.isFalse(elements.InboxView.classList.contains('panel-active'));
          sinon.assert.calledTwice(console.error);
        }).then(done, done);
      });

      test('Load the view from path when an unrelated subview is asked',
      function(done) {
        this.sinon.stub(console, 'error');

        setFakeLocation({ pathname: '/views/inbox/', hash: '#/composer?id=3' });

        Navigation.init().then(() => {
          sinon.assert.called(fakeWindow.InboxView.beforeEnter);
          sinon.assert.called(fakeWindow.InboxView.afterEnter);
          assert.isTrue(Navigation.isCurrentPanel('thread-list'));
          assert.isTrue(elements.InboxView.classList.contains('panel-active'));
          sinon.assert.calledOnce(console.error);
        }).then(done, done);
      });
    });

    suite('URL manipulation >', function() {
      setup(function(done) {
        setFakeLocation({ pathname: '/views/conversation/', hash: '#?id=3' });

        Navigation.init().then(done, done);
      });

      test('toPanel changes the location', function(done) {
        Navigation.toPanel('composer', { id: 3 }).then(() => {
          sinon.assert.calledWith(
            fakeWindow.location.assign,
            '#/composer?id=3'
          );

          return new Promise((resolve) => {
            fakeWindow.location.assign = sinon.spy(resolve);
            Navigation.toPanel('thread-list');
          });
        }).then(() => {
          sinon.assert.calledWith(
            fakeWindow.location.assign, '/views/inbox/index.html#'
          );
        }).then(done, done);
      });
    });
  });
});
