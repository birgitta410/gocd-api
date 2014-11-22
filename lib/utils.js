
var GO_PIPELINES_DETAILS_ENDPOINT = '/go/tab/build/detail/';
var GO_PIPELINES_ENDPOINT = '/go/pipelines/';

function parseParametersFromJobRunUrl(id) {
  if (id === undefined) return { };

  if(id.indexOf('build/detail') > -1) {
    return parseParametersFromJobDetailUrl(id);
  }

  // http://the-go-host:8153/go/pipelines/A-PIPELINE/1199/functional-test/1
  var parameterString = id.substring(id.indexOf(GO_PIPELINES_ENDPOINT) + GO_PIPELINES_ENDPOINT.length);
  var parameters = parameterString.split('/');
  return {
    buildNumber: parameters[1],
    name: parameters[2] // Need to set name here, otherwise cannot tie together with other data later
  };
}

function parseParametersFromJobDetailUrl(id) {
  // http://192.168.50.79:8153/go/tab/build/detail/artwise/36/build/1/randomlyFails
  var parameterString = id.substring(id.indexOf(GO_PIPELINES_DETAILS_ENDPOINT) + GO_PIPELINES_DETAILS_ENDPOINT.length);
  var parameters = parameterString.split('/');

  return {
    pipeline: parameters[0],
    buildNumber: parameters[1],
    stageName: parameters[2],
    runNumber: parameters[3],
    jobName: parameters[4]
  };
}

exports.parseParametersFromJobRunUrl = parseParametersFromJobRunUrl;
exports.parseParametersFromJobDetailUrl = parseParametersFromJobDetailUrl;