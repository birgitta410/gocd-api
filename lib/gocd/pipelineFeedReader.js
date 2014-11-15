var Q = require('q');
var _ = require('lodash');
var pipelineRunCreator = require('./pipelineRun');
var globalOptions = require('../options');
var atomEntryParser = require('./atomEntryParser');

function pipelineFeedReaderModule() {

  var CACHE = { };
  var MIN_NUMBER_PIPELINE_RUNS = 25;

  var requestStages = function (url) {

    return globalOptions.getGocdRequestor().get(url).then(function(json) {
      json.feed.entry = _.map(json.feed.entry, function(entry) {
        return atomEntryParser.withData(entry);
      });
      return json || { feed: { entry: [] } };
    });

  };

  var refreshAndReadPipelineRuns = function (options, originalDefer) {

    var defer = originalDefer || Q.defer();

    options = options || {};
    options.exclude = options.exclude || [];

    requestStages(options.nextUrl).then(function (result) {

      function fillCacheAndPromiseNewData(entry) {

        if(! CACHE[entry.buildNumber]) {
          var pipelineRun = pipelineRunCreator.pipelineRun.createNew(entry);
          CACHE[entry.buildNumber] = pipelineRun;
          return pipelineRun.promiseInitialise();

        } else {
          return [CACHE[entry.buildNumber].addStage(entry)];
        }
      }

      function resolveOnAllInitialised() {

        var nextLink = _.find(result.feed.link, { rel: 'next' });
        var needsNextPage = nextLink && _.keys(CACHE).length < MIN_NUMBER_PIPELINE_RUNS;

        if (needsNextPage) {
          var nextUrl = nextLink.href;
          refreshAndReadPipelineRuns(_.extend(options, { nextUrl: nextUrl }), defer);
        } else {
          var filteredResults = _.omit(CACHE, function (value, key) {
            return _.contains(options.exclude, key);
          });

          defer.resolve(filteredResults);
        }

      }

      var pipelineRunUpdatePromises = _.compact(_.map(result.feed.entry, fillCacheAndPromiseNewData));

      Q.all(pipelineRunUpdatePromises)
        .then(resolveOnAllInitialised)
        .fail(function(e) {
          console.log('Failed to initialise pipelineRuns', e);
          defer.reject();
        });

    }).fail(function(e) {
      console.log('failed requestStages', e);
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
