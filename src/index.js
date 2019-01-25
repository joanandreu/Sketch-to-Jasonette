const svgson = require("svgson");
const fs = require("fs");
const path = require("path");
const { makeDir } = require("./utils/utils");
const { prepData } = require("./input");
const { propEq, filter } = require("ramda");
const { processElement } = require("./process");
const util = require("util");

const jasonettetemplate = require("./utils/jasonette.template.json");

const INPUT_FILE = process.argv[2];

const pathArray = INPUT_FILE.split("/");
const INPUT_FILENAME = pathArray[pathArray.length - 1];

if (!INPUT_FILE || INPUT_FILE == "" || !INPUT_FILE.match(/\.svg$/)) {
  throw "You must provide a .svg file";
}

const INPUT_FILE_NO_SPACES = INPUT_FILENAME.replace(/\s/g, "_").split(
  ".svg"
)[0];
const OUTPUT_FILE = INPUT_FILE_NO_SPACES.split(".svg")[0] + ".json";

const OUTPUT_DIR = "output";
const TEMP_DIR = "temp";

// Create an output directory
makeDir(OUTPUT_DIR);
makeDir(TEMP_DIR);

const countBack = (INPUT_FILE.match(/(\.\.)/g) || []).length;

const dirnameSplit = __dirname.split("/").slice(0, -1);

const pathFile = dirnameSplit
  .slice(0, dirnameSplit.length - countBack)
  .join("/");

const pathToFile = pathFile.concat(
  "/",
  INPUT_FILE.replace(/(\.\.\/)|(\.\/)/g, "")
);

fs.readFile(pathToFile, "utf-8", (error, data) => {
  const preppedData = prepData({
    data,
    tempDir: TEMP_DIR,
    inputFile: INPUT_FILENAME
  });

  svgson(preppedData, {}, async function(result) {
    const nodes = processElement(result);

    const MOBILE_WIDTH = result.attrs.width;
    const MOBILE_HEIGHT = result.attrs.height;

    const ELEMENTS = result.childs;

    // Find the main svg element
    const isMainElement = propEq("name", "g");
    const mainElement = filter(isMainElement, ELEMENTS)[0];

    // Process head

    const TITLE = result.childs[0].childs[0].text;
    const HEAD_STYLE = nodes.style;

    jasonettetemplate["$jason"].head.title = TITLE;
    jasonettetemplate["$jason"].body = nodes.childs[0];
    jasonettetemplate["$jason"].body.style = HEAD_STYLE;

    // Remove double brackets array from sections
    jasonettetemplate["$jason"].body.sections =
      jasonettetemplate["$jason"].body.sections[0];

    const mainElementChilds = mainElement.childs[0].childs;

    removeProp(jasonettetemplate, "childs");

    const StringifiedJasonette = JSON.stringify(jasonettetemplate);

    fs.writeFileSync(OUTPUT_DIR + "/" + OUTPUT_FILE, StringifiedJasonette);
  });
});

const removeProp = (obj, propToDelete) => {
  for (let property in obj) {
    if (obj.hasOwnProperty(property)) {
      if (typeof obj[property] == "object") {
        removeProp(obj[property], propToDelete);
      }
      if (property === propToDelete) {
        delete obj[property];
      }
    }
  }
};
