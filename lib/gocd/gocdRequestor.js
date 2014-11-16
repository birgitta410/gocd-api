
var Q = require('q');
var _ = require('lodash');
var xml2json = require('xml2json');
var request = require('request');
var logger = require('../logger');
var globalOptions = require('../options');

function gocdRequestorModule() {

  var pipelineFeedEtag;

  function pipelineUrls() {
    var base = '/go/api/pipelines/' + globalOptions.get().pipeline;
    return {
      base: base,
      feedEndpoint: base + '/stages.xml'
    };
  }

  function requestAndXml2Json(url) {
    var defer = Q.defer();
    request(url, function (error, response, body) {
      var json = xml2json.toJson(body, {
        object: true, sanitize: false
      });
      defer.resolve(json);
    });

    return defer.promise;
  }

  function mergeJobDetailsWithStageDetails(stages, jobs) {
    _.each(jobs, function(job) {
      var stageName = job.job.stage.name;
      var stage = _.find(stages, { stage: {name: stageName } });
      stage.stage.jobDetails = stage.stage.jobDetails || [];
      stage.stage.jobDetails.push(job);
    });
  }

  var get = function(next) {

    var defer = Q.defer();

    var url = next ? globalOptions.addCredentialsToUrl(next) : globalOptions.get().url;

    //var loggableUrl = next ? next : globalOptions.get().loggableUrl;
    logger.debug('Requesting', url + pipelineUrls().feedEndpoint);

    request({ method: 'GET', url: url + pipelineUrls().feedEndpoint}, //, headers: {'If-None-Match': pipelineFeedEtag } },
      function (error, response, body) {
        if(error) {
          logger.error('ERROR requesting', url + pipelineUrls().feedEndpoint, error);
          defer.reject();
        } else {
          pipelineFeedEtag = response.headers.etag;

          var json = xml2json.toJson(body, {
            object: true, sanitize: false
          });
          defer.resolve(json);
        }
      }
    );

    return defer.promise;

  };

  var getPipelineRunDetails = function(buildNumber) {

    var defer = Q.defer();

    var url = globalOptions.get().url + pipelineUrls().base + '/' + buildNumber + '.xml';

    var loggableUrl = globalOptions.get().loggableUrl + pipelineUrls().base + '/' + buildNumber + '.xml';
    logger.debug('Requesting', loggableUrl);

    request(url, function (error, response, body) {
      var json = xml2json.toJson(body, {
        object: true, sanitize: false
      });
      defer.resolve(json);
    });

    return defer.promise;
  };

  function getStageRunDetails(stageUrl) {

    var defer = Q.defer();
    request(stageUrl, function (error, response, body) {
      var json = xml2json.toJson(body, {
        object: true, sanitize: false
      });
      defer.resolve(json);
    });

    return defer.promise;

  }

  function getJobRunDetails(stageUrls) {
    return Q.all([]);
    //var stageRunPromises = _.map(stageUrls, function(stageUrl) {
    //  return getStageRunDetails(globalOptions.addCredentialsToUrl(stageUrl));
    //});
    //return Q.all(stageRunPromises).then(function(stageRunDetails) {
    //  var allJobs = _.flatten(_.map(stageRunDetails, function(stage) {
    //    var jobArrays = _.map(stage.stage.jobs, 'job');
    //    console.log('jobArrays', jobArrays);
    //    return _.flatten(_.map(stage.stage.jobs, 'job'));
    //  }));
    //
    //  var jobRunPromises = _.map(allJobs, function(job) {
    //    console.log('job', job);
    //    return requestAndXml2Json(globalOptions.addCredentialsToUrl(job.href));
    //  });
    //
    //  return Q.all(jobRunPromises).then(function(jobRunDetails) {
    //    mergeJobDetailsWithStageDetails(stageRunDetails, jobRunDetails);
    //  });
    //
    //});

  }

  var getMaterialHtml = function(jobId) {

    var defer = Q.defer();

    var url = globalOptions.addCredentialsToUrl(jobId + '/materials');
    logger.debug('Requesting', jobId + '/materials');
    request(url, function(error, response, body) {
      defer.resolve(body);
    });

    return defer.promise;

  };


  return {
    get: get,
    getPipelineRunDetails: getPipelineRunDetails,
    getJobRunDetails: getJobRunDetails,
    getMaterialHtml: getMaterialHtml
  }
};

var gocdRequestor = gocdRequestorModule();
exports.get = gocdRequestor.get;
exports.getPipelineRunDetails = gocdRequestor.getPipelineRunDetails;
exports.getJobRunDetails = gocdRequestor.getJobRunDetails;
exports.getMaterialHtml = gocdRequestor.getMaterialHtml;
