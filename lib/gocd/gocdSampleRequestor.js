
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

      var emptyResult = {
        pipelines: [],
        pagination: {
          offset: 10,
          total: 5,
          page_size: 10
        }
      };

      defer.resolve(emptyResult);
    }

    return defer.promise;
  };

  return {
    getHistory: getHistory
  }
};

var gocdRequestor = gocdSampleRequestorModule();
exports.getHistory = gocdRequestor.getHistory;
