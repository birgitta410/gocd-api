
var Q = require('q');
var _ = require('lodash');
var moment = require('moment');
var cheerio = require('cheerio');
var globalOptions = require('../options');
var logger = require('../logger');

function pipelineRun() {

  var DONE = 'DONE';
  
  var FAILED = 'Failed';
  var PASSED = 'Passed';

  var PipelineRunCreator = {};

  PipelineRunCreator.createNew = function (feedEntry) {

    var pipelineRun = {};
    pipelineRun.stages = [];
    pipelineRun.buildNumber = feedEntry.buildNumber;

    function mapPipelineFinishTime() {

      var lastFinishedStage = _.sortBy(pipelineRun.stages, function (stage) {
        return stage.updated;
      })[pipelineRun.stages.length - 1];
      pipelineRun.updated = lastFinishedStage.updated;
    }

    function mapInfoText() {
      if (pipelineRun.info !== undefined) {
        return;
      }

      var lastCommitMaterial = pipelineRun.materials[0];

      var theCommit = lastCommitMaterial ? lastCommitMaterial.comment : 'Unknown change';
      var theTime = moment(pipelineRun.updated).format('MMMM Do YYYY, h:mm:ss a');
      var theAuthor = pipelineRun.author ? pipelineRun.author.name : 'Unknown author';
      var theResult = pipelineRun.wasSuccessful() ? 'Success' : 'Stage failed: ' + pipelineRun.stageFailed;
      pipelineRun.info = '[' + pipelineRun.buildNumber + '] ' + theTime + ' | ' + theResult + ' | ' + theCommit + ' | ' + theAuthor;

    }

    function getLatestRunsOfStages() {
      var stages = pipelineRun.stages;
      var allStageNames = _.unique(_.map(stages, function (stage) {
        return stage.name;
      }));
      return _.map(allStageNames, function (stageName) {
        var allEntriesForStage = _.where(stages, { 'name': stageName });
        allEntriesForStage = _.sortBy(allEntriesForStage, 'runNumber').reverse();
        return allEntriesForStage[0];
      });
    }

    function mapPipelineAuthor() {

      if (pipelineRun.author !== undefined) {
        return;
      }

      function getInitialsOfAuthor(authorName) {

        function onlyAtoZ(character) {
          var isLetter = character.toLowerCase() >= "a" && character.toLowerCase() <= "z";
          if (!isLetter) {
            return 'x';
          } else {
            return character;
          }
        }

        if (authorName !== undefined) {
          var nameParts = authorName.split(' ');

          var initials = _.map(nameParts, function (namePart, index) {
            if (index !== nameParts.length - 1) {
              return onlyAtoZ(namePart[0]);
            } else {
              return onlyAtoZ(namePart[0]) + onlyAtoZ(namePart[1]);
            }
          }).join('');

          return initials.toLowerCase().substr(0, 3);
        }
      }

      var latestMaterial = _.first(pipelineRun.materials);

      var author = {
        name: latestMaterial.committer,
        initials: getInitialsOfAuthor(latestMaterial.committer)
      };

      _.extend(pipelineRun, {
        author: author
      });

    }

    function mapPipelineResult() {

      var lastRuns = getLatestRunsOfStages();
      var failedStages = _.where(lastRuns, function(run) {
        return run.result === FAILED;
      });

      if (failedStages.length > 0) {
        _.extend(pipelineRun, {
          result: FAILED,
          stageFailed: failedStages[0].name
        });
      } else {
        pipelineRun.result = PASSED;
      }
      pipelineRun.wasSuccessful = function () {
        return pipelineRun.result === PASSED;
      };

    }

    function promiseMaterialDetails() {

      function promiseCommitDetails() {

        if (pipelineRun.materials !== undefined) {
          return [];
        }

        function withoutTimestampAndEmail(data) {
          if(data) {
            var result = data.indexOf('on 2') === -1 ? data : data.slice(0, data.indexOf('on 2')).trim();
            result = result.indexOf('<') === -1 ? result : result.slice(0, result.indexOf('<')).trim();
            return result;
          }
          return data;
        }

        function extractTimestamp(modifiedByString) {
          if(modifiedByString && modifiedByString.indexOf('on 2') !== -1) {
            return modifiedByString.slice(modifiedByString.indexOf('on 2') + 3);
          }
        }

        function promiseMaterials(stageId) {
          return globalOptions.getGocdRequestor().getMaterialHtml(stageId).then(function (html) {
            var $ = cheerio.load(html);
            try {
              var changes = $('.material_tab .change');

              var materials = _.map(changes, function (change) {
                var modifiedByString = $(change).find('.modified_by dd')[0].children[0].data;
                var author = withoutTimestampAndEmail(modifiedByString);
                var time = extractTimestamp(modifiedByString);
                var comment = $(change).find('.comment p')[0].children[0].data;
                var sha = $(change).find('.revision dd')[0].children[0].data;
                return {
                  buildNumber: pipelineRun.buildNumber,
                  comment: comment,
                  committer: author,
                  sha: sha,
                  time: time
                };
              });
              function compareByTimes(materialA, materialB) {
                return moment(materialA.time) < moment(materialB.time);
              }

              materials.sort(compareByTimes);
              return materials;

            } catch (error) {
              logger.error('ERROR loading material', error);
            }
          });
        }

        return promiseMaterials(pipelineRun.stages[0].id);

      }

      var commitDetailsPromises = promiseCommitDetails();
      return Q.all(commitDetailsPromises).then(function (details) {
        pipelineRun.materials = details;
        mapPipelineAuthor();
        mapInfoText();

        return DONE;

      }, function (err) {
        logger.debug('could not resolve details, returning without |', pipelineRun.buildNumber, err);

        mapInfoText();
        return DONE;
      });
    };

    function findStageByName(stageName) {
      return _.find(pipelineRun.stages, { name: stageName });
    }

    function promiseStageDetails() {

      function promiseStageDetails() {
        var stageUrls = _.compact(_.map(getLatestRunsOfStages(), function(stage) {
          return stage.detailsLink;
        }));
        return _.map(stageUrls, function(stageUrl) {
          return globalOptions.getGocdRequestor().getStageRunDetails(stageUrl);
        });
      }

      function mapDetailsIntoStages(stageDetails) {
        _.each(stageDetails, function(stageDetails) {
          var stage = findStageByName(stageDetails.stage.name);
          if(stage !== undefined) {

            stage.name = stageDetails.stage.name;
            stage.pipeline = stageDetails.stage.pipeline;
            stage.runNumber = stageDetails.stage.counter;
            stage.result = stageDetails.stage.result;
            stage.state = stageDetails.stage.state;
            stage.approvedBy = stageDetails.stage.approvedBy;

            stage.jobs = _.map(stageDetails.stage.jobs, function(jobDetail) {
              return {
                name: jobDetail.job.name,
                result: jobDetail.job.result,
                state: jobDetail.job.state,
                properties: jobDetail.job.properties.property
              }
            });
          } else {
            console.log('stage not found');//, stageDetails.stage.name, pipelineRun.stages);
          }
        });
        return pipelineRun.stages;
      }

      return Q.all(promiseStageDetails()).then(function (stageDetails) {
        mapDetailsIntoStages(stageDetails);
        mapPipelineFinishTime();
        mapPipelineResult();
        return DONE;
      });

    };

    function promiseInitialise() {

      try {
        return addStage(feedEntry)
          .then(promiseMaterialDetails)
          .then(promiseStageDetails);

      } catch(err) {
        logger.error('Error initialising pipeline run', err);
      }

      return [  ];
    }

    function addStage(stageData) {
      pipelineRun.stages.push(stageData);

      mapPipelineFinishTime();
      mapPipelineResult();

      return promiseStageDetails();

    }

    pipelineRun.promiseInitialise = promiseInitialise;
    pipelineRun.addStage = addStage;

    return pipelineRun;

  };

  return PipelineRunCreator;

};

exports.pipelineRun = pipelineRun();