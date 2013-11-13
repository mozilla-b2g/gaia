/**
 * Tests for slideshow.js
 */
requireApp('gallery/js/slideshow.js');

suite('Slideshow test', function() {
  test('get next slides', function() {
    SlideShow.slides = [0, 1, 2, 3];

    var tests = [
      [3, 0, 1, 2],
      [2, 3, 0, 1],
      [1, 2, 3, 0],
      [0, 1, 2, 3]
    ];

    for (var t = 0; t < tests.length; t++) {
      SlideShow.slideIndex = t;
      assert.equal(SlideShow.nextSlides().toString(),
        tests[t].toString());
    }
  });

  test('get next index', function() {
    var tests = [
      {
        array: [2, 1, 4, 3],
        startIndex: 3,
        nextIndex: 0
      },
      {
        array: [3, 4, 5, 6],
        startIndex: 2,
        nextIndex: 3
      }
    ];
    for (var t = 0; t < tests.length; t++) {
      var test = tests[t];
      assert.equal(
        SlideShow.nextIndex(test.array, test.startIndex),
        test.nextIndex);
    }
  });
});
