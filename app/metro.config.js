// https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const config = getDefaultConfig(__dirname);

// Serve pipeline/dist files at /pipeline-data/ during local development.
// e.g. http://localhost:8081/pipeline-data/observations.json
const PIPELINE_DIST = path.join(__dirname, '../pipeline/dist');

config.server = {
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      const PREFIX = '/pipeline-data/';
      if (req.url.startsWith(PREFIX)) {
        const filename = req.url.slice(PREFIX.length).split('?')[0];
        const filePath = path.join(PIPELINE_DIST, filename);
        if (fs.existsSync(filePath)) {
          const contentType = filename.endsWith('.sqlite')
            ? 'application/octet-stream'
            : 'application/json';
          res.setHeader('Content-Type', contentType);
          res.setHeader('Access-Control-Allow-Origin', '*');
          fs.createReadStream(filePath).pipe(res);
          return;
        }
      }
      middleware(req, res, next);
    };
  },
};

module.exports = config;
