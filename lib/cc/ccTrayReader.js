var _ = require('lodash');
var globalOptions = require('../options');
var utils = require('../utils');

function ccTrayReaderModule() {

  var JOB_NAME_DELIMITER = ' :: ';

  function getConfiguredJobs() {
    return globalOptions.get().stages;
  }

  var requestActivity = function () {
    return globalOptions.getCcTrayRequestor().get().then(function(json) {
      json.Projects.Project = _.map(json.Projects.Project, function(entry) {
        return entry;
      });
      return json;
    });
  };

  var readActivity = function(filterByPipeline) {

    var activity = { stages: [] };

    return requestActivity().then(function (result) {

      // Assumption (Go CD): Stages are the ones with 2 path elements
      // 'PIPELINE-NAME :: stage-name'
      _.each(result.Projects.Project, function(stageCandidate) {
        var pathElements = stageCandidate.name.split(JOB_NAME_DELIMITER);
        var isAStage = pathElements.length === 2;

        function parseBreakerNameAndEmail(text) { // !!currently duplicated in atomEntryParser
          var breaker = {};
          var emailIndex = text.indexOf('<');
          if (emailIndex > -1) {
            breaker.name = text.substr(0, emailIndex).trim();
            breaker.email = text.substr(emailIndex).trim();
          } else {
            breaker.name = text;
          }
          return breaker;
        }

        function parseBreaker() {
          var allMessages = [].concat(stageCandidate.messages || []); // xml2json creates object if array only has one entry

          var breakersMessage = _.find(allMessages, function(message) {
            return message.message.kind === 'Breakers';
          });

          if(breakersMessage !== undefined) {
            return parseBreakerNameAndEmail(breakersMessage.message.text);
          }
        }

        function getInfoShort(entry) {
          return pathElements[1];
        }

        function getInfoDetailed(entry) {
          var entryTitle = '[' + entry.buildNumber + '] ' + entry.name;
          if(entry.activity === 'Building') {
            return entryTitle + ' is building';
          } else {
            var info = entryTitle + ' | ' + entry.lastBuildStatus;
            if(!entry.wasSuccessful() && entry.author) {
              info += ' | changes by ' + entry.author.name;
            }
            return info;
          }
        }

        function includeJob() {
          var filterByJobs = getConfiguredJobs();

          if(filterByPipeline !== undefined && stageCandidate.name.indexOf(filterByPipeline + JOB_NAME_DELIMITER) !== 0) {
            return false;
          }
          if(filterByJobs !== undefined) {
            var configured = _.any(_.values(filterByJobs), function(jobName) {
              return stageCandidate.name.indexOf(jobName) === 0;
            });
            return configured && isAStage;
          } else {
            return isAStage;
          }
        }

        if (includeJob()) {

          stageCandidate = _.extend(stageCandidate, {
            wasSuccessful: function() {
              return stageCandidate.lastBuildStatus === 'Success';
            },
            breaker: parseBreaker()
          });
          stageCandidate = _.extend(stageCandidate, utils.parseParametersFromJobRunUrl(stageCandidate.webUrl));
          stageCandidate = _.extend(stageCandidate, {
            info: getInfoShort(stageCandidate),
            info2: getInfoDetailed(stageCandidate)
          });

          activity.stages.push(stageCandidate);
        }
      });

      function parseGoCdBuildingPipeline() {
        var buildingJob = _.find(result.Projects.Project, function(project) {
          return project.activity === 'Building';
        });

        if(buildingJob) {
          return utils.parseParametersFromJobRunUrl(buildingJob.webUrl).buildNumber;
        }
      }

      activity.buildNumberInProgress = parseGoCdBuildingPipeline();

      return activity;

    })
    .fail(function(e) {
      console.log('failed requestActivity', e, e.stack);
    });


  };

  return {
    readActivity: readActivity
  };
}

var ccTrayReader = ccTrayReaderModule();
exports.readActivity = ccTrayReader.readActivity;
