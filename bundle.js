/*eslint-env node*/
'use strict';

var path = require('path');

var crypto = require('crypto');
var fs = require('fs');
var mkdirp = require('mkdirp');
var jspmBaseUrl = 'static/src';
var prefixPath = 'static/hash';
var bundlesUri = 'bundles';
var bundleConfigs = [
    ['core + system-script', 'core'],
    ['es6/bootstraps/crosswords - core', 'crosswords'],
    ['bootstraps/accessibility - core', 'accessibility'],
    ['bootstraps/app - core', 'app'],
    ['bootstraps/commercial - core', 'commercial'],
    ['bootstraps/sudoku - core - bootstraps/app', 'sudoku'],
    ['bootstraps/image-content - core - bootstraps/app', 'image-content'],
    ['bootstraps/facia - core - bootstraps/app', 'facia'],
    ['bootstraps/football - core - bootstraps/app', 'football'],
    ['bootstraps/preferences - core - bootstraps/app', 'preferences'],
    ['bootstraps/membership - core - bootstraps/app', 'membership'],
    ['bootstraps/article - core - bootstraps/app', 'article'],
    ['bootstraps/liveblog - core - bootstraps/app', 'liveblog'],
    ['bootstraps/gallery - core - bootstraps/app', 'gallery'],
    ['bootstraps/trail - core - bootstraps/app', 'trail'],
    ['bootstraps/profile - core - bootstraps/app', 'profile'],
    ['bootstraps/ophan - core', 'ophan'],
    ['bootstraps/admin - core', 'admin'],
    // // Odd issue when bundling admin with core: https://github.com/jspm/jspm-cli/issues/806
    // // ['bootstraps/admin', 'admin'],
    ['bootstraps/video-player - core', 'video-player'],
    ['bootstraps/video-embed - core', 'video-embed'],
    // // Odd issue when bundling video-embed with core: https://github.com/jspm/jspm-cli/issues/806
    // // ['bootstraps/video-embed', 'video-embed'],
    ['bootstraps/dev - core - bootstraps/app', 'dev'],
    ['bootstraps/creatives - core - bootstraps/app', 'creatives'],
    ['zxcvbn', 'zxcvbn']
];

var getHash = function (outputSource) {
    return crypto.createHash('md5')
        .update(outputSource)
        .digest('hex');
};

var spawned = [];
var createBundle = function (bundleConfig) {
    return new Promise(function (resolve, reject) {
        var spawn = require('child_process').spawn;

        var moduleExpression = bundleConfig[0];
        var outName = bundleConfig[1];
        var bundleProcess = spawn('node', ['create-bundle', moduleExpression]);
        spawned.push(bundleProcess);

        // Warning: reassignment and mutation!
        var rawOutput = '', rawError = '';
        bundleProcess.stdout.on('data', function (data) {
            rawOutput += data.toString();
        });

        bundleProcess.stderr.on('data', function (data) {
            rawError += data.toString();
        });

        bundleProcess.on('close', function () {
            if (rawError) {
                reject(rawError);
            } else {
                console.log('close', moduleExpression);
                var output = JSON.parse(rawOutput);
                var hash = getHash(output.source);
                // The id is the first part of the arithmetic expression, the string up to the first space character.
                output.id = /^[^\s]*/.exec(moduleExpression)[0];
                // Relative to jspm client base URL
                output.uri = path.join(bundlesUri, outName, hash, outName + '.js');
                resolve(output);
            }
        });
    });
};

// make sure all child processes are killed when grunt exits
process.on('exit', function () {
    spawned.forEach(function (el) {
        el.kill('SIGKILL');
    });
});

var writeBundlesToDisk = function (bundles) {
    bundles.forEach(function (bundle) {
        var bundleFileName = path.join(prefixPath, bundle.uri);
        var bundleMapFileName = bundleFileName + '.map';

        mkdirp.sync(path.dirname(bundleFileName));

        console.log('writing to %s', bundleFileName);
        fs.writeFileSync(bundleFileName, bundle.source + '\n//# sourceMappingURL=' + path.basename(bundleFileName) + '.map');
        console.log('writing to %s', bundleMapFileName);
        fs.writeFileSync(bundleMapFileName, bundle.sourceMap);
    });
};

var writeBundlesConfig = function (bundles) {
    var bundlesConfig = bundles.reduce(function (accumulator, bundle) {
        accumulator[bundle.uri.replace('.js', '')] = [bundle.id];
        return accumulator;
    }, {});
    var configFilePath = path.join(jspmBaseUrl, 'systemjs-bundle-config.js');
    var configFileData = 'System.config({ bundles: ' + JSON.stringify(bundlesConfig, null, '\t') + ' })';
    console.log('writing to %s', configFilePath);
    fs.writeFileSync(configFilePath, configFileData);
};

var throat = require('throat');
Promise.all(bundleConfigs.map(throat(24, createBundle)))
    .then(function (bundles) {
        writeBundlesToDisk(bundles);
        writeBundlesConfig(bundles);
    })
    .catch(function (error) {
        console.error(error);
    });
