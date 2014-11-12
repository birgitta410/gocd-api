var requirejs = require('requirejs');

requirejs.config({
  //Pass the top-level main.js/index.js require
  //function to requirejs so that node modules
  //are loaded relative to the top-level JS file.
  nodeRequire: require
});

requirejs(['server'],function(server) {
  var port = process.env.PORT || 5000
  server.listen(port);

  console.log('http server listening on %d', port);
});