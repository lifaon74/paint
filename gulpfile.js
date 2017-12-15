const gulp = require('gulp');
const gutil = require('gulp-util');
const ts = require('gulp-typescript');
const sourcemaps = require('gulp-sourcemaps');
const path = require('path');
const browserify = require('browserify');
const source = require('vinyl-source-stream');


const tsProject = ts.createProject('tsconfig.json');

const SRC_DIR = 'src/v3';
const SRC_TS_FILES = [path.join(SRC_DIR, '**', '*.ts')];
const SRC_OTHER_FILES = [
  path.join(SRC_DIR, '**'),
  path.join(SRC_DIR, '../assets', '**'),
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
    .on('error', gutil.log)
    .pipe(source('app.bundled.js'))
    .pipe(gulp.dest('dist'));
});

gulp.task('browserify-worker', ['build.js'], function() {
  return browserify('dist/classes/compositing/compositing.worker.js')
    .bundle()
    .on('error', gutil.log)
    .pipe(source('compositing.worker.js'))
    .pipe(gulp.dest('dist/classes'));
});

gulp.task('build.html', () => {
  return gulp.src(SRC_OTHER_FILES)
    .pipe(gulp.dest('dist'));
});


const watchTasks =[
  'build.js', 'build.html',
  'browserify',
  // 'browserify-worker'
];

gulp.task('watch', watchTasks, () => {
  gulp.watch(path.join(SRC_DIR, '**'), watchTasks);
});

