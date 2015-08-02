var Q = require('q');
var request = require('request');
var globalOptions = require('./options');

function requestorModule() {

  var get = function(path) {

    var url = globalOptions.baseUrl() + path;
    console.log('Requesting ', url);

    var defer = Q.defer();

    request(url, function (error, response, body) {
      // TODO .auth('username', 'password', false); // https://www.npmjs.com/package/request#http-authentication
      if(error) {
        console.log('failed to get', url, error);
        defer.reject();
      } else {
        defer.resolve(body);
      }
    });

    return defer.promise;

  };

  return {
    get: get
  }
};

var requestor = requestorModule();
exports.get = requestor.get;
