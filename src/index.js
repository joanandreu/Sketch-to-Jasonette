const svgson = require("svgson");
const fs = require("fs");
const path = require("path");
const { makeDir } = require("./utils/utils");
const { prepData } = require("./input");
const { propEq, filter } = require("ramda");
const { processElement } = require("./process");
const util = require("util");
const pjson = require('../package.json');

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

const containsObject = (id, list) => {
  for (let i = 0; i < list.length; i++) {
      if (list[i].id === id) {
          return i;
      }
  }
  return false;
}

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

    console.log(`                                                                                
    _____   _           _           _         _                  __                                 _     _           
   |   __| | |_   ___| | |_   ___| | |_  ___ | |_   ___  ___  __|  | |___   ___   ___   ___   ___| | |_  | |_   ___   
   |__   | | '_| | -_| |  _| |  _| |   | ___ |  _| | . | ___ |  |  | | .'| |_ -| | . | |   | | -_| |  _| |  _| | -_|  
   |_____| |_,_| |___| |_| | |___| |_|_|     |_| | |___|     |_____| |__,| |___| |___| |_|_| |___| |_|   |_|   |___|  
                                                                                    `)

    console.log("Version : ", pjson.version);
    console.log("Your json file is in the output folder");

    console.log("Feel free to contribute to the project on Github: https://github.com/BREDFactory/Sketch-to-Jasonette");

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

    // Remove double brackets array from first section
    jasonettetemplate["$jason"].body.sections =
      jasonettetemplate["$jason"].body.sections[0];

    // Add items inside section part
    jasonettetemplate["$jason"].body.sections = 
      [{ "items": jasonettetemplate["$jason"].body.sections }]
    
    let rr = [] 

    /**
     * Process the label tags
     */
    
    await jasonettetemplate["$jason"].body.sections[0].items.map(element => {
      let width = parseInt(element.style.width) || 0
      let height = parseInt(element.style.height) || 0
      let x = parseInt(element.style.x)
      let y = parseInt(element.style.y)

      rr.push({id: element.id , width, height,x, y,  type: element.type, background: element.style.background})
    })

    rr.sort((a, b) => {
      return (a.y + a.height) - (b.y + b.height);
    });

    for(let i = 0;i < rr.length - 1; i++) {
      if (rr[i].type === "label" && rr[i+1].type === "space") {
        rr[i].background = rr[i+1].background 
        rr.splice(i+1, 1)
      } 
    }

    jasonettetemplate["$jason"].body.sections[0].items = 
      await jasonettetemplate["$jason"].body.sections[0].items.filter(element => {
        let test = containsObject(element.id, rr)
          if (test || test === 0) {
            element.style.background = rr[test].background
            return true
          }
        return false
      })

    /**
     * Process the spaces
     */

    jasonettetemplate["$jason"].body.sections[0].items.sort((a, b) => {
      return parseInt(a.style.y) - parseInt(b.style.y);
    });

    jasonettetemplate["$jason"].body.sections[0].items = 
      jasonettetemplate["$jason"].body.sections[0].items.reduce((arr, b) => {
        let element = { 
          id: 'empty-space',
          type: 'space',
          style:
           { background: 'transparent',
             x: b.style.x, 
             y: b.style.y,
             width: '109',
             height: "30"
           }}
        return [...arr, b, element]
      }, []);

    const mainElementChilds = mainElement.childs[0].childs;

    removeProp(jasonettetemplate, "childs");

    const StringifiedJasonette = JSON.stringify(jasonettetemplate);

  
    console.log(" ")
    console.log("Here is your json file : ")
    console.log(" ")
    console.log(StringifiedJasonette)

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
