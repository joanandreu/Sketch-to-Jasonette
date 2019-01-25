const fs = require("fs");

module.exports.makeDir = path => {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
  }
};
