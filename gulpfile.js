// Include gulp
var gulp = require('gulp');
var PluginError = require('plugin-error');

// Include Plugins
var concat = require('gulp-concat');
var rename = require('gulp-rename');
var download = require('gulp-downloader');
var wrap = require('gulp-wrap');
var ghPages = require('gulp-gh-pages-gift');
var jsoncombine = require("gulp-jsoncombine");
var minify = require('gulp-minify-css');
var webpack = require('webpack-stream');
var through2 = require('through2')
var gutil = require('gulp-util'); 

var path = require('path')

// Google Analytics Task
gulp.task('ga', function () {
  return download('https://www.google-analytics.com/analytics.js')
    .pipe(gulp.dest('dist/js'));
});

gulp.task('css', function () {
  return gulp.src(['css/tooltip.css', 'css/hamburger.css', 'css/spinner.css', 'node_modules/wingcss/dist/wing.css'])
    .pipe(concat('bundle.css'))
    .pipe(gulp.dest('dist/css'))
    .pipe(rename('bundle.min.css'))
    .pipe(minify({keepBreaks: true}))
    .pipe(gulp.dest('dist/css'));
});

// Insipired to gulp-handlebars but with some changes
function handlebarsPlugin() {
  var handlebars = require('handlebars');
  var compilerOptions = {}

  return through2.obj(function(file, enc, callback) {
    if (file.isNull()) {
      return callback(null, file);
    }

    if (file.isStream()) {
      this.emit('error', new PluginError("Handlebars plugin", 'Streaming not supported'));
      return callback();
    }

    var contents = file.contents.toString();
    var compiled = null;
    try {
      compiled = handlebars.precompile(
        handlebars.parse(contents),
        compilerOptions
        ).toString();
    } catch (err) {
      this.emit('error', new PluginError("Handlebars plugin", err, {
        fileName: file.path
      }));
      return callback();
    }

    file.contents = new Buffer(compiled);
    file.templatePath = file.relative;
    file.path = gutil.replaceExtension(file.path, '.js'); 

    callback(null, file);
  });
};


// Compile handlebars templates and put in js directory
gulp.task('handlebars', function () {
  // Load templates from the templates/ folder relative to where gulp was executed
  return gulp.src(['templates/**/*', 'templates/**/.*'])
    // Compile each Handlebars template source file to a template function
    .pipe(handlebarsPlugin()) // Load out handlebars version
    // Wrap each template function in a call to Handlebars.template and export it
    .pipe(wrap('exp[\'<%= file.templatePath %>\'] = Handlebars.template(<%= contents %>)'))
    // Concatenate down to a single file
    .pipe(concat('templates.js'))
    // Add the Handlebars module in the final output
    .pipe(wrap('var Handlebars = require("handlebars/runtime");\nlet isBrowser = new Function("try {return this===window;}catch(e){ return false;}");\n let exp = (isBrowser()) ? exports : module.exports\n<%= contents %>'))
    // WRite the output into the templates folder
    .pipe(gulp.dest('src/gen'));
});

// Assemble the metadata and put in js directory
gulp.task('metadata', function () {
  return gulp.src("metadata/*.json")
    .pipe(jsoncombine("metadata.json", function (data) {
      return new Buffer(JSON.stringify(data));
    }))
    .pipe(gulp.dest("src/gen"));
});

gulp.task('blobs', function() {
  return gulp.src('blobs/**/*')
    .pipe(gulp.dest('dist/blobs'))
})

gulp.task('build', ['ga', 'css', 'handlebars', 'metadata', 'blobs'], function(){
  return gulp.src('src/web_entrypoint.js')
  .pipe(webpack( require('./webpack.config.js') ))
  .pipe(gulp.dest('dist/js'));
});

// Default Task
gulp.task('default', ['build']);

gulp.task('build-cli', ['handlebars', 'metadata']);

// Deploy to gh-pages
gulp.task('deploy', ['build'], function () {
  return gulp.src('dist/**/*')
    .pipe(ghPages({
      push: true
    }));
});
