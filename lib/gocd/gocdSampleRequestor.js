
var Q = require('q');
var _ = require('lodash');
var xml2json = require('xml2json');
var request = require('request');
var fs = require('fs');
var path = require('path');

function gocdRequestorModule() {

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

  var getPipelineRunDetails = function() {
    return resolveAndPromiseSampleFile(SAMPLES_PATH + 'pipeline-run-details.xml', true);
  };


  function getStageRunDetails() {
    return [ resolveAndPromiseSampleFile(SAMPLES_PATH + 'stage-run-details.xml', true) ];
  }

  function mergeJobDetailsWithStageDetails(stages, jobs) {
    _.each(jobs, function(job) {
      var stageName = job.job.stage.name;
      var stage = _.find(stages, { stage: {name: stageName } });
      stage.stage.jobDetails = stage.stage.jobDetails || [];
      stage.stage.jobDetails.push(job);
    });
  }

  function getJobRunDetails() {
    return Q.all(getStageRunDetails()).then(function(stageRunDetails) {
      var sampleJobRuns = [ resolveAndPromiseSampleFile(SAMPLES_PATH + 'job-run-details.xml', true) ];
      return Q.all(sampleJobRuns).then(function(jobRunDetails) {
        mergeJobDetailsWithStageDetails(stageRunDetails, jobRunDetails);
        return stageRunDetails;
      });
    });
  }

  var getMaterialHtml = function() {
    return resolveAndPromiseSampleFile(SAMPLES_PATH + 'materials.html');
  };

  return {
    get: get,
    getPipelineRunDetails: getPipelineRunDetails,
    getJobRunDetails: getJobRunDetails,
    getMaterialHtml: getMaterialHtml,
  }
};

var gocdRequestor = gocdRequestorModule();
exports.get = gocdRequestor.get;
exports.getPipelineRunDetails = gocdRequestor.getPipelineRunDetails;
exports.getJobRunDetails = gocdRequestor.getJobRunDetails;
exports.getMaterialHtml = gocdRequestor.getMaterialHtml;
