import * as fs from "fs"
import morphPlugin from "../src/main.js";

const 
     code = fs.readFileSync("./test/component.morph", "utf-8" )
    , plugin = morphPlugin ()
    ;

// Fake a prod transform
process.env.NODE_ENV = "production"
const result = plugin.transform ( code, "src/template.morph");

// console.log("=== Result ===")
// console.log( result.code )

