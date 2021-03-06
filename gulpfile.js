// JSHint stuffs:
/* global console: false, __dirname: false */

/*========================================
=            Requiring stuffs            =
========================================*/

var gulp              = require('gulp'),
    concat            = require('gulp-concat'),
    connect           = require('gulp-connect'),
    cssmin            = require('gulp-cssmin'),
    del               = require('del'),
    jshint            = require('gulp-jshint'),
    less              = require('gulp-less'),
    mobilizer         = require('gulp-mobilizer'),
    path              = require('path'),
    protractor        = require('gulp-protractor').protractor,
    releaseTasks      = require('gulp-release-tasks'),
    rename            = require('gulp-rename'),
    os                = require('os'),
    seq               = require('run-sequence'),
    sourcemaps        = require('gulp-sourcemaps'),
    uglify            = require('gulp-uglify'),
    docgen            = require('./docs/docgen');

var exitConnect = function() {
  connect.serverClose();
};

/*=============================
=            Globs            =
=============================*/

var GLOBS = {};
GLOBS.core                  = ['bower_components/fastclick/lib/fastclick.js', 'src/js/core/**/*.js', 'src/js/mobile-angular-ui.core.js'];
GLOBS.components            = ['bower_components/overthrow/src/overthrow-detect.js', 'bower_components/overthrow/src/overthrow-init.js', 'bower_components/overthrow/src/overthrow-polyfill.js', 'src/js/components/**/*.js', 'src/js/mobile-angular-ui.components.js'];
GLOBS.gestures              = ['src/js/gestures/**/*.js', 'src/js/mobile-angular-ui.gestures.js'];
GLOBS.migrate               = ['src/js/migrate/**/*.js', 'src/js/mobile-angular-ui.migrate.js'];
GLOBS.main                  = GLOBS.core.concat(GLOBS.components).concat('src/js/mobile-angular-ui.js');
GLOBS.fonts                 = 'bower_components/font-awesome/fonts/fontawesome-webfont.*';
GLOBS.vendorLess            = [ path.resolve(__dirname, 'src/less'), path.resolve(__dirname, 'bower_components') ];
GLOBS.livereloadDemo        = [ path.join('demo', '*.html') ];
GLOBS.livereloadTest        = [ path.join('test', '**', '*.html') ];
GLOBS.livereloadTestManual  = [ path.join('test', 'manual', '*.html') ];
GLOBS.livereloadTestMigrate = [ path.join('test', 'migrate', '*.html') ];

/*================================================
=            Report Errors to Console            =
================================================*/

gulp.on('error', function(e) {
  throw(e);
});


/*=========================================
=            Clean dest folder            =
=========================================*/

gulp.task('clean', function (cb) {
  del(['dist/**'], cb);
});

/*==========================================
=            Web servers                   =
==========================================*/

gulp.task('connect', function() {
  connect.server({
    host: '0.0.0.0',
    port: 3000,
    livereload: true
  });
});

gulp.task('connect:test', function() {
  var middleware = require('./test/server');
  connect.server({
    host: '0.0.0.0',
    port: 3001,
    middleware: function(connect, opt) {
      return [middleware];
    }
  })
});

/*==============================================================
=            Setup live reloading on source changes            =
==============================================================*/

gulp.task('livereload:demo', function () {
  return gulp.src(GLOBS.livereloadDemo)
    .pipe(connect.reload());
});

gulp.task('livereload:test', function () {
  return gulp.src(GLOBS.livereloadTest)
    .pipe(connect.reload());
});

gulp.task('livereload:test:manual', function () {
  return gulp.src(GLOBS.livereloadTestManual)
    .pipe(connect.reload());
});

gulp.task('livereload:test:migrate', function () {
  return gulp.src(GLOBS.livereloadTestMigrate)
    .pipe(connect.reload());
});

/*==================================
=            Copy fonts            =
==================================*/

gulp.task('fonts', function() {
  return gulp.src(GLOBS.fonts)
  .pipe(gulp.dest(path.join('dist', 'fonts')));
});

/*======================================================================
=            Compile, minify, mobilize less                            =
======================================================================*/

var CSS_TEMP_DIR = path.join(os.tmpdir(), 'mobile-angular-ui', 'css');

gulp.task('css:less', function () {
  var stream = gulp.src([
      'src/less/mobile-angular-ui-base.less', 
      'src/less/mobile-angular-ui-desktop.less',
      'src/less/mobile-angular-ui-migrate.less',
      'src/less/sm-grid.less'
    ])
    .pipe(less({paths: GLOBS.vendorLess}))  
    .pipe(mobilizer('mobile-angular-ui-base.css', {
      'mobile-angular-ui-base.css': { hover: 'exclude', screens: ['0px'] },
      'mobile-angular-ui-hover.css': { hover: 'only', screens: ['0px'] }
    }))
    .pipe(gulp.dest(CSS_TEMP_DIR));
});

gulp.task('css:concat', function() {
  return gulp.src([
    path.join(CSS_TEMP_DIR, 'sm-grid.css'),
    path.join(CSS_TEMP_DIR, 'mobile-angular-ui-base.css')
  ])
  .pipe(concat('mobile-angular-ui-base.css'))
  .pipe(gulp.dest(path.join('dist', 'css')));
});

gulp.task('css:copy', function() {
  return gulp.src([
    path.join(CSS_TEMP_DIR, 'mobile-angular-ui-hover.css'),
    path.join(CSS_TEMP_DIR, 'mobile-angular-ui-migrate.css'),
    path.join(CSS_TEMP_DIR, 'mobile-angular-ui-desktop.css')
  ])
  .pipe(gulp.dest(path.join('dist', 'css')));
});

gulp.task('css:minify', function() {
  return gulp.src(path.join('dist', 'css', '*.css'))
    .pipe(cssmin())
    .pipe(rename({suffix: '.min'}))
    .pipe(gulp.dest(path.join('dist', 'css')));
});

gulp.task('css', function(done) {
  seq('css:less', 'css:concat', 'css:copy', 'css:minify', done);
});

/*====================================================================
=            Compile and minify js generating source maps            =
====================================================================*/

var compileJs = function(dest, src) {
  return gulp.src(src)
    .pipe(sourcemaps.init())
    .pipe(concat(dest))
    .pipe(gulp.dest(path.join('dist', 'js')))
    .pipe(uglify())
    .pipe(rename({suffix: '.min'}))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(path.join('dist', 'js')));
};

gulp.task('js:core',  function() {
  return compileJs('mobile-angular-ui.core.js', GLOBS.core);
});

gulp.task('js:migrate',  function() {
  return compileJs('mobile-angular-ui.migrate.js', GLOBS.migrate);
});

gulp.task('js:gestures',  function() {
  return compileJs('mobile-angular-ui.gestures.js', GLOBS.gestures);
});

gulp.task('js:main',  function() {
  return compileJs('mobile-angular-ui.js', GLOBS.main);
});

gulp.task('js', ['js:main', 'js:gestures', 'js:migrate', 'js:core']);

/*===================================================================
=            Watch for source changes and rebuild/reload            =
===================================================================*/

gulp.task('watch', function () {
  gulp.watch(GLOBS.livereloadDemo.concat('dist/**/*'), ['livereload:demo']);
  gulp.watch(GLOBS.livereloadTest.concat('dist/**/*'), ['livereload:test']);
  gulp.watch(GLOBS.livereloadTestManual.concat('dist/**/*'), ['livereload:test:manual']);
  gulp.watch(GLOBS.livereloadTestMigrate.concat('dist/**/*'), ['livereload:test:migrate']);

  gulp.watch(['./src/less/**/*'], ['css']);

  ['core', 'gestures', 'migrate', 'main'].forEach(function(target) {
    gulp.watch(GLOBS[target], ['js:' + target]);
  });

  gulp.watch(GLOBS.fonts, ['fonts']);  
});

/*======================================
=            Build Sequence            =
======================================*/

gulp.task('build', function(done) {
  seq('clean', ['fonts', 'css',  'js'], done);
});

/*====================================
=            Default Task            =
====================================*/

gulp.task('default', function(done){
  var tasks = [];

  tasks.push('connect');
  tasks.push('watch');
  
  seq('build', tasks, done);
});

/*==============================
=            JSHint            =
==============================*/

gulp.task('jshint', function() {
  return gulp.src(['src/js/*.js', 'src/js/core/*.js','src/js/gestures/*.js','src/js/components/*.js'])
  .pipe(jshint())
  .pipe(jshint.reporter('default'))
  .on('error', function(e) { throw e });
});

/*=============================
=            Tests            =
=============================*/

function makeTestTask(name, conf, args) {
  var protractorArgs = ['--baseUrl', 'http://localhost:3001']
                  .concat(args || [])
                  .concat(process.argv.length > 2 ? 
                    process.argv.slice(3, process.argv.length) : []);

  gulp.task(name, ['jshint', 'connect:test'], function(){
    return gulp.src('use_config_specs')
        .pipe(protractor({
            configFile: conf,
            args: protractorArgs
        })) 
        .on('end', exitConnect)
        .on('error', exitConnect);
  });
}

makeTestTask('test', 'test/all.conf.js');
makeTestTask('test:chrome', 'test/chrome.conf.js');
makeTestTask('test:firefox', 'test/firefox.conf.js');

/*============================
=            Docs            =
============================*/

gulp.task('docs', function(done) {
  del(['docs/api/**'], function() {
    docgen('src/js', {
        outputTree: true 
      })
      .pipe(gulp.dest('docs/api'))
      .on('end', done);    
  });
});

/*===============================
=            Release            =
===============================*/

releaseTasks(gulp);