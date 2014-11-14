
var Q = require('q');
var _ = require('lodash');
var xml2json = require('xml2json');
var request = require('request');
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

  var get = function(next) {

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

  };

  var getPipelineRunDetails = function(buildNumber) {

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

  var getMaterialHtml = function(jobId) {

    var defer = Q.defer();

    var url = globalOptions.addCredentialsToUrl(jobId + '/materials');
    console.log('Requesting', jobId + '/materials');
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
