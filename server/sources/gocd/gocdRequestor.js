
define(['q', 'lodash', 'xml2json', 'request', 'fs', 'server/sources/ymlHerokuConfig'], function (Q, _, xml2json, request, fs, configReader) {

  var config = configReader.create('gocd');

  var PIPELINE_API_BASE = '/go/api/pipelines/' + config.get().pipeline;
  var PIPELINE_FEED_ENDPOINT = PIPELINE_API_BASE + '/stages.xml';

  var SAMPLES_PATH = 'server/sources/gocd/sample/';

  var pipelineFeedEtag;

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
    if (config.get().sampleIt()) {
      return getSample(next);
    } else {
      var defer = Q.defer();

      var url = next ? config.addCredentialsToUrl(next) : config.get().url;

      var loggableUrl = next ? next : config.get().loggableUrl;
      console.log('Requesting', loggableUrl + PIPELINE_FEED_ENDPOINT);

      request({ method: 'GET', url: url + PIPELINE_FEED_ENDPOINT}, //, headers: {'If-None-Match': pipelineFeedEtag } },
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
    var source = next ? next : SAMPLES_PATH + 'pipeline-stages.xml';
    return resolveAndPromiseSampleFile(source, true);
  }

  var getPipelineRunDetails = function(buildNumber) {
    if (config.get().sampleIt()) {
      return getSamplePipelineRunDetails(buildNumber);
    } else {
      var defer = Q.defer();

      var url = config.get().url + PIPELINE_API_BASE + '/' + buildNumber + '.xml';

      var loggableUrl = config.get().loggableUrl + PIPELINE_API_BASE + '/' + buildNumber + '.xml';
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
    if (config.get().sampleIt()) {
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
    if (config.get().sampleIt()) {
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

    if (config.get().sampleIt()) {
      return getSampleMaterialHtml(jobId);
    } else {
      var defer = Q.defer();

      var url = config.addCredentialsToUrl(jobId + '/materials');
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
});

