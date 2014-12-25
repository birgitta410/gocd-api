var Q = require('q');
var _ = require('lodash');
var pipelineRunCreator = require('./pipelineRun');
var globalOptions = require('../options');
var logger = require('../logger');

function pipelineFeedReaderModule() {

  var CACHE = { };
  var MIN_NUMBER_PIPELINE_RUNS = 25;

  var requestStages = function (offset) {
    return globalOptions.getGocdRequestor().getHistory(offset).then(function(json) {
      return json;
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

        var needsNextPage = result.pagination !== undefined && _.keys(CACHE).length < MIN_NUMBER_PIPELINE_RUNS;

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
