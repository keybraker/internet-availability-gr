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

let urlId = 1641891804000;
let queueStreetList = [];
let objectStreetList = [];

for (i in statesToFetch) {
    if (!statesToFetch[i].municipalitiesFilePath) {
        console.log('[1] Before running prefectureCrawler.js you must first fetch all municipalities with stateCrawler.js.');
        return 0;
    }

    municipalityList = require(statesToFetch[i].municipalitiesFilePath);

    if (!municipalityList) {
        console.log('[2] Before running prefectureCrawler.js you must first fetch all municipalities with stateCrawler.js.');
        return 0;
    }

    for (j in municipalityList) {
        if (municipalityIdArg !== 'All' && municipalityIdArg !== municipalityList[j].id) {
            continue;
        }

        if (!municipalityList[j].streetsFilePath) {
            console.log('[3] Before running prefectureCrawler.js you must first fetch all streets with municipalityCrawler.js.');
            return 0;
        }

        streetList = require(municipalityList[j].streetsFilePath);

        if (!streetList) {
            console.log('[4] Before running prefectureCrawler.js you must first fetch all streets with municipalityCrawler.js.');
            return 0;
        }

        objectStreetList.push({
            filePath: municipalityList[j].streetsFilePath,
            fileData: streetList
        });

        for (k in streetList) {
            if (!streetList[k].prefecture.id) {
                if ((stateIdArg && stateIdArg.localeCompare('All') === 0) || (municipalityIdArg && municipalityIdArg.localeCompare('All') === 0)) {
                    queueStreetList.push(encodeURI(`https://www.cosmote.gr/eshop/global/gadgets/populateAddressDetailsV3.jsp?` +
                        `filePath=${municipalityList[j].streetsFilePath}&` +
                        `streetName=${streetList[k].name}&` +
                        `stateId=${statesToFetch[i].id}&` +
                        `municipalityId=${municipalityList[j].id}&` +
                        `_=${urlId++}`));
                } else if (municipalityIdArg == municipalityList[j].id) {
                    queueStreetList.push(encodeURI(`https://www.cosmote.gr/eshop/global/gadgets/populateAddressDetailsV3.jsp?` +
                        `filePath=${municipalityList[j].streetsFilePath}&` +
                        `streetName=${streetList[k].name}&` +
                        `stateId=${statesToFetch[i].id}&` +
                        `municipalityId=${municipalityList[j].id}&` +
                        `_=${urlId++}`));
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
    maxConnections: 10,
    rateLimit: 800,

    // This will be called for each crawled page
    callback: (error, res, done) => {
        if (error) {
            console.log(error);
        } else {
            const $ = res.$;

            // finding current state
            let uri = res.options.uri;
            filePath = uri.substring(uri.indexOf("filePath=") + 9, uri.indexOf("&streetName="));
            streetName = decodeURI(uri.substring(uri.indexOf("streetName=") + 11, uri.indexOf("&stateId=")));
            stateId = uri.substring(uri.indexOf("stateId=") + 8, uri.indexOf("&municipalityId="));
            municipalityId = uri.substring(uri.indexOf("municipalityId=") + 15, uri.indexOf("&_="));

            const streetListFile = objectStreetList.find(streetListFile => streetListFile.filePath === filePath);

            const streets = streetListFile.fileData;
            const streetsFilePath = streetListFile.filePath;

            const street = streets.find(str => str.name === streetName);

            // finding states streets with resprective ids

            const lis = $("li");

            for (let i = 1; i < Object.keys(lis).length; i++) {
                const li = lis[i];
                if (li && li.name === 'li') {
                    if (li.children.length > 0) {
                        const child = li.children.find(child => child.type === 'tag' && child.name === 'a');
                        child.children.forEach(child2 => {
                            street.prefecture = {
                                name: child2.data,
                                id: child.attribs.id
                            };
                        });
                    }
                }
            }


            const streetsJsono = editJsonFile(streetsFilePath);
            streetsJsono.write(JSON.stringify(streets));

            console.log(`Street ${street.name} from municipality ${municipalityId} is in prefecture ${street.prefecture.name}.`);

            done(() => {
                console.log(`\nPrefecture crawler has finished successfully.`);
            });
        }
    }
});

c.queue(queueStreetList);