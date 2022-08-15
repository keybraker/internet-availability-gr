const Crawler = require('crawler');
const editJsonFile = require("edit-json-file");
const fs = require('fs');

const stateList = require('./data/stateList.json');

if ((!process.argv[2] && process.argv[2] !== 'all') || (process.argv[2] !== 'all' && !process.argv[3])) {
    console.log('You must give Greek state and municipality ids as argument, or "all" to fetch them all.');
    return 0;
}

let statesToFetch = [];
let stateIdArg = process.argv[2];
let municipalityIdArg = process.argv[3];

if (stateIdArg === 'all') {
    statesToFetch = stateList.states.map(state => state);
} else {
    stateList.states.some(state => {
        if (state.id === stateIdArg) {
            statesToFetch.push(state);
            return true;
        }

        return false;
    });

    if (statesToFetch.length === 0) {
        console.log('You must give a valid, Greek state and municipality ids, state ids can be found in documentation.');
        return 0;
    }
}

let urlId = 1641891804000;
let queueStreetList = [];
let objectMunicipalityList = [];

for (let i in statesToFetch) {
    if (!statesToFetch[i].municipalitiesFilePath) {
        console.log('Before running municipalityCrawler.js you must first fetch all municipalities with stateCrawler.js.');
        return 0;
    }

    municipalityList = require(statesToFetch[i].municipalitiesFilePath);

    if (!municipalityList) {
        console.log('Before running municipalityCrawler.js you must first fetch all municipalities with stateCrawler.js.');
        return 0;
    }

    objectMunicipalityList.push({
        filePath: statesToFetch[i].municipalitiesFilePath,
        fileData: municipalityList
    });

    for (let j in municipalityList) {
        if (!fs.existsSync(municipalityList[j].streetsFilePath)) {
            if ((stateIdArg && stateIdArg.localeCompare('all') === 0) || (municipalityIdArg && municipalityIdArg.localeCompare('all') === 0)) {
                queueStreetList.push(`https://www.cosmote.gr/eshop/global/gadgets/populateAddressDetailsV3.jsp?` +
                    `filePath=${statesToFetch[i].municipalitiesFilePath}&` +
                    `stateId=${statesToFetch[i].id}&` +
                    `municipalityId=${municipalityList[j].id}&` +
                    `_=${urlId++}`);
            } else if (municipalityIdArg == municipalityList[j].id) {
                queueStreetList.push(`https://www.cosmote.gr/eshop/global/gadgets/populateAddressDetailsV3.jsp?` +
                    `filePath=${statesToFetch[i].municipalitiesFilePath}&` +
                    `stateId=${statesToFetch[i].id}&` +
                    `municipalityId=${municipalityList[j].id}&` +
                    `_=${urlId++}`);
                break;
            }
        }
    }
}

if (queueStreetList.length === 0) {
    console.log('You must give a valid, Greek municipality id.');
    return 0;
}

const c = new Crawler({
    maxConnections: 100,
    rateLimit: 100,

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

            const municipalityFile = objectMunicipalityList.find(municipalityFile => municipalityFile.filePath === filePath);

            const municipalities = municipalityFile.fileData;
            const municipalitiesFilePath = municipalityFile.filePath;

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
                                name: child2.data.toUpperCase(),
                                id: child2.parent.attribs.id,
                                prefecture: {},
                                speeds: []
                            });
                        });
                    }
                }
            }

            if (!fs.existsSync('./generated')) {
                fs.mkdirSync('./generated');
            }

            if (!fs.existsSync(`./generated/state_${stateId}/streets`)) {
                fs.mkdirSync(`./generated/state_${stateId}/streets`);
            }

            const currentMunicipality = municipalities.find(municipality => municipality.id === municipalityId);

            // editing and adding streets file path to municipality file
            currentMunicipality.streetsFilePath = `./generated/state_${stateId}/streets/streets_of_municipality_${municipalityId}.json`;
            const municipalitiesFile = editJsonFile(currentMunicipality.streetsFilePath);

            if (municipalitiesFile) {
                municipalitiesFile.write(JSON.stringify(streets));
            } else {
                fs.appendFile(state.streetsFilePath, JSON.stringify(streets), function (err) {
                    if (err) throw err;
                });
            }

            const municipalityJson = editJsonFile(municipalitiesFilePath);
            municipalityJson.write(JSON.stringify(municipalities));

            console.log(
                `Fetched ${streets.length} ${streets.length === 1 ? 'street' : 'streets'} for municipality ` +
                `${currentMunicipality.name} of state ${statesToFetch.find(state => state.id === stateId).name}.`
            );

            done();
        }
    }
});

c.queue(queueStreetList);