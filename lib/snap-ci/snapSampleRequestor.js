
var Q = require('q');
var _ = require('lodash');
var fs = require('fs');
var path = require('path');

var snapToGoConverter = require('./snapToGoConverter');

function snapSampleRequestorModule() {

  var SAMPLES_PATH = path.resolve(__dirname, 'sample') + '/';

  function readAndResolve(path) {

    try {
      var fileContents = fs.readFileSync(path);
      return Q.resolve(JSON.parse(fileContents));
    } catch (err) {
      return Q.reject(err);
    }
  }

  var getPipelineDetails = function() {
    var path = SAMPLES_PATH + 'pipeline.json';
    return readAndResolve(path);
  };

  var getHistory = function() {
    var path = SAMPLES_PATH + 'history.json';
    return readAndResolve(path).then(function(result) {
      return snapToGoConverter.convert(result);
    });
  };

  return {
    getHistory: getHistory,
    getPipelineDetails: getPipelineDetails
  };
}

var snapRequestor = snapSampleRequestorModule();
exports.getHistory = snapRequestor.getHistory;
exports.getPipelineDetails = snapRequestor.getPipelineDetails;
