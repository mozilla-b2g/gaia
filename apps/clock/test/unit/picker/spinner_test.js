mocha.setup({ globals: ['GestureDetector'] });

suite('Spinner', function() {
  'use strict';

  var Spinner, Template, GestureDetector;
  var _clientHeight;
  var VALUE_ELEMENT_HEIGHT = 20;

  suiteSetup(function(done) {

    // override native clientHeight
    _clientHeight = Object.getOwnPropertyDescriptor(
      Element.prototype, 'clientHeight');
    Object.defineProperty(Element.prototype, 'clientHeight', {
      configurable: true,
      enumerable: true,
      get: function clockTestClientHeightStub() {
        if (this.classList.contains('picker-unit')) {
          return VALUE_ELEMENT_HEIGHT;
        }
        return _clientHeight.get.call(this);
      }
    });

    testRequire([
        'picker/spinner',
        'mocks/mock_shared/js/template',
        'mocks/mock_shared/js/gesture_detector'
      ], {
        mocks: [
          'shared/js/template',
          'shared/js/gesture_detector'
        ]
      }, function(spinner, mockTemplate, mockGD) {
        Spinner = spinner;
        Template = mockTemplate;
        GestureDetector = mockGD;
        done();
      });
  });

  suiteTeardown(function() {
    Object.defineProperty(Element.prototype, 'clientHeight', _clientHeight);
  });

  setup(function() {
    VALUE_ELEMENT_HEIGHT = 20;
    loadBodyHTML('/index.html');
    this.container = document.createElement('div');
    this.container.classList.add('test-spinner-container');
    this.element = document.createElement('div');
    this.element.classList.add('test-spinner-element');
    this.container.appendChild(this.element);
    document.body.appendChild(this.container);
    this.clock = this.sinon.useFakeTimers();
  });

  function checkTranslate(value) {
    test('Checking translate is ' + value, function() {
      assert.equal(this.element.style.transform,
        'translateY(' + value + 'px)');
      assert.equal(this.spinner.top, value);
    });
  }

  function checkIndex(index) {
    test('Checking index is ' + index, function() {
      assert.equal(this.spinner.index, index);
      assert.equal(this.spinner.value, this.spinner.values[index]);
    });
  }

  function checkCreation() {
    test('Started GestureDetector', function() {
      assert.ok(GestureDetector.calledWith(this.container));
      assert.ok(GestureDetector.thisValues[0].startDetecting.called);
    });
    test('Interpolated each value', function() {
      var interpolate = this.spinner.template.interpolate;
      this.spinner.values.forEach(function(value, index) {
        assert.equal(interpolate.args[index][0].unit, value + '',
          'unit value for value # ' + index);
      });
    });
    test('Created .picker-unit elements', function() {
      assert.equal(this.element.querySelectorAll('.picker-unit').length,
        this.spinner.values.length);
    });
    test('Unit Size', function() {
      assert.equal(this.spinner.unitHeight, VALUE_ELEMENT_HEIGHT);
    });
    checkTranslate(0);
    checkIndex(0);
  }

  suite('values: [0, 1, 2]', function() {
    setup(function() {
      this.spinner = new Spinner({
        element: this.element,
        values: [0, 1, 2]
      });
    });
    checkCreation();
    suite('select option 2', function() {
      setup(function() {
        this.spinner.select(2);
      });
      checkTranslate(-40);
      checkIndex(2);
    });
    suite('select option 3 (out of range)', function() {
      setup(function() {
        this.spinner.select(3);
      });
      checkTranslate(-40);
      checkIndex(2);
    });
    suite('set value 2', function() {
      setup(function() {
        this.spinner.value = 2;
      });
      checkTranslate(-40);
      checkIndex(2);
    });
    suite('set value out of range', function() {
      setup(function() {
        this.spinner.value = 'nope';
      });
      checkTranslate(0);
      checkIndex(0);
    });
    suite('touchstart', function() {
      setup(function() {
        this.event = new CustomEvent('touchstart', {
          cancelable: true,
          bubbles: true
        });
        this.element.dispatchEvent(this.event);
      });
      test('default is prevented', function() {
        assert.ok(this.event.defaultPrevented);
      });
    });
    suite('pan down by 15px over 1 second', function() {
      setup(function() {
        var event = new CustomEvent('pan', {
          detail: {
            position: {
              clientY: 0,
              timeStamp: 0
            }
          },
          bubbles: true
        });
        this.container.dispatchEvent(event);
        var event = new CustomEvent('pan', {
          detail: {
            position: {
              clientY: 15,
              timeStamp: 1000
            }
          },
          bubbles: true
        });
        this.container.dispatchEvent(event);
      });
      // top should still be at zero, can't go "down" in the spinner
      checkTranslate(0);
    });
    suite('pan up by 15px over 1 second', function() {
      setup(function() {
        var event = new CustomEvent('pan', {
          detail: {
            position: {
              clientY: 15,
              timeStamp: 0
            }
          },
          bubbles: true
        });
        this.container.dispatchEvent(event);
        var event = new CustomEvent('pan', {
          detail: {
            position: {
              clientY: 0,
              timeStamp: 1000
            }
          },
          bubbles: true
        });
        this.container.dispatchEvent(event);
      });
      checkTranslate(-15);
      checkIndex(1);
      suite('pan finished w/ low (therefore zero) momentum', function() {
        setup(function() {
          var event = new CustomEvent('swipe', {
            bubbles: true
          });
          this.container.dispatchEvent(event);
        });
        checkTranslate(-20);
        checkIndex(1);
        test('animation-on', function() {
          assert.ok(this.element.classList.contains('animation-on'));
        });
      });
    });
  });

  suite('values: [0...30]', function() {
    setup(function() {
      this.spinner = new Spinner({
        element: this.element,
        values: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
          17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]
      });
    });
    checkCreation();
    suite('pan up by 35px over 70ms', function() {
      setup(function() {
        var event = new CustomEvent('pan', {
          detail: {
            position: {
              clientY: 35,
              timeStamp: 0
            }
          },
          bubbles: true
        });
        this.container.dispatchEvent(event);
        var event = new CustomEvent('pan', {
          detail: {
            position: {
              clientY: 0,
              timeStamp: 70
            }
          },
          bubbles: true
        });
        this.container.dispatchEvent(event);
      });
      checkTranslate(-35);
      checkIndex(2);
      suite('pan finished w/ momentum', function() {
        setup(function() {
          var event = new CustomEvent('swipe', {
            bubbles: true
          });
          this.container.dispatchEvent(event);
        });
        checkTranslate(-200);
        checkIndex(10);
        test('animation-on', function() {
          assert.ok(this.element.classList.contains('animation-on'));
        });
      });
      suite('pan times out', function() {
        setup(function() {
          this.clock.tick(201);
        });
        checkTranslate(-40);
        checkIndex(2);
        test('animation-on', function() {
          assert.ok(this.element.classList.contains('animation-on'));
        });
      });
    });
    suite('pan up by 100px over 1ms', function() {
      setup(function() {
        var event = new CustomEvent('pan', {
          detail: {
            position: {
              clientY: 100,
              timeStamp: 0
            }
          },
          bubbles: true
        });
        this.container.dispatchEvent(event);
        var event = new CustomEvent('pan', {
          detail: {
            position: {
              clientY: 0,
              timeStamp: 1
            }
          },
          bubbles: true
        });
        this.container.dispatchEvent(event);
      });
      checkTranslate(-100);
      checkIndex(5);
      suite('pan finished w/ insane momentum', function() {
        setup(function() {
          var event = new CustomEvent('swipe', {
            bubbles: true
          });
          this.container.dispatchEvent(event);
        });
        checkTranslate(-400);
        checkIndex(20);
        test('animation-on', function() {
          assert.ok(this.element.classList.contains('animation-on'));
        });
        suite('start pan', function() {
          setup(function() {
            var event = new CustomEvent('pan', {
              detail: {
                position: {
                  clientY: 0,
                  timeStamp: 0
                }
              },
              bubbles: true
            });
            this.container.dispatchEvent(event);
          });
          test('animation-on removed', function() {
            assert.isFalse(
              this.element.classList.contains('animation-on'));
          });
          suite('finish pan down 20px over 100ms', function() {
            // this is a smaller scale pan, moving one unit per 100ms
            setup(function() {
              var event = new CustomEvent('pan', {
                detail: {
                  position: {
                    clientY: 20,
                    timeStamp: 100
                  }
                },
                bubbles: true
              });
              this.container.dispatchEvent(event);
              event = new CustomEvent('swipe', {
                bubbles: true
              });
              this.container.dispatchEvent(event);
            });
            // total difference = 4, 1 moved + 3 inertia
            checkTranslate(-320);
            checkIndex(16);
          });
        });
      });
      suite('pan times out', function() {
        setup(function() {
          this.clock.tick(201);
        });
        checkTranslate(-100);
        checkIndex(5);
        test('animation-on', function() {
          assert.ok(this.element.classList.contains('animation-on'));
        });
      });
    });
  });
  suite('values: [0...30] - big elements', function() {
    // results should have same index, as previous test,
    // but double the px values for translates and motion because of bigger
    // elements
    setup(function() {
      VALUE_ELEMENT_HEIGHT = 40;
      this.spinner = new Spinner({
        element: this.element,
        values: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
          17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]
      });
    });
    checkCreation();
    suite('pan up by 70px over 70ms', function() {
      setup(function() {
        var event = new CustomEvent('pan', {
          detail: {
            position: {
              clientY: 70,
              timeStamp: 0
            }
          },
          bubbles: true
        });
        this.container.dispatchEvent(event);
        var event = new CustomEvent('pan', {
          detail: {
            position: {
              clientY: 0,
              timeStamp: 70
            }
          },
          bubbles: true
        });
        this.container.dispatchEvent(event);
      });
      checkTranslate(-70);
      checkIndex(2);
      suite('pan finished w/ momentum', function() {
        setup(function() {
          var event = new CustomEvent('swipe', {
            bubbles: true
          });
          this.container.dispatchEvent(event);
        });
        checkTranslate(-400);
        checkIndex(10);
        test('animation-on', function() {
          assert.ok(this.element.classList.contains('animation-on'));
        });
      });
    });
  });
});
