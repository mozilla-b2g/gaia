require('/shared/js/media/downsample.js');
requireApp('wallpaper/js/pick.js');

suite('wallpaper/pick', function() {
  var fakeWallpapersContainer;

  setup(function() {
    fakeWallpapersContainer = document.createElement('div');
    fakeWallpapersContainer.id = 'wallpapers';
    document.body.appendChild(fakeWallpapersContainer);
  });

  teardown(function() {
    fakeWallpapersContainer.parentNode.removeChild(fakeWallpapersContainer);
  });

  test('generateWallpaperList', function(done) {
    var prefix =
    Wallpaper.wallpapersUrl = '/test/unit/list_test.json';
    Wallpaper.init();
    Wallpaper.generateWallpaperList(function() {
      done(function() {
        var wallpapers = document.getElementById('wallpapers');
        assert.equal(2, wallpapers.children.length);
        assert.equal('resources/test_1.png',
          wallpapers.children[0].dataset.filename);
        assert.equal('resources/test_2.png',
          wallpapers.children[1].dataset.filename);
      });
    });
  });
});
