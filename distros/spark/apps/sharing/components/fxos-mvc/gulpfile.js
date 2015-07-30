var gulp = require('gulp');
var merge = require('gulp-merge');
var concat = require('gulp-concat');
var wrapper = require('gulp-wrapper');
var to5 = require('gulp-6to5');

/**
 * converts javascript to es5.
 */
gulp.task('to5', function () {
	try {
		return merge(
				gulp
					.src([
						'./node_modules/observe-shim/lib/observe-shim.js',
						'./node_modules/observe-utils/lib/observe-utils.js'
					])
					.pipe(concat('shim.js')),
				gulp
					.src([
						'./node_modules/sanitizer/sanitizer.js'
					])
					.pipe(wrapper({
						header: '(function(){var define,exports;',
						footer: '})(window);'
					}))
					.pipe(concat('deps.js')),
				gulp
					.src('./mvc.js')
					.pipe(to5({
							modules: 'amd'
						}).on('error', function(e) {
							console.log('error running 6to5', e);
						})
					)
			)
			.pipe(concat('mvc.js'))
			.pipe(gulp.dest('./dist/'));
	}  catch(e) {
		console.log('Got error in 6to5', e);
	}
});

gulp.task('default', ['to5']);
