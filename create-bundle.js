'use strict';

var path = require('path');

var jspm = require('jspm');
var builder = new jspm.Builder();
// Temporary hack, as per https://github.com/systemjs/systemjs/issues/533#issuecomment-113525639
global.System = builder.loader;
// Execute the IIFE
global.systemJsRuntime = false;
require(path.join(__dirname, 'static/src/systemjs-normalize'));

var createBundle = function () {
    var moduleExpression = process.argv[2];
    return builder.build(moduleExpression, null, {
        minify: true,
        sourceMaps: true,
        sourceMapContents: true });
};

createBundle().then(function (output) {
    console.log(JSON.stringify(output));
}, function (error) {
    console.error(error);
});
