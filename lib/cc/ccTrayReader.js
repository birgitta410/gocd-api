var _ = require('lodash');
var globalOptions = require('../options');
var utils = require('../utils');

function ccTrayReaderModule() {

  var JOB_NAME_DELIMITER = ' :: ';

  function getConfiguredJobs() {
    return globalOptions.get().jobs;
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

    var activity = { jobs: [] };

    return requestActivity().then(function (result) {

      // Assumption (Go CD): Jobs are the ones with 3 path elements
      // 'PIPELINE-NAME :: stage-name :: job-name'
      _.each(result.Projects.Project, function(job) {
        var pathElements = job.name.split(JOB_NAME_DELIMITER);
        var isAJob = pathElements.length === 3;

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
          var allMessages = [].concat(job.messages || []); // xml2json creates object if array only has one entry

          var breakersMessage = _.find(allMessages, function(message) {
            return message.message.kind === 'Breakers';
          });

          if(breakersMessage !== undefined) {
            return parseBreakerNameAndEmail(breakersMessage.message.text);
          }
        }

        function getInfoShort(entry) {
          return entry.stageName;
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

          if(filterByPipeline !== undefined && job.name.indexOf(filterByPipeline + JOB_NAME_DELIMITER) !== 0) {
            return false;
          }
          if(filterByJobs !== undefined) {
            var configured = _.any(_.values(filterByJobs), function(jobName) {
              return job.name.indexOf(jobName) === 0;
            });
            return configured && isAJob;
          } else {
            return isAJob;
          }
        }

        if (includeJob()) {

          job = _.extend(job, {
            wasSuccessful: function() {
              return job.lastBuildStatus === 'Success';
            },
            breaker: parseBreaker()
          });
          job = _.extend(job, utils.parseParametersFromJobRunUrl(job.webUrl));
          job = _.extend(job, {
            info: getInfoShort(job),
            info2: getInfoDetailed(job)
          });

          activity.jobs.push(job);
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
