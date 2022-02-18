const Crawler = require('crawler');
const editJsonFile = require("edit-json-file");

const stateList = require('./data/stateList.json');

if (!process.argv[2]) {
    console.log('You must give Greek state and municipality ids as argument, or "All" to fetch them all.');
    return 0;
}

let statesToFetch = [];
let stateId = process.argv[2];

if (stateId === 'All') {
    statesToFetch = stateList.states.map(state => state);
} else {
    stateList.states.some(state => {
        if (state.id === stateId) {
            statesToFetch.push(state);
            return true;
        }

        return false;
    });

    if (statesToFetch.length === 0) {
        console.log('You must give a valid, Greek state and municipality ids, state ids can be found in documentation.');
        return 0;
    }

    let noCounties = false;
    statesToFetch.forEach(state => {
        if (!state.municipalityFilePath || state.municipalityFilePath === '') {
            console.log(`${state.name} has no municipalities file.`);
            noCounties = true;
        }
    })

    if (noCounties) {
        console.log('Before running countyCrawler.js you must first fetch all municipalities with stateCrawler.js.');
        return 0;
    }
}

let urlId = 1641891804000;
let queueStreetList = [];
let municipalityFiles = [];

statesToFetch.forEach(state => {
    const municipalities = require(state.municipalityFilePath);

    municipalityFiles.push({
        filePath: state.municipalityFilePath,
        fileData: municipalities
    });

    municipalities.forEach(municipality => {
        if (!municipality.streetsFilePath || municipality.streetsFilePath === '') {
            queueStreetList.push(`https://www.cosmote.gr/eshop/global/gadgets/populateAddressDetailsV3.jsp?` +
                `filePath=${encodeURI(state.municipalityFilePath)}&` +
                `stateId=${state.id}&` +
                `municipalityId=${municipality.id}&` +
                `_=${urlId++}`);
        }
    })
});

const c = new Crawler({
    maxConnections: 10,
    rateLimit: 1000,

    // This will be called for each crawled page
    callback: (error, res, done) => {
        if (error) {
            console.log(error);
        } else {
            const $ = res.$;

            // finding current state
            let uri = res.options.uri;
            filePath = uri.substring(uri.indexOf("filePath=") + 9, uri.indexOf("&stateId="));
            stateId = uri.substring(uri.indexOf("stateId=") + 8, uri.indexOf("&municipalityId="));
            municipalityId = uri.substring(uri.indexOf("municipalityId=") + 15, uri.indexOf("&_="));

            const municipalityFile = municipalityFiles.find(municipalityFile => municipalityFile.filePath === filePath);

            // finding states municipalities with resprective ids
            const lis = $("li");
            let streets = [];

            for (let i = 1; i < Object.keys(lis).length; i++) {
                const li = lis[i];
                if (li && li.name === 'li') {
                    if (li.children.length > 0) {
                        const child = li.children.find(child => child.type === 'tag' && child.name === 'a');
                        child.children.forEach(child2 => {
                            streets.push({
                                name: child2.data,
                                id: child2.parent.attribs.id,
                                speeds: {}
                            });
                        });
                    }
                }
            }

            municipalityFile.fileData.find(municipality => municipality.id === municipalityId).streetsFilePath = `./generated/streets/streets_of_county_${municipalityId}.json`;
console.log('municipalityFile.fileData :>> ', municipalityFile.fileData);
            const municipalitiesFile = editJsonFile(municipalityFile.fileData.streetsFilePath);
            if (municipalitiesFile) {
                municipalitiesFile.write(JSON.stringify(streets));
            } else {
                fs.appendFile(state.streetsFilePath, JSON.stringify(streets), function (err) {
                    if (err) throw err;
                });
            }

            const countiesJson = editJsonFile(municipalityFile.fileData.streetsFilePath);
            countiesJson.write(JSON.stringify(municipalityFile.fileData ));
            
            console.log(`Fetched ${streets.length} ${streets.length === 1 ? 'street' : 'streets'} for municipality ${municipality.fileData.name} of state ${state.name}.`);
        }
    }
});

c.queue(queueStreetList);