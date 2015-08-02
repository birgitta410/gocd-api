var _ = require('lodash');
var moment = require('moment');
var globalOptions = require('./lib/options');
var pipelineReader = require('./lib/gocd/pipelineFeedReader');
var ccTrayReader = require('./lib/cc/ccTrayReader');

GoCd = {

  getInstance : function(newOptions, type) {
    newOptions = newOptions || {};
    newOptions.type = type || 'GOCD';
    globalOptions.set(newOptions);

    var readData = function() {

      function mapAuthorInitialsFromHistoryToActivity(history, activity) {
        _.each(activity.jobs, function(job) {

          var historyWithSameKey = history[job.buildNumber];
          if(historyWithSameKey !== undefined) {
            job.initials = historyWithSameKey.author? historyWithSameKey.author.initials : undefined;
          }
        });
      }

      return ccTrayReader.readActivity().then(function(activity) {
        return pipelineReader.readPipelineRuns({ exclude: [ activity.buildNumberInProgress] }).then(function(pipelineRuns) {

          mapAuthorInitialsFromHistoryToActivity(pipelineRuns, activity);
          return {
            activity: activity,
            history: pipelineRuns
          };
        }).fail(function(e) {
          console.log('Failed reading history from go cd', e);
        });

      }).fail(function(e) {
        console.log('Failed reading activity from cc tray', e);
      });
    };

    return {
      readData: readData
    };

  }

};

module.exports = GoCd;
