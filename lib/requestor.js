var Q = require('q');
var request = require('request');
var globalOptions = require('./options');
var logger = require('./logger');

function requestorModule() {

  var getUrl = function(url) {
    logger.debug('Requesting ', url);
    var defer = Q.defer();

    try {

      var requestOptions = {
        url: url,
        rejectUnauthorized: false,
        auth: globalOptions.authInfo()
      };

      request(requestOptions, function (error, response, body) {
        // TODO .auth('username', 'password', false); // https://www.npmjs.com/package/request#http-authentication
        if (error) {
          console.log('failed to get', url, error);
          defer.reject();
        } else {
          defer.resolve(body);
        }
      });
    } catch(error) {
      defer.reject(error);
    }

    return defer.promise;
  };

  return {
    getUrl: getUrl
  };
}

var requestor = requestorModule();
exports.getUrl = requestor.getUrl;
