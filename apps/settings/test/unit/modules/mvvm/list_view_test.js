/* global define */
'use strict';

// The views are very tightly coupled to models, rather than reimplement model
// behavior in a mock, rely on tested interfaces on the model instead
suite('ListView', function() {
  // Define a shim for ObservableArray that is to be loaded in ListView.
  // Then we are able to creat a stub on it.

  suiteSetup(function(done) {
    // Use the shim in ListView.
    var ObservableArrayShimName = 'observable_array_shim' + Date.now();
    var map = {
      'modules/mvvm/list_view': {
        'modules/mvvm/observable_array': ObservableArrayShimName
      }
    };

    // XXX: Create a new require context.
    //      We can only define the mock module after retrieving the context.
    var requireCtx = testRequire([], map, function() {});
    // Define the mock module.
    define(ObservableArrayShimName, function() {
      var ctor = function observable_array_shim() {
        return ctor.mInnerFunction.apply(this, arguments);
      };
      ctor.mInnerFunction = function() {};
      ctor.mTeardown = function observable_array_shim_teardown() {
        ctor.mInnerFunction = function() {};
      };
      return ctor;
    });

    requireCtx([
      'modules/mvvm/observable',
      'modules/mvvm/observable_array',
      'modules/mvvm/list_view',
      ObservableArrayShimName
    ], (function(Observable, ObservableArray, ListView, ObservableArrayShim) {
      this.Observable = Observable;
      this.ListView = ListView;
      this.ObservableArrayShim = ObservableArrayShim;
      // stub the real ObservableArray to create spies on observe method
      // Redirect the shim to the ObservableArray stub.
      this.ObservableArray = sinon.stub(ObservableArrayShim,
        'mInnerFunction', function() {
          var result = ObservableArray.apply(this, arguments);
          sinon.spy(result, 'addEventListener');
          sinon.spy(result, 'removeEventListener');
          return result;
      });
      done();
    }).bind(this));
  });

  teardown(function() {
    this.ObservableArray.reset();
  });

  suiteTeardown(function() {
    this.ObservableArray.restore();
  });

  setup(function() {
    this.array = [];
    this.observableArray = this.ObservableArray(this.array);
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
      this.listView = this.ListView(
        this.container, this.observableArray, this.template
      );
    });

    test('.element', function() {
      assert.equal(this.listView.element, this.container);
    });

    test('Listens to ObservableArray', function() {
      var addEventListener = this.observableArray.addEventListener;
      assert.ok(addEventListener.calledWith('insert'));
      assert.ok(addEventListener.calledWith('remove'));
      assert.ok(addEventListener.calledWith('replace'));
      assert.ok(addEventListener.calledWith('reset'));
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
          var withNew = this.ObservableArray.withArgs(this.array);
          assert.ok(withNew.called);
          var addEventListener = withNew.returnValues[0].addEventListener;
          assert.ok(addEventListener.calledWith('insert'));
          assert.ok(addEventListener.calledWith('remove'));
          assert.ok(addEventListener.calledWith('replace'));
          assert.ok(addEventListener.calledWith('reset'));
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
              for (var i = 0; i < this.container.children.length; i++) {
                assert.equal(this.container.children[i], 
                  this.originalElements[i]);
              }
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
      this.listView = this.ListView(
        this.container, this.observableArray, this.template
      );
    });

    test('.element', function() {
      assert.equal(this.listView.element, this.container);
    });

    test('Listens to ObservableArray', function() {
      var addEventListener = this.observableArray.addEventListener;
      assert.ok(addEventListener.calledWith('insert'));
      assert.ok(addEventListener.calledWith('remove'));
      assert.ok(addEventListener.calledWith('replace'));
      assert.ok(addEventListener.calledWith('reset'));
    });

    test('Initial Element doesnt recycle', function() {
      var item = this.array[0];
      var filtered = this.template.withArgs(item);
      // ensures that if there happens to be an element in the creation
      // of the ListView, it is not used as a "recycled" element
      assert.ok(filtered.callCount, 1);
      assert.equal(filtered.args[0][1], undefined);
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

  suite('observable hooks', function() {
    setup(function() {
      this.observable = this.Observable({ test: 1 });
      this.observableArray = this.ObservableArray([this.observable]);
      this.hook = this.sinon.spy();
      this.template = (function(data, recycle, helper) {
        helper.observeAndCall(data, {
          test: this.hook
        });
        return recycle || document.createElement('li');
      }).bind(this);
      this.container = document.createElement('ul');
      this.sinon.spy(this, 'template');
      this.listView = this.ListView(
        this.container, this.observableArray, this.template
      );
    });

    test('hook called at creation', function() {
      assert.equal(this.hook.callCount, 1);
    });

    test('hook called when observable changes', function() {
      this.hook.reset();
      this.observable.test = false;
      assert.equal(this.hook.callCount, 1);
    });

    test('unobserves when removing', function() {
      this.sinon.spy(this.observable, 'unobserve');
      this.observableArray.splice(0, 1);
      assert.ok(this.observable.unobserve.calledWith(this.hook));
    });

    test('unobserves when replacing', function() {
      this.sinon.spy(this.observable, 'unobserve');
      this.sinon.spy(this.observable, 'observe');
      this.observableArray.set(0, this.observable);
      // should unobserve
      assert.ok(this.observable.unobserve.calledWith(this.hook));
      // and also observe
      assert.ok(this.observable.observe.calledWith('test', this.hook));
      // but should unobserve first
      assert.ok(
        this.observable.unobserve.calledBefore(this.observable.observe)
      );
    });
  });

  suite('destroy', function() {
    setup(function() {
      this.observableArray = this.ObservableArray([1, 2, 3]);
      this.container = document.createElement('div');
      this.listView = this.ListView(
        this.container, this.observableArray, function() {
          return document.createElement('div');
        }
      );
    });

    test('removes children', function() {
      this.listView.destroy();
      assert.equal(this.container.children.length, 0);
    });

    test('sanity check', function() {
      assert.equal(this.observableArray.removeEventListener.callCount, 0);
      assert.equal(this.container.children.length, 3);
    });

    test('.element', function() {
      this.listView.destroy();
      assert.equal(this.listView.element, null);
    });

    test('unbinds from observeable', function() {
      this.listView.destroy();
      // called call removeEventListener with a method
      ['insert', 'remove', 'replace', 'reset'].forEach((eventName, index) => {
        assert.isTrue(
          this.observableArray.removeEventListener.calledWith(eventName));
        assert.isFunction(
          this.observableArray.removeEventListener.args[index][1]);
      });
    });

    test('creating another ListView destroys old', function() {
      this.observableArray.reset();
      this.sinon.spy(this.listView, 'destroy');
      // create a new one, we don't care about what happens to it.
      this.ListView(
        this.container, this.observableArray, function() {
          return document.createElement('div');
        }
      );

      // destroys old view
      assert.ok(this.listView.destroy.called);
      // unbinds from observable
      assert.ok(this.observableArray.removeEventListener.called);
      // re-observes
      assert.ok(this.observableArray.removeEventListener.called);
      // and make sure its done in the right order
      assert.ok(
        this.observableArray.removeEventListener.calledBefore(
          this.observableArray.removeEventListener
        )
      );
    });
  });
});
