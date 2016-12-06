const gulp = require('gulp');
const ts = require('gulp-typescript');
const sourcemaps = require('gulp-sourcemaps');
const path = require('path');
const browserify = require('browserify');
const source = require('vinyl-source-stream');


const tsProject = ts.createProject('tsconfig.json');

const SRC_DIR = 'src';
const SRC_TS_FILES = [path.join(SRC_DIR, '**', '*.ts')];
const SRC_OTHER_FILES = [
  path.join(SRC_DIR, '**'),
  '!' + SRC_TS_FILES[0]
];

gulp.task('build.js', () => {
  return gulp.src(SRC_TS_FILES)
    .pipe(sourcemaps.init())
    .pipe(tsProject())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('dist'));
});

gulp.task('browserify', ['build.js'], function() {
  return browserify('dist/app.js')
    .bundle()
    .pipe(source('app.js'))
    .pipe(gulp.dest('dist'));
});

gulp.task('build.html', () => {
  return gulp.src(SRC_OTHER_FILES)
    .pipe(gulp.dest('dist'));
});


gulp.task('watch', ['build.js', 'build.html', 'browserify'], () => {
  gulp.watch(path.join(SRC_DIR, '**'), ['build.js', 'build.html', 'browserify']);
});

