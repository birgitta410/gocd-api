
var Q = require('q');
var _ = require('lodash');
var xml2json = require('xml2json');
var fs = require('fs');
var path = require('path');

function gocdSampleRequestorModule() {

  var SAMPLES_PATH = path.resolve(__dirname, 'sample') + '/';

  function resolveAndPromiseSampleFile(path, convertToJson) {
    var defer = Q.defer();

    try {
      var fileContents = fs.readFileSync(path);

      if(convertToJson === true) {
        defer.resolve(xml2json.toJson(fileContents, {
          object: true, sanitize: false
        }));
      } else {
        defer.resolve(fileContents);
      }
    } catch (err) {
      console.log('ERROR reading file', path, err);
      defer.reject();
    }

    return defer.promise;
  }

  var get = function(next) {
    var source = next ? SAMPLES_PATH + next : SAMPLES_PATH + 'pipeline-stages.xml';
    return resolveAndPromiseSampleFile(source, true);
  };

  function getStageRunDetails(stageUrl) {

    var sampleFileName = stageUrl.indexOf('build') > -1 ? 'stage-run-build.xml' : 'stage-run-functional-test.xml';

    return resolveAndPromiseSampleFile(SAMPLES_PATH + sampleFileName, true).then(function(stageRun) {
      var jobPromises = [ resolveAndPromiseSampleFile(SAMPLES_PATH + 'job-run-details.xml', true) ];
      return Q.all(jobPromises).then(function(jobs) {
        stageRun.stage.jobs = jobs;
        return stageRun;
      })
    });
  }


  var getMaterialHtml = function() {
    return resolveAndPromiseSampleFile(SAMPLES_PATH + 'materials.html');
  };

  return {
    get: get,
    getStageRunDetails: getStageRunDetails,
    getMaterialHtml: getMaterialHtml
  }
};

var gocdRequestor = gocdSampleRequestorModule();
exports.get = gocdRequestor.get;
exports.getStageRunDetails = gocdRequestor.getStageRunDetails;
exports.getMaterialHtml = gocdRequestor.getMaterialHtml;
