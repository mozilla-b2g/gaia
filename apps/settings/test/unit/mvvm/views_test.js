/* global ListView:false */
/* global ObservableArray:false */
'use strict';

// The views are very tightly coupled to models, rather than reimplement model
// behavior in a mock, rely on tested interfaces on the model instead
requireApp('settings/js/mvvm/models.js');
requireApp('settings/js/mvvm/views.js');

suite('ListView', function() {

  var suiteSandbox = sinon.sandbox.create();
  suiteSetup(function() {
    var OriginalObservableArray = ObservableArray;
    // stub the real ObservableArray to create spies on observe method
    suiteSandbox.stub(window, 'ObservableArray', function() {
      var result = OriginalObservableArray.apply(this, arguments);
      sinon.spy(result, 'observe');
      return result;
    });

  });
  suiteTeardown(function() {
    suiteSandbox.restore();
  });

  setup(function() {
    this.array = [];
    this.observableArray = ObservableArray(this.array);
    ObservableArray.reset();
  });

  suite('ListView(<ul>, ObservableArray, function)', function() {
    setup(function() {
      this.ul = document.createElement('ul');
      this.template = (function(item, recycle) {
        if (recycle && this.template.recycle) {
          return recycle;
        }
        return document.createElement('li');
      }).bind(this);
      this.sinon.spy(this, 'template');
      this.listView = ListView(this.ul, this.observableArray, this.template);
    });

    test('Listens to ObservableArray', function() {
      var observe = this.observableArray.observe;
      assert.ok(observe.calledWith('insert'));
      assert.ok(observe.calledWith('remove'));
      assert.ok(observe.calledWith('replace'));
      assert.ok(observe.calledWith('reset'));
    });

    suite('Add Multiple Elements', function() {
      setup(function() {
        // add 3 items
        for (var count = 0; count < 3; count++) {
          this.observableArray.push({ count: count });
        }
      });

      // use forEach instead of for to keep 'count' in a closure
      [0, 1, 2].forEach(function(count) {
        suite('item ' + count, function() {
          setup(function() {
            this.item = this.array[count];
          });
          test('kept order', function() {
            assert.equal(this.item.count, count);
          });
          test('called template', function() {
            assert.ok(this.template.calledWith(this.item));
          });
          test('template returned element is in correct position', function() {
            var li = this.template.withArgs(this.item).returnValues[0];
            assert.equal(this.ul.children[count], li);
          });
        });
      });

      suite('Replace Element', function() {
        setup(function() {
          this.template.reset();
          this.item = { replacement: true };
          this.originalElements = Array.prototype.slice.call(this.ul.children);
          this.observableArray.set(1, this.item);
        });

        test('called template with recycled element', function() {
          assert.ok(
            this.template.calledWith(this.item, this.originalElements[1])
          );
        });

        test('only called template method once', function() {
          assert.equal(this.template.callCount, 1);
        });

        test('replaced element', function() {
          var li = this.template.withArgs(this.item).returnValues[0];
          assert.equal(this.ul.children[1], li);
        });

        test('leaves other elements alone', function() {
          assert.equal(this.ul.children[0], this.originalElements[0]);
          assert.equal(this.ul.children[2], this.originalElements[2]);
        });
      });

      suite('Replace Element (w/recycle)', function() {
        setup(function() {
          this.template.recycle = true;
          this.template.reset();
          this.item = { replacement: true };
          this.originalElements = Array.prototype.slice.call(this.ul.children);
          this.observableArray.set(1, this.item);
        });

        test('called template with recycled element', function() {
          assert.ok(
            this.template.calledWith(this.item, this.originalElements[1])
          );
        });

        test('only called template method once', function() {
          assert.equal(this.template.callCount, 1);
        });

        test('same element still in place', function() {
          var li = this.template.withArgs(this.item).returnValues[0];
          assert.equal(li, this.originalElements[1], 'returned original');
          assert.equal(this.ul.children[1], this.originalElements[1]);
        });

        test('leaves other elements alone', function() {
          assert.equal(this.ul.children[0], this.originalElements[0]);
          assert.equal(this.ul.children[2], this.originalElements[2]);
        });
      });

      suite('Reset With Shorter Array', function() {
        setup(function() {
          this.template.reset();
          this.originalElements = Array.prototype.slice.call(this.ul.children);
          this.originalArray = this.array;
          this.array = [{ reset: 1 }, { reset: 2 }];
          this.observableArray.reset(this.array);
        });

        // use forEach instead of for to store 'index' in closure
        [0, 1].forEach(function(index) {
          suite('item ' + index, function() {
            setup(function() {
              this.item = this.array[index];
              this.originalElement = this.originalElements[index];
            });
            test('called template with recycled element', function() {
              assert.ok(
                this.template.calledWith(this.item, this.originalElement)
              );
            });
            test('replaced element', function() {
              var li = this.template.withArgs(this.item).returnValues[0];
              assert.equal(this.ul.children[index], li);
            });
          });
        });

        test('removed extra elements', function() {
          assert.equal(this.ul.children.length, 2);
          assert.equal(this.originalElements[2].parentNode, null);
        });
      });

      suite('Reset With Longer Array', function() {
        setup(function() {
          this.template.reset();
          this.originalElements = Array.prototype.slice.call(this.ul.children);
          this.originalArray = this.array;
          this.array = [{ reset: 1 }, { reset: 2 }, { reset: 3 }, { reset: 4 }];
          this.observableArray.reset(this.array);
        });

        // use forEach instead of for to store 'index' in closure
        [0, 1, 2].forEach(function(index) {
          suite('item ' + index, function() {
            setup(function() {
              this.item = this.array[index];
              this.originalElement = this.originalElements[index];
            });
            test('called template with recycled element', function() {
              assert.ok(
                this.template.calledWith(this.item, this.originalElement)
              );
            });
            test('replaced element', function() {
              var li = this.template.withArgs(this.item).returnValues[0];
              assert.equal(this.ul.children[index], li);
            });
          });
        });

        suite('item 3', function() {
          setup(function() {
            this.item = this.array[3];
          });

          test('called template without recycled element', function() {
            assert.ok(this.template.calledWith(this.item));
            assert.equal(
              this.template.withArgs(this.item).args[0][1], undefined
            );
          });

          test('added extra element', function() {
            assert.equal(this.ul.children.length, 4);
            var li = this.template.withArgs(this.item).returnValues[0];
            assert.equal(this.ul.children[3], li);
          });
        });
      });

      suite('reset with .set([{},{}])', function() {
        setup(function() {
          this.template.reset();
          this.originalElements = Array.prototype.slice.call(this.ul.children);
          this.originalArray = this.array;
          this.array = [{ reset: 1 }, { reset: 2 }];
          this.listView.set(this.array);
        });

        test('creates and watches an ObservableArray', function() {
          var withNew = ObservableArray.withArgs(this.array);
          assert.ok(withNew.called);
          var observe = withNew.returnValues[0].observe;
          assert.ok(observe.calledWith('insert'));
          assert.ok(observe.calledWith('remove'));
          assert.ok(observe.calledWith('replace'));
          assert.ok(observe.calledWith('reset'));
        });

        // use forEach instead of for to store 'index' in closure
        [0, 1].forEach(function(index) {
          suite('item ' + index, function() {
            setup(function() {
              this.item = this.array[index];
              this.originalElement = this.originalElements[index];
            });
            test('called template with recycled element', function() {
              assert.ok(
                this.template.calledWith(this.item, this.originalElement)
              );
            });
            test('replaced element', function() {
              var li = this.template.withArgs(this.item).returnValues[0];
              assert.equal(this.ul.children[index], li);
            });
          });
        });

        test('removed extra elements', function() {
          assert.equal(this.ul.children.length, 2);
          assert.equal(this.originalElements[2].parentNode, null);
        });
      });

      suite('.enabled = false', function() {
        setup(function() {
          this.template.reset();
          this.originalElements = Array.prototype.slice.call(this.ul.children);
          this.listView.enabled = false;
        });
        // test a bunch of things that modify the array
        [function pop() {
          this.observableArray.pop();
        }, function push() {
          this.observableArray.push({});
        }, function replace() {
          this.observableArray.set(1, {});
        }, function reset() {
          this.array = [{}];
          this.observableArray.reset(this.array);
        }, function set() {
          this.array = [{}];
          this.listView.set(this.array);
        }].forEach(function(method) {
          suite(method.name, function() {
            setup(method);
            test('does not call template', function() {
              assert.equal(this.template.called, 0);
            });
            test('does not change elements', function() {
              assert.deepEqual(this.ul.children, this.originalElements);
            });
            suite('.enabled = true', function() {
              setup(function() {
                this.listView.enabled = true;
              });
              test('calls template for each item in array', function() {
                this.array.forEach(function(item, index) {
                  assert.ok(this.template.calledWith(
                    item, this.originalElements[index]
                  ), 'array[' + index + ']');
                }, this);
              });
              test('elements are put in the right place', function() {
                this.array.forEach(function(item, index) {
                  var template = this.template.withArgs(item);
                  assert.equal(
                    this.ul.children[index], template.returnValues[0],
                    'element[' + index + ']'
                  );
                }, this);
              });
            });
          });
        });
      });
    });
  });
});

