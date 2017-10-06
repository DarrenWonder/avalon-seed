var fs = require('fs');
var path = require('path');

var gulp = require('gulp');
var plugins = require('gulp-load-plugins');
var requirejs = require('requirejs');
var browserSync = require('browser-sync');
var $ = plugins();
var config = require('./config');
var autoprefixer = require('autoprefixer');
var cssnano = require('cssnano');
var glob = require('glob');
var map = require('map-stream');
var runSequence = require('run-sequence');    // Temporary solution until gulp 4
                                              // https://github.com/gulpjs/gulp/issues/355

var pkg = require('./package.json');
var env = process.env.NODE_ENV || 'development';
var reload = browserSync.reload;
// ---------------------------------------------------------------------
// | Helper tasks                                                      |
// ---------------------------------------------------------------------

gulp.task('archive:create_archive_dir', function () {
    fs.mkdirSync(path.resolve(dirs.archive), '0755');
});

gulp.task('archive:zip', function (done) {

    var archiveName = path.resolve(dirs.archive, pkg.name + '_v' + pkg.version + '.zip');
    var archiver = require('archiver')('zip');
    var files = require('glob').sync('**/*.*', {
        'cwd': dirs.dist,
        'dot': true // include hidden files
    });
    var output = fs.createWriteStream(archiveName);

    archiver.on('error', function (error) {
        done();
        throw error;
    });

    output.on('close', done);

    files.forEach(function (file) {

        var filePath = path.resolve(dirs.dist, file);

        // `archiver.bulk` does not maintain the file
        // permissions, so we need to add files individually
        archiver.append(fs.createReadStream(filePath), {
            'name': file,
            'mode': fs.statSync(filePath)
        });

    });

    archiver.pipe(output);
    archiver.finalize();

});

gulp.task('clean', function (done) {
    var dirs = ['.tmp'];
    for (var k in config) {
        dirs.push(config[k].outDir);
    }
    return require('del')(dirs);
});

gulp.task('styles', function () {
    const AUTOPREFIXER_BROWSERS = [
        'ie >= 8',
        'ie_mob >= 10',
        'ff >= 30',
        'chrome >= 34',
        'safari >= 7',
        'opera >= 23',
        'ios >= 7',
        'android >= 4.4',
        'bb >= 10'
    ];

    // For best performance, don't add Sass partials to `gulp.src`
    return gulp.src([
        'src/styles/**/*.scss'
    ])
        .pipe($.newer('.tmp/styles'))
        .pipe($.sourcemaps.init())
        .pipe($.sass({
            precision: 10
        }).on('error', $.sass.logError))
        .pipe($.postcss([autoprefixer({
            browsers: AUTOPREFIXER_BROWSERS
        }), cssnano()]))
        .pipe($.size({title: 'styles'}))
        .pipe($.sourcemaps.write('./'))
        .pipe(gulp.dest('.tmp/styles'));
});

gulp.task('styles:dev', function () {
    const AUTOPREFIXER_BROWSERS = [
        'ie >= 8',
        'ie_mob >= 10',
        'ff >= 30',
        'chrome >= 34',
        'safari >= 7',
        'opera >= 23',
        'ios >= 7',
        'android >= 4.4',
        'bb >= 10'
    ];

    // For best performance, don't add Sass partials to `gulp.src`
    return gulp.src([
        'src/styles/**/*.scss'
    ])
        .pipe($.newer('.tmp/styles'))
        .pipe($.sourcemaps.init())
        .pipe($.sass({
            precision: 10
        }).on('error', $.sass.logError))
        .pipe($.postcss([autoprefixer({
            browsers: AUTOPREFIXER_BROWSERS
        })]))
        .pipe($.size({title: 'styles'}))
        .pipe($.sourcemaps.write('./'))
        .pipe(gulp.dest( config.development.outDir + '/styles'));
});

gulp.task('scripts', function (done) {
    glob('src/views/*.html', function (err, files) {
        var modules = [];
        files.forEach(function (i) {
            var name = path.basename(i, '.html');
            if (fs.existsSync('src/js/'+name+'.js')) {
                modules.push({
                    name: name
                })
            }
        });
        requirejs.optimize({
            appDir: './src/js',
            baseUrl: '.',
            dir: '.tmp/scripts',
            generateSourceMaps: false,
            paths: {
                avalon: 'vendor/avalon',
                domReady: 'vendor/domReady'
            },
            modules: modules
        }, function (res) {
            gulp.src('.tmp/scripts/**/*.js')
            .pipe($.newer(config[env].outDir + '/scripts'))
            // Output files
            .pipe($.size({title: 'scripts'}))
            .pipe(gulp.dest( config[env].outDir + '/scripts'));
            done()
        })
    });
});

gulp.task('copy', function () {
    return gulp.src([
        'src/deps/*'
    ]).pipe(gulp.dest(config[env].outDir))
        .pipe($.size({title: 'copy'}))
});

// Lint JavaScript
gulp.task('lint', function () {
   return gulp.src(['src/js/**/*.js','!node_modules/**', '!src/js/vendor/**/*.js'])
        .pipe($.eslint())
        .pipe($.eslint.format())
        .pipe($.if(!browserSync.active, $.eslint.failAfterError()))
});

// Optimize images
gulp.task('images', function () {
   return gulp.src('src/images/**/*')
        .pipe($.cache($.imagemin({
            progressive: true,
            interlaced: true
        })))
        .pipe(gulp.dest(  config[env].outDir + '/images'))
        .pipe($.size({title: 'images'}))
});

gulp.task('html', function () {
    // var config = {
    //     css:  config[env].outDir + '/syles/main.css',
    //     js: {
    //         src: [ config[env].outDir + '/vendor/require.js',  config[env].outDir],
    //         tpl: '<script src="%s" data-main="%s" defer async="true" ></script>'
    //     }
    // }
   return gulp.src('src/views/*.html')
       .pipe(map(function (file, done) {
           done(null, file);
       }))
       .pipe($.if('*.html', $.htmlmin({
           removeComments: true,
           collapseWhitespace: true,
           collapseBooleanAttributes: true,
           removeAttributeQuotes: true,
           removeRedundantAttributes: true,
           removeEmptyAttributes: true,
           removeScriptTypeAttributes: true,
           removeStyleLinkTypeAttributes: true,
           removeOptionalTags: true
       })))
       // Output files
       .pipe($.if('*.html', $.size({title: 'html', showFiles: true})))
       .pipe(gulp.dest(config[env].outDir));
});

gulp.task('serve:dev', ['scripts', 'styles:dev', 'copy', 'html'], function (){
    browserSync({
                    notify: false,
                    // Customize the Browsersync console logging prefix
                    logPrefix: 'WSK',
                    // Allow scroll syncing across breakpoints
                    scrollElementMapping: ['main', '.mdl-layout'],
                    // Run as an https by uncommenting 'https: true'
                    // Note: this uses an unsigned certificate which on first access
                    //       will present a certificate warning in the browser.
                    // https: true,
                    server: ['dev'],
                    port: 3000
                });

    gulp.watch(['src/views/*.html'], reload);
    gulp.watch(['src/styles/**/*.{scss,css}'], ['styles', reload]);
    gulp.watch(['src/scripts/**/*.js'], ['lint', 'scripts', reload]);
    gulp.watch(['src/images/**/*'], reload);
});

// ---------------------------------------------------------------------
// | Main tasks                                                        |
// ---------------------------------------------------------------------

gulp.task('archive', function (done) {
    runSequence(
        'build',
        'archive:create_archive_dir',
        'archive:zip',
    done);
});

gulp.task('build', function (done) {
    runSequence(
        ['clean', 'lint:js'],
        'copy',
    done);
});

gulp.task('default', ['build']);
