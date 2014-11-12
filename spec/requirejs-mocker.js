// Adapted from https://coderwall.com/p/teiyew
var _ = require('lodash');
function createContext(mocks) {

  /**
   * create a new map which will override the path to a given dependencies
   * so if we have a module in m1, requiresjs will look now unter
   * stub_m1
   **/
  var map = {};

  _.each(mocks, function (value, key) {
    var stubname = 'stub_' + key;

    map[key] = stubname;


  });

  /**
   * create a new context with the new dependency paths
   **/
  var context = require.config({
    context: Math.floor(Math.random() * 1000000),
    map: {
      "*": map
    }
  });

  /**
   * create new definitions that will return our passed stubs or mocks
   **/
  _.each(mocks, function (value, key) {
    var stubname = 'stub_' + key;

    define(stubname, function () {
      return value;
    });

  });

  return context;

}