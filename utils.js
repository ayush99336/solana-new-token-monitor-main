"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeData = void 0;
const fs_1 = __importDefault(require("fs"));
function storeData(dataPath, newData) {
    fs_1.default.readFile(dataPath, (err, fileData) => {
        if (err) {
            console.error(`Error reading file: ${err}`);
            return;
        }
        let json;
        try {
            json = JSON.parse(fileData.toString());
        }
        catch (parseError) {
            console.error(`Error parsing JSON from file: ${parseError}`);
            return;
        }
        json.push(newData);
        fs_1.default.writeFile(dataPath, JSON.stringify(json, null, 2), (writeErr) => {
            if (writeErr) {
                console.error(`Error writing file: ${writeErr}`);
            }
            else {
                console.log(`New token data stored successfully.`);
            }
        });
    });
}
exports.storeData = storeData;
