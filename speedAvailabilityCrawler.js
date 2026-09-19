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

    // NOTE: Cosmote rebranded to Telekom, so the endpoint below was renamed from cosmote.gr to
    // telekom.gr (the old cosmote.gr URL now redirects to telekom.gr).
    streetNumberArray.forEach(number => {
        queueStreetList.push((encodeURI(`https://www.telekom.gr/selfcare/jsp/ajax/avdslavailabilityAjaxV2.jsp?` +
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

// The availability response used to announce each speed tier in a sentence ("Έως 200Mbps Διαθέσιμο
// στην περιοχή σου!"), but it now returns a table where every tier available at the address gets
// its own row:
//
//   <tr class="res">
//       <td class="COSMOTE-FIBER">Telekom Fiber 200 Mbps</td>       (COSMOTE-FIBER is the site's
//       <td class="p table-para">Διαθέσιμο στην περιοχή σου...</td>  own legacy class name)
//   </tr>
//
// Only the residential table is read, since the analyzer counts households. Rows that are not
// reported as available, or that carry no speed, are ignored, and no rows at all means the
// address could not be resolved.
function parseNetworkAvailability($) {
    let residentialRows = $('#residential-search-panel tr');

    if (residentialRows.length === 0) {
        residentialRows = $('tr.res');
    }

    let fastestTier = 0;

    residentialRows.each((index, row) => {
        const cells = $(row).find('td');
        const label = cells.eq(0).text().replace(/\s+/g, ' ').trim();
        const status = cells.eq(1).text().replace(/\s+/g, ' ').trim();

        if (!status.includes('Διαθέσιμο') || status.includes('Μη διαθέσιμο')) {
            return;
        }

        const speed = label.match(/(\d+)\s*([GM])bps/i);

        if (!speed) {
            return;
        }

        // '1 Gbps' labels sit above 200 Mbps, so they count towards the fastest tier.
        const tier = Number(speed[1]) * (speed[2].toUpperCase() === 'G' ? 1000 : 1);

        fastestTier = Math.max(fastestTier, tier);
    });

    // Speeds are advertised as "up to X Mbps", so the fastest tier available at an address also
    // makes every slower tier available there.
    return {
        speed200: fastestTier >= 200,
        speed100: fastestTier >= 100,
        speed50: fastestTier >= 50,
        speed24: fastestTier >= 24
    };
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

            networkAvailability = parseNetworkAvailability($);

            street.speeds.push({
                streetNumber: streetNumber,
                networkAvailability: networkAvailability
            });

            if (networkAvailability.speed200 || networkAvailability.speed100 || networkAvailability.speed50 || networkAvailability.speed24 ||
                Number(streetNumber) < 20) {
                const streetsJsono = editJsonFile(streetsFilePath);
                streetsJsono.write(JSON.stringify(streets, null, 4));
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