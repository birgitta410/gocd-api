
var _ = require('lodash');
var moment = require('moment');

function snapToGoConverterModule() {

  var Converter = {};

  Converter.convert = function(json) {
    if(json._embedded) {
      var result = {
        pipelines: json._embedded.pipelines
      };
      result.pagination = {
        offset: 0,
        total: result.pipelines.length,
        page_size: result.pipelines.length
      };
      result.pipelines = _.map(result.pipelines, function (pipeline) {
        return {
          label: pipeline.counter + '',
          id: pipeline.counter + '',
          'build_cause': {
            'material_revisions': [{
              changed: true,
              modifications: _.map(pipeline.commits, function (commit) {
                return {
                  'modified_time': moment(commit.time).valueOf(),
                  comment: commit.message,
                  'user_name': commit.author,
                  revision: commit.sha
                };
              })
            }]
          },
          stages: _.map(pipeline.stages, function (stage) {
            return {
              result: stage.result,
              name: stage.name,
              jobs: [
                {
                  result: stage.result,
                  'scheduled_date': moment(stage['started_at']).valueOf()
                }
              ],
              'last_scheduled': moment(stage['started_at']).valueOf()
            };
          })
        };

      });

      return result;
    }
  };

  return Converter;

}

var snapToGoConverter = snapToGoConverterModule();
module.exports.convert = snapToGoConverter.convert;
