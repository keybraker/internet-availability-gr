const Crawler = require('crawler');
const editJsonFile = require("edit-json-file");

const stateList = require('./data/stateList.json');

if ((!process.argv[2] && process.argv[2] !== 'All') || (process.argv[2] !== 'All' && !process.argv[3])) {
    console.log('You must give Greek state and municipality ids as argument, or "All" to fetch them all.');
    return 0;
}

let statesToFetch = [];
let stateIdArg = process.argv[2];
let municipalityIdArg = process.argv[3];

let municipalityList;
let streetList;

if (stateIdArg === 'All') {
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

    municipalityList = require(statesToFetch[i].municipalitiesFilePath);

    if (!municipalityList) {
        console.log('[2] Before running speedAvailabilityCrawler.js you must first fetch all municipalities with stateCrawler.js.');
        return 0;
    }

    for (j in municipalityList) {
        if (municipalityIdArg !== 'All' && municipalityIdArg !== municipalityList[j].id) {
            continue;
        }

        if (!municipalityList[j].streetsFilePath) {
            console.log('[3] Before running speedAvailabilityCrawler.js you must first fetch all streets with municipalityCrawler.js.');
            return 0;
        }

        streetList = require(municipalityList[j].streetsFilePath);

        if (!streetList) {
            console.log('[4] Before running speedAvailabilityCrawler.js you must first fetch all streets with municipalityCrawler.js.');
            return 0;
        }

        objectStreetList.push({
            filePath: municipalityList[j].streetsFilePath,
            fileData: streetList
        });

        for (k in streetList) {
            if (streetList[k].prefecture.id !== {}) {
                if ((stateIdArg && stateIdArg.localeCompare('All') === 0) || (municipalityIdArg && municipalityIdArg.localeCompare('All') === 0)) {
                    [2, 3, 6, 9, 12, 15, 16].forEach(number => {
                        queueStreetList.push((encodeURI(`https://www.cosmote.gr/selfcare/jsp/ajax/avdslavailabilityAjaxV2.jsp?` +
                            `Accept-Language=en-US,en;q=0.9,el-GR;q=0.8,el;q=0.7` +
                            `mTelno=&` +
                            `mFilePath=${municipalityList[j].streetsFilePath}&` +
                            `mAddress=${streetList[k].name}&` +
                            `mState=${statesToFetch[i].name}&` +
                            `mPrefecture=${municipalityList[j].name}&` +
                            `mNumber=${number}&` +
                            `mArea=${streetList[k].prefecture.name}&` +
                            `searchcriteria=address&` +
                            `ct=bus`)))
                    });
                } else if (municipalityIdArg == municipalityList[j].id) {
                    [2, 3, 6, 9, 12, 15, 16].forEach(number => {
                        queueStreetList.push((encodeURI(`https://www.cosmote.gr/selfcare/jsp/ajax/avdslavailabilityAjaxV2.jsp?` +
                            `Accept-Language=en-US,en;q=0.9,el-GR;q=0.8,el;q=0.7` +
                            `mTelno=&` +
                            `mFilePath=${municipalityList[j].streetsFilePath}&` +
                            `mAddress=${streetList[k].name}&` +
                            `mState=${statesToFetch[i].name}&` +
                            `mPrefecture=${municipalityList[j].name}&` +
                            `mNumber=${number}&` +
                            `mArea=${streetList[k].prefecture.name}&` +
                            `searchcriteria=address&` +
                            `ct=bus`)))
                    });
                }
            } else {
                console.log('[5] Before running speedAvailabilityCrawler.js you must first fetch all streets with prefectureCrawler.js.');
                return 0;
            }
        }
    }
}
console.log('queueStreetList :>> ', queueStreetList);
if (queueStreetList.length === 0) {
    console.log('You must give a valid, Greek municipality id.');
    return 0;
}

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
            filePath = uri.substring(uri.indexOf("mFilePath=") + 10, uri.indexOf("&mAddress="));
            streetName = decodeURI(uri.substring(uri.indexOf("mAddress=") + 9, uri.indexOf("&mState=")));
            streetNumber = uri.substring(uri.indexOf("mNumber=") + 8, uri.indexOf("&mArea="));
            municipalityName = decodeURI(uri.substring(uri.indexOf("mArea=") + 6, uri.indexOf("&searchcriteria")));

            const streetListFile = objectStreetList.find(streetListFile => streetListFile.filePath === filePath);

            const streets = streetListFile.fileData;
            const streetsFilePath = streetListFile.filePath;

            const street = streets.find(str => str.name === streetName);

            street.speeds.push({
                streetNumber: streetNumber,
                networkAvailability: {
                    speed200: ($.text().replace(/\s/g, '')
                        .includes('Έως200MbpsΔιαθέσιμοστηνπεριοχήσου!')) ? true : false,
                    speed100: ($.text().replace(/\s/g, '')
                        .includes('Έως100MbpsΔιαθέσιμοστηνπεριοχήσου!')) ? true : false,
                    speed50: ($.text().replace(/\s/g, '')
                        .includes('Έως50MbpsΔιαθέσιμοστηνπεριοχήσου!')) ? true : false,
                    speed24: ($.text().replace(/\s/g, '')
                        .includes('Έως24MbpsΔιαθέσιμοστηνπεριοχήσου!')) ? true : false
                }
            });

            const streetsJsono = editJsonFile(streetsFilePath);
            streetsJsono.write(JSON.stringify(streets));

            const fastestAvailable = street.speeds.speed200
                ? 'speeds of up to 200Mbps'
                : street.speeds.speed100
                    ? 'speeds of up to 100Mbps'
                    : street.speeds.speed50
                        ? 'speeds of up to 50Mbps'
                        : street.speeds.speed24
                            ? 'speeds of up to 24Mbps'
                            : 'no available network';

            console.log(`Street ${street.name} - ${streetNumber} from municipality ${municipalityName} has ${fastestAvailable}.`);

            done(() => {
                console.log(`\nPrefecture crawler has finished successfully.`);
            });
        }
    }
});

c.queue(queueStreetList[0]);