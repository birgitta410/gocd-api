var _ = require('lodash');
var moment = require('moment');
var globalOptions = require('./lib/options');
var pipelineReader = require('./lib/gocd/pipelineFeedReader');
var ccTrayReader = require('./lib/cc/ccTrayReader');

GoCd = {

  getInstance : function(newOptions) {

    globalOptions.set(newOptions);

    var readData = function() {
      return ccTrayReader.readActivity().then(function(activity) {
        return pipelineReader.readPipelineRuns({ exclude: [ activity.buildNumberInProgress] }).then(function(pipelineRuns) {
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
