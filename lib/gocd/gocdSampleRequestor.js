
var Q = require('q');
var _ = require('lodash');
var fs = require('fs');
var path = require('path');

function gocdSampleRequestorModule() {

  var SAMPLES_PATH = path.resolve(__dirname, 'sample') + '/';

  var getHistory = function(offset) {
    var path = SAMPLES_PATH + 'history' + (offset ? '_' + offset : '') + '.json';

    var defer = Q.defer();

    try {
      var fileContents = fs.readFileSync(path);

      defer.resolve(JSON.parse(fileContents));
    } catch (err) {
      defer.resolve({});
    }

    return defer.promise;
  };

  return {
    getHistory: getHistory
  }
};

var gocdRequestor = gocdSampleRequestorModule();
exports.getHistory = gocdRequestor.getHistory;
