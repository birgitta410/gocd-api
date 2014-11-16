
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
    var authUrl = globalOptions.addCredentialsToUrl(url);
    request(authUrl, function (error, response, body) {
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

  var getPipelineFeed = function(next) {

    var defer = Q.defer();

    var url = next ? globalOptions.addCredentialsToUrl(next) : globalOptions.get().url;

    //var loggableUrl = next ? next : globalOptions.get().loggableUrl;
    logger.debug('Requesting pipeline feed', url + pipelineUrls().feedEndpoint);

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

  function getStageRunDetails(stageUrl) {

    return requestAndXml2Json(stageUrl).then(function(stageRun) {
      var oneOrMultipleJobs = [].concat(stageRun.stage.jobs.job);

      var jobPromises = _.map(oneOrMultipleJobs, function(job) {
        return requestAndXml2Json(job.href);
      });
      return Q.all(jobPromises).then(function(jobs) {
        stageRun.stage.jobs = jobs;
        return stageRun;
      })

    });


  }

  var getMaterialHtml = function(jobId) {

    var defer = Q.defer();

    var url = globalOptions.addCredentialsToUrl(jobId + '/materials');
    logger.debug('Requesting material HTML', url);
    request(url, function(error, response, body) {
      defer.resolve(body);
    });

    return defer.promise;

  };


  return {
    get: getPipelineFeed,
    getStageRunDetails: getStageRunDetails,
    getMaterialHtml: getMaterialHtml
  }
};

var gocdRequestor = gocdRequestorModule();
exports.get = gocdRequestor.get;
exports.getStageRunDetails = gocdRequestor.getStageRunDetails;
exports.getMaterialHtml = gocdRequestor.getMaterialHtml;
