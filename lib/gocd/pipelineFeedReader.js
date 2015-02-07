var Q = require('q');
var _ = require('lodash');
var pipelineRunCreator = require('./pipelineRun');
var globalOptions = require('../options');
var logger = require('../logger');

function pipelineFeedReaderModule() {

  var CACHE = { };
  var MIN_NUMBER_PIPELINE_RUNS = 25;

  function addChangedFilesToData(pipelineJson, pipelineDetails) {
    _.each(pipelineDetails, function (detail) {
      var pipelineDataToExtend = _.find(pipelineJson.pipelines, function(pipeline) {
        var selfLink = _.find(detail.pipeline.link, { rel: 'self'});
        return selfLink.href.indexOf(pipeline.label + '.xml') >= 0;
      });

      if(pipelineDataToExtend) {
        function extractChangeSets(pipelineDetail) { // because stupid xml2json
          var materials = [].concat(pipelineDetail.materials.material);
          return _.flatten(_.map(materials, function (m) {
            var allModifications = m ? [].concat(m.modifications) : [];
            return _.map(allModifications, function (mod) {
              return [].concat(mod.changeset);
            });
          }));
        }

        pipelineDataToExtend['build_cause'].files = _.flatten(_.pluck(extractChangeSets(detail.pipeline), 'file'));

      }
    });
  }

  var requestStages = function (offset) {
    return globalOptions.getGocdRequestor().getHistory(offset).then(function(json) {
      if(json !== undefined) {
        var detailsPromises = _.map(json.pipelines, function (pipelineData) {
          return globalOptions.getGocdRequestor().getPipelineDetails(pipelineData.label);
        });
        return Q.all(detailsPromises).then(function (details) {
          addChangedFilesToData(json, details);
          return json;
        });
      }

    });

  };

  var refreshAndReadPipelineRuns = function (options, originalDefer) {

    var defer = originalDefer || Q.defer();

    options = options || {};
    options.exclude = options.exclude || [];

    requestStages(options.offset).then(function (result) {

      function fillCache(runEntry) {

        if(! CACHE[runEntry.label]) {
          var pipelineRun = pipelineRunCreator.pipelineRun.createNew(runEntry);
          CACHE[runEntry.label] = pipelineRun;

        } else {
          [CACHE[runEntry.label].update(runEntry)];
        }
      }

      function continueToNextPageOrResolve() {

        var cacheSize = _.keys(CACHE).length;
        var needsNextPage = result.pagination !== undefined && result.pagination.total > cacheSize && cacheSize < MIN_NUMBER_PIPELINE_RUNS;
        if (needsNextPage) {
          var nextOffset = result.pagination.offset + result.pagination['page_size'];
          refreshAndReadPipelineRuns(_.extend(options, { offset: nextOffset }), defer);
        } else {
          var filteredResults = _.omit(CACHE, function (value, key) {
            return _.contains(options.exclude, key);
          });

          defer.resolve(filteredResults);
        }

      }

      _.each(result.pipelines, fillCache);

      continueToNextPageOrResolve();

    }).fail(function(e) {
      logger.error('failed requestStages', e);
    });

    return defer.promise;

  };

  var clearCache = function() {
    CACHE = {};
  };

  return {
    readPipelineRuns: refreshAndReadPipelineRuns,
    clear: clearCache
  };

};

var pipelineFeedReader = pipelineFeedReaderModule();
module.exports.readPipelineRuns = pipelineFeedReader.readPipelineRuns;
module.exports.clear = pipelineFeedReader.clear;
