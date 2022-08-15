const Crawler = require('crawler');
const editJsonFile = require("edit-json-file");

const stateList = require('./data/stateList.json');

if ((!process.argv[2] && process.argv[2] !== 'all') || (process.argv[2] !== 'all' && !process.argv[3])) {
    console.log('You must give Greek state and municipality ids as argument, or "all" to fetch them all.');
    return 0;
}

let statesToFetch = [];
let stateIdArg = process.argv[2];
let municipalityIdArg = process.argv[3];
let computationSpeed = process.argv[4];

let municipalityList;
let streetList;

function uriGenerator(streetsFilePath, streetName, stateName, municipalityName, prefectureName) {
    const fewNumbers = [2, 5, 11, 16, 24];
    const alotNumbers = [2, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 38, 41, 44];
    const streetNumberArray = (computationSpeed === 'fast') ? fewNumbers : alotNumbers;

    streetNumberArray.forEach(number => {
        queueStreetList.push((encodeURI(`https://www.cosmote.gr/selfcare/jsp/ajax/avdslavailabilityAjaxV2.jsp?` +
            `Accept-Language=en-US,en;q=0.9,el-GR;q=0.8,el;q=0.7` +
            `mTelno=&` +
            `mFilePath=${streetsFilePath}&` +
            `mAddress=${streetName}&` +
            `mState=${stateName}&` +
            `mPrefecture=${municipalityName}&` +
            `mNumber=${number}&` +
            `mArea=${prefectureName}&` +
            `searchcriteria=address&` +
            `ct=bus`)))
    });
}

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

let queueStreetList = [];
let objectStreetList = [];

for (i in statesToFetch) {
    if (!statesToFetch[i].municipalitiesFilePath) {
        console.log('[1] Before running speedAvailabilityCrawler.js you must first fetch all municipalities with stateCrawler.js.');
        return 0;
    }

    const municipalityList = require(statesToFetch[i].municipalitiesFilePath);

    if (!municipalityList) {
        console.log('[2] Before running speedAvailabilityCrawler.js you must first fetch all municipalities with stateCrawler.js.');
        return 0;
    }

    for (j in municipalityList) {
        if (stateIdArg !== 'all') {
            if (municipalityIdArg !== 'all' && municipalityIdArg !== municipalityList[j].id) {
                continue;
            }
        }

        if (!municipalityList[j].streetsFilePath) {
            console.log('[3] Before running speedAvailabilityCrawler.js you must first fetch all streets with municipalityCrawler.js.');
            return 0;
        }

        const streetList = require(municipalityList[j].streetsFilePath);

        if (!streetList) {
            console.log('[4] Before running speedAvailabilityCrawler.js you must first fetch all streets with municipalityCrawler.js.');
            return 0;
        }

        objectStreetList.push({
            filePath: municipalityList[j].streetsFilePath,
            fileData: streetList
        });

        for (k in streetList) {
            if (!streetList[k].speeds || streetList[k].speeds.length === 0) {
                if ((stateIdArg && stateIdArg.localeCompare('all') === 0) || (municipalityIdArg && municipalityIdArg.localeCompare('all') === 0)) {
                    uriGenerator(municipalityList[j].streetsFilePath, streetList[k].name,
                        statesToFetch[i].name, municipalityList[j].name, streetList[k].prefecture.name);
                } else if (municipalityIdArg == municipalityList[j].id) {
                    uriGenerator(municipalityList[j].streetsFilePath, streetList[k].name,
                        statesToFetch[i].name, municipalityList[j].name, streetList[k].prefecture.name);
                }
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

    callback: (error, res, done) => {
        if (error) {
            console.log(error);
        } else {
            const $ = res.$;

            let uri = res.options.uri;

            filePath = uri.substring(uri.indexOf("mFilePath=") + 10, uri.indexOf("&mAddress="));
            streetName = decodeURI(uri.substring(uri.indexOf("mAddress=") + 9, uri.indexOf("&mState=")));
            streetNumber = uri.substring(uri.indexOf("mNumber=") + 8, uri.indexOf("&mArea="));
            municipalityName = decodeURI(uri.substring(uri.indexOf("mArea=") + 6, uri.indexOf("&searchcriteria")));

            const streetListFile = objectStreetList.find(streetListFile => streetListFile.filePath === filePath);

            const streets = streetListFile.fileData;
            const streetsFilePath = streetListFile.filePath;

            const street = streets.find(str => str.name === streetName);

            networkAvailability = {
                speed200: ($.text().replace(/\s/g, '')
                    .includes('Έως200MbpsΔιαθέσιμοστηνπεριοχήσου!')) ? true : false,
                speed100: ($.text().replace(/\s/g, '')
                    .includes('Έως100MbpsΔιαθέσιμοστηνπεριοχήσου!')) ? true : false,
                speed50: ($.text().replace(/\s/g, '')
                    .includes('Έως50MbpsΔιαθέσιμοστηνπεριοχήσου!')) ? true : false,
                speed24: ($.text().replace(/\s/g, '')
                    .includes('Έως24MbpsΔιαθέσιμοστηνπεριοχήσου!')) ? true : false
            };

            street.speeds.push({
                streetNumber: streetNumber,
                networkAvailability: networkAvailability
            });

            if (networkAvailability.speed200 || networkAvailability.speed100 || networkAvailability.speed50 || networkAvailability.speed24 ||
                Number(streetNumber) < 20) {
                const streetsJsono = editJsonFile(streetsFilePath);
                streetsJsono.write(JSON.stringify(streets));
            }

            const fastestAvailable = networkAvailability.speed200
                ? 'speeds of up to 200Mbps'
                : networkAvailability.speed100
                    ? 'speeds of up to 100Mbps'
                    : networkAvailability.speed50
                        ? 'speeds of up to 50Mbps'
                        : networkAvailability.speed24
                            ? 'speeds of up to 24Mbps'
                            : 'no available network';

            console.log(`Street ${street.name} - ${streetNumber} from municipality ${municipalityName} has ${fastestAvailable}.`);

            done();
        }
    }
});

c.queue(queueStreetList);