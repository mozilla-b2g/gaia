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
      sinon.spy(result, 'unobserve');
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
      this.container = document.createElement('ul');
      this.template = (function(item, recycle) {
        if (recycle && this.template.recycle) {
          return recycle;
        }
        return document.createElement('li');
      }).bind(this);
      this.sinon.spy(this, 'template');
      this.listView = ListView(
        this.container, this.observableArray, this.template
      );
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
            assert.equal(this.container.children[count], li);
          });
        });
      });

      suite('Replace Element', function() {
        setup(function() {
          this.template.reset();
          this.item = { replacement: true };
          this.originalElements =
            Array.prototype.slice.call(this.container.children);
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
          assert.equal(this.container.children[1], li);
        });

        test('leaves other elements alone', function() {
          assert.equal(this.container.children[0], this.originalElements[0]);
          assert.equal(this.container.children[2], this.originalElements[2]);
        });
      });

      suite('Replace Element (w/recycle)', function() {
        setup(function() {
          this.template.recycle = true;
          this.template.reset();
          this.item = { replacement: true };
          this.originalElements =
            Array.prototype.slice.call(this.container.children);
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
          assert.equal(this.container.children[1], this.originalElements[1]);
        });

        test('leaves other elements alone', function() {
          assert.equal(this.container.children[0], this.originalElements[0]);
          assert.equal(this.container.children[2], this.originalElements[2]);
        });
      });

      suite('Reset With Shorter Array', function() {
        setup(function() {
          this.template.reset();
          this.originalElements =
            Array.prototype.slice.call(this.container.children);
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
              assert.equal(this.container.children[index], li);
            });
          });
        });

        test('removed extra elements', function() {
          assert.equal(this.container.children.length, 2);
          assert.equal(this.originalElements[2].parentNode, null);
        });
      });

      suite('Reset With Longer Array', function() {
        setup(function() {
          this.template.reset();
          this.originalElements =
            Array.prototype.slice.call(this.container.children);
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
              assert.equal(this.container.children[index], li);
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
            assert.equal(this.container.children.length, 4);
            var li = this.template.withArgs(this.item).returnValues[0];
            assert.equal(this.container.children[3], li);
          });
        });
      });

      suite('reset with .set([{},{}])', function() {
        setup(function() {
          this.template.reset();
          this.originalElements =
            Array.prototype.slice.call(this.container.children);
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
              assert.equal(this.container.children[index], li);
            });
          });
        });

        test('removed extra elements', function() {
          assert.equal(this.container.children.length, 2);
          assert.equal(this.originalElements[2].parentNode, null);
        });
      });

      suite('.enabled = false', function() {
        setup(function() {
          this.template.reset();
          this.originalElements =
            Array.prototype.slice.call(this.container.children);
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
              assert.deepEqual(this.container.children, this.originalElements);
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
                    this.container.children[index], template.returnValues[0],
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

  suite('ListView(<div>, ObservableArray, function)', function() {
    setup(function() {
      this.container = document.createElement('div');
      // ensure content inside the container at creation doesn't interfere
      this.container.appendChild(document.createElement('span'));
      this.template = (function(item, recycle) {
        if (recycle && this.template.recycle) {
          return recycle;
        }
        return document.createElement('div');
      }).bind(this);
      this.sinon.spy(this, 'template');
      this.observableArray.push({ count: 0 });
      this.listView = ListView(
        this.container, this.observableArray, this.template
      );
    });

    test('Listens to ObservableArray', function() {
      var observe = this.observableArray.observe;
      assert.ok(observe.calledWith('insert'));
      assert.ok(observe.calledWith('remove'));
      assert.ok(observe.calledWith('replace'));
      assert.ok(observe.calledWith('reset'));
    });

    test('Initial Element doesnt recycle', function() {
      var item = this.array[0];
      var filtered = this.template.withArgs(item);
      // ensures that if there happens to be an element in the creation
      // of the ListView, it is not used as a "recycled" element
      assert.ok(filtered.callCount, 1);
      assert.equal(filtered.args[0].length, 1);
    });

    suite('Add Multiple Elements', function() {
      setup(function() {
        // add 2 more items
        for (var count = 1; count < 3; count++) {
          this.observableArray.push({ count: count });
        }
      });

      // use forEach instead of for to keep 'count' in a closure
      [1, 2].forEach(function(count) {
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
            var div = this.template.withArgs(this.item).returnValues[0];
            assert.equal(this.container.children[count], div);
          });
        });
      });

      suite('Replace Element', function() {
        setup(function() {
          this.template.reset();
          this.item = { replacement: true };
          this.originalElements = [].slice.call(this.container.children);
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
          var div = this.template.withArgs(this.item).returnValues[0];
          assert.equal(this.container.children[1], div);
        });

        test('leaves other elements alone', function() {
          assert.equal(this.container.children[0], this.originalElements[0]);
          assert.equal(this.container.children[2], this.originalElements[2]);
        });
      });

      suite('Remove Element', function() {
        setup(function() {
          this.template.reset();
          this.originalElements = [].slice.call(this.container.children);
          this.observableArray.pop();
        });

        test('removed last element', function() {
          assert.equal(this.originalElements[2].parentNode, null);
        });

        test('leaves other elements alone', function() {
          assert.equal(this.container.children[0], this.originalElements[0]);
          assert.equal(this.container.children[1], this.originalElements[1]);
        });
      });

      suite('Insert Element', function() {
        setup(function() {
          this.originalElements = [].slice.call(this.container.children);
          this.item = {};
          this.template.reset();
          this.observableArray.splice(0, 0, this.item);
        });

        test('only called template method once', function() {
          assert.equal(this.template.callCount, 1);
        });

        test('inserted element', function() {
          var div = this.template.withArgs(this.item).returnValues[0];
          assert.equal(this.container.children[0], div);
        });

        test('shifts other elements', function() {
          assert.equal(this.container.children[1], this.originalElements[0]);
          assert.equal(this.container.children[2], this.originalElements[1]);
          assert.equal(this.container.children[3], this.originalElements[2]);
        });
      });
    });
  });

  suite('destroy', function() {
    setup(function() {
      this.observableArray = ObservableArray([]);
      this.container = document.createElement('div');
      this.listView = ListView(
        this.container, this.observableArray, function() {}
      );
    });

    test('sanity check', function() {
      assert.equal(this.observableArray.unobserve.callCount, 0);
    });

    test('unbinds from observeable', function() {
      this.listView.destroy();
      // called unobserve with a method
      assert.equal(this.observableArray.unobserve.callCount, 1);
      var arg = this.observableArray.unobserve.args[0][0];
      assert.isFunction(arg);
    });

    test('creating another ListView destroys old', function() {
      this.observableArray.observe.reset();
      this.sinon.spy(this.listView, 'destroy');
      // create a new one, we don't care about what happens to it.
      ListView(
        this.container, this.observableArray, function() {}
      );

      // destroys old view
      assert.ok(this.listView.destroy.called);
      // unbinds from observable
      assert.ok(this.observableArray.unobserve.called);
      // re-observes
      assert.ok(this.observableArray.observe.called);
    });
  });
});

