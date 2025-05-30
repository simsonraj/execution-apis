import fs from "fs";
import yaml from "js-yaml";
import mergeAllOf from "json-schema-merge-allof";
import { dereferenceDocument } from "@open-rpc/schema-utils-js";
import  { XErrorGroupsJSON } from "@open-rpc/extensions";

function sortByMethodName(methods) {
  return methods.slice().sort((a, b) => {
    if (a['name'] > b['name']) {
      return 1;
    } else if (a['name'] < b['name']) {
      return -1;
    } else {
      return 0;
    }
  })
}

console.log("Loading files...\n");

let methods = [];
let methodsBase = "src/eth/";
let methodFiles = fs.readdirSync(methodsBase);
methodFiles.forEach(file => {
  console.log(file);
  let raw = fs.readFileSync(methodsBase + file);
  let parsed = yaml.load(raw);
  methods = [
    ...methods,
    ...parsed,
  ];
});

methodsBase = "src/debug/";
methodFiles = fs.readdirSync(methodsBase);
methodFiles.forEach(file => {
  console.log(file);
  let raw = fs.readFileSync(methodsBase + file);
  let parsed = yaml.load(raw);
  methods = [
    ...methods,
    ...parsed,
  ];
});

methodsBase = "src/engine/openrpc/methods/";
methodFiles = fs.readdirSync(methodsBase);
methodFiles.forEach(file => {
  console.log(file);
  let raw = fs.readFileSync(methodsBase + file);
  let parsed = yaml.load(raw);
  methods = [
    ...methods,
    ...parsed,
  ];
});

let schemas = {};
let schemasBase = "src/schemas/"
let schemaFiles = fs.readdirSync(schemasBase);
schemaFiles.forEach(file => {
  console.log(file);
  let raw = fs.readFileSync(schemasBase + file);
  let parsed = yaml.load(raw);
  schemas = {
    ...schemas,
    ...parsed,
  };
});

schemasBase = "src/engine/openrpc/schemas/"
schemaFiles = fs.readdirSync(schemasBase);
schemaFiles.forEach(file => {
  console.log(file);
  let raw = fs.readFileSync(schemasBase + file);
  let parsed = yaml.load(raw);
  schemas = {
    ...schemas,
    ...parsed,
  };
});

let extensionSpecs = [];
let extensionSpecsBase = "src/extensions/"
let extensionsSpecsFiles = fs.readdirSync(extensionSpecsBase);
extensionsSpecsFiles.forEach(file => {
  console.log(file);
  // skip if directory
  if (fs.lstatSync(extensionSpecsBase + file).isDirectory()) {
    return;
  }
  let raw = fs.readFileSync(extensionSpecsBase + file);
  let parsed = yaml.load(raw);
  extensionSpecs.push(parsed);
});

extensionSpecs.push(XErrorGroupsJSON);

let extensions = [];
let extensionsBase = "src/extensions/components/"
let extensionsFiles = fs.readdirSync(extensionsBase);
extensionsFiles.forEach(file => {
  console.log(file);
  let raw = fs.readFileSync(extensionsBase + file);
  let parsed = yaml.load(raw);  
  extensions.push(parsed);
});

// if extensions key matches with extensionSpecs name, then add it to an array of extensionSpec name
let extensionsDef = {};
extensionSpecs.forEach((extensionSpec) => {
  extensions.forEach((extension) => {
    if (extension.hasOwnProperty(extensionSpec.name)) {     
      extensionsDef[extensionSpec.name] ={
        ...extensionsDef[extensionSpec.name],
        ...extension[extensionSpec.name]  
      }
    }
  });
});

const doc = {
  openrpc: "1.2.4",
  info: {
    title: "Ethereum JSON-RPC Specification",
    description: "A specification of the standard interface for Ethereum clients.",
    license: {
      name: "CC0-1.0",
      url: "https://creativecommons.org/publicdomain/zero/1.0/legalcode"
    },
    version: "0.0.0"
  },
  methods: sortByMethodName(methods),
  "x-extensions": extensionSpecs,
  components: {
    ...extensionsDef,
    schemas: schemas
  }
}

fs.writeFileSync('refs-openrpc.json', JSON.stringify(doc, null, '\t'));

let spec = await dereferenceDocument(doc);

spec.components = {};

// Merge instances of `allOf` in methods.
for (var i=0; i < spec.methods.length; i++) {
  for (var j=0; j < spec.methods[i].params.length; j++) {
    spec.methods[i].params[j].schema = mergeAllOf(spec.methods[i].params[j].schema);
  }
  spec.methods[i].result.schema = mergeAllOf(spec.methods[i].result.schema);
}

let data = JSON.stringify(spec, null, '\t');
fs.writeFileSync('openrpc.json', data);

console.log();
console.log("Build successful.");
