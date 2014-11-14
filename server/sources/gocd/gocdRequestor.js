
var Q = require('q');
var _ = require('lodash');
var xml2json = require('xml2json');
var request = require('request');
var fs = require('fs');
var path = require('path');
var globalOptions = require('../options');

function gocdRequestorModule() {

  var SAMPLES_PATH = path.resolve(__dirname, 'sample') + '/';

  var pipelineFeedEtag;

  function pipelineUrls() {
    var base = '/go/api/pipelines/' + globalOptions.get().pipeline;
    return {
      base: base,
      feedEndpoint: base + '/stages.xml'
    };
  }

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
    if (globalOptions.sampleIt()) {
      return getSample(next);
    } else {
      var defer = Q.defer();

      var url = next ? globalOptions.addCredentialsToUrl(next) : globalOptions.get().url;

      var loggableUrl = next ? next : globalOptions.get().loggableUrl;
      console.log('Requesting', loggableUrl + pipelineUrls().feedEndpoint);

      request({ method: 'GET', url: url + pipelineUrls().feedEndpoint}, //, headers: {'If-None-Match': pipelineFeedEtag } },
        function (error, response, body) {
          pipelineFeedEtag = response.headers.etag;

          var json = xml2json.toJson(body, {
            object: true, sanitize: false
          });
          defer.resolve(json);
        }
      );

      return defer.promise;
    }

  };

  function getSample(next) {

    var source = next ? SAMPLES_PATH + next : SAMPLES_PATH + 'pipeline-stages.xml';
    return resolveAndPromiseSampleFile(source, true);
  }

  var getPipelineRunDetails = function(buildNumber) {
    if (globalOptions.sampleIt()) {
      return getSamplePipelineRunDetails(buildNumber);
    } else {
      var defer = Q.defer();

      var url = globalOptions.get().url + pipelineUrls().base + '/' + buildNumber + '.xml';

      var loggableUrl = globalOptions.get().loggableUrl + pipelineUrls().base + '/' + buildNumber + '.xml';
      console.log('Requesting', loggableUrl);

      request(url, function (error, response, body) {
        var json = xml2json.toJson(body, {
          object: true, sanitize: false
        });
        defer.resolve(json);
      });

      return defer.promise;
    }
  };

  function getSamplePipelineRunDetails() {
    return resolveAndPromiseSampleFile(SAMPLES_PATH + 'pipeline-run-details.xml', true);
  }

  function getStageRunDetails(stageUrl) {
    if (globalOptions.sampleIt()) {
      return getSampleStageRunDetails();
    } else {
      var defer = Q.defer();
      request(stageUrl, function (error, response, body) {
        var json = xml2json.toJson(body, {
          object: true, sanitize: false
        });
        defer.resolve(json);
      });

      return defer.promise;
    }
  }

  function getSampleStageRunDetails() {
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

  function getJobRunDetails(stageUrls) {
    if (globalOptions.sampleIt()) {
      return getSampleJobRunDetails();
    } else {
      return Q.all([]);
//      TODO
//      var stageRunPromises = _.map(stageUrls, function(stageUrl) {
//        return getStageRunDetails(stageUrl);
//      });
//      return Q.all(stageRunPromises).then(function(stageRunDetails) {
//        _.each(stageRunDetails, function(stageRunDetail) {
//          console.log('stageRunDetail', stageRunDetail);
//        });
//      });
    }
  }

  function getSampleJobRunDetails() {
    return Q.all(getSampleStageRunDetails()).then(function(stageRunDetails) {
      var sampleJobRuns = [ resolveAndPromiseSampleFile(SAMPLES_PATH + 'job-run-details.xml', true) ];
      return Q.all(sampleJobRuns).then(function(jobRunDetails) {
        mergeJobDetailsWithStageDetails(stageRunDetails, jobRunDetails);
        return stageRunDetails;
      });
    });
  }

  var getMaterialHtml = function(jobId) {

    if (globalOptions.sampleIt()) {
      return getSampleMaterialHtml(jobId);
    } else {
      var defer = Q.defer();

      var url = globalOptions.addCredentialsToUrl(jobId + '/materials');
      console.log('Requesting', jobId + '/materials');
      request(url, function(error, response, body) {
        defer.resolve(body);
      });

      return defer.promise;
    }
  };

  function getSampleMaterialHtml() {
    return resolveAndPromiseSampleFile(SAMPLES_PATH + 'materials.html');
  }

  return {
    get: get,
    getSample: getSample,
    getPipelineRunDetails: getPipelineRunDetails,
    getSamplePipelineRunDetails: getSamplePipelineRunDetails,
    getJobRunDetails: getJobRunDetails,
    getSampleJobRunDetails: getSampleJobRunDetails,
    getMaterialHtml: getMaterialHtml,
    getSampleMaterialHtml: getSampleMaterialHtml
  }
};

var gocdRequestor = gocdRequestorModule();
exports.get = gocdRequestor.get;
exports.getSample = gocdRequestor.getSample;
exports.getPipelineRunDetails = gocdRequestor.getPipelineRunDetails;
exports.getSamplePipelineRunDetails = gocdRequestor.getSamplePipelineRunDetails;
exports.getJobRunDetails = gocdRequestor.getJobRunDetails;
exports.getSampleJobRunDetails = gocdRequestor.getSampleJobRunDetails;
exports.getMaterialHtml = gocdRequestor.getMaterialHtml;
exports.getSampleMaterialHtml = gocdRequestor.getSampleMaterialHtml;
