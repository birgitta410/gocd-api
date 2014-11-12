
define(['q', 'lodash', 'server/sources/cc/ccTrayRequestor', 'server/sources/gocd/atomEntryParser', 'server/sources/ymlHerokuConfig'],
  function (Q, _, ccTrayRequestor, goCdAtomEntryParser, configReader) {

  var configValues = configReader.create('cc').get();

  var requestActivity = function () {
    return ccTrayRequestor.get(function(json) {
      json.Projects.Project = _.map(json.Projects.Project, function(entry) {
        return entry;
      });
      return json;
    });
  };

  var readActivity = function() {

    var activity = { jobs: [] };

    return requestActivity().then(function (result) {

      // Assumption (Go CD): Jobs are the ones with 3 path elements
      // 'PIPELINE-NAME :: stage-name :: job-name'
      _.each(result.Projects.Project, function(project) {
        var pathElements = project.name.split(' :: ');
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
          var allMessages = [].concat(project.messages || []); // xml2json creates object if array only has one entry

          var breakersMessage = _.find(allMessages, function(message) {
            return message.message.kind === 'Breakers';
          });

          if(breakersMessage !== undefined) {
            return parseBreakerNameAndEmail(breakersMessage.message.text);
          }
        }

        function includeJob() {
          if(configValues.jobs !== undefined) {
            var configured = _.any(_.values(configValues.jobs), function(jobName) {
              return project.name.indexOf(jobName) === 0;
            });
            return configured && isAJob;
          } else {
            return isAJob;
          }
        }


        if (includeJob()) {

          project = _.extend(project, {
            wasSuccessful: function() {
              return project.lastBuildStatus === 'Success';
            },
            breaker: parseBreaker()
          });
          project = _.extend(project, goCdAtomEntryParser.parseParametersFromJobRunUrl(project.webUrl)); // TODO: currently only supports Go CD
          activity.jobs.push(project);
        }
      });

      function parseGoCdBuildingPipeline() {
        var buildingJob = _.find(result.Projects.Project, function(project) {
          return project.activity === 'Building';
        });

        if(buildingJob) {
          return goCdAtomEntryParser.parseParametersFromJobRunUrl(buildingJob.webUrl).buildNumber;
        }
      }

      activity.buildNumberInProgress = parseGoCdBuildingPipeline();

      return activity;

    });


  };

  return {
    readActivity: readActivity
  };
});
