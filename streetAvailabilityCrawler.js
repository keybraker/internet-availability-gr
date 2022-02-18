const Crawler = require('crawler');
const editJsonFile = require("edit-json-file");
const stateList = require('./data/stateList.json');
const file = editJsonFile(`${__dirname}/data/stateList.json`);

if (!process.argv[2]) {
    console.log('You must give a Greek state id and county id as argument, or "All" to fetch them all.');
    return 0;
}

let countyToFetch = [];
let stateId = process.argv[2];
let countyId = process.argv[3];

if (stateId === 'All') {
    countyToFetch = stateList.states.map(state => state);
} else {
    stateList.states.some(state => {
        if (state.id === stateId) {
            return state.counties.some(county => {
                if (county.id === countyId) {
                    countyToFetch.push({ stateName: state.name, countyObject: county });
                    return true;
                } else {
                    return false;
                }
            })
        }

        return false;
    });

    if (countyToFetch.length === 0) {
        console.log('You must give a valid Greek state, states can be found in documentation.');
        return 0;
    }

    let noCounties = false;
    countyToFetch.forEach(obj => {
        if (!obj.county.streets || obj.county.streets.lenght === 0) {
            console.log(`${obj.county.name} has no streets.`);
            noStreets = true;
        }
    })

    if (noStreets) {
        console.log('Before running streetAvailabilityCrawler.js you must first fetch all prefectures with prefectureCrawler.js.');
        return 0;
    }
}

let urlId = 1641891804000;
let queueList = [];

countyToFetch.forEach(obj => {
    obj.county.streets.forEach(street => {
        [2, 3, 6, 9, 12, 15, 16]
            .forEach(number => {
                queueList.push(
                    `https://www.cosmote.gr/selfcare/jsp/ajax/avdslavailabilityAjaxV2.jsp?` +
                    `Accept-Language=en-US,en;q=0.9,el-GR;q=0.8,el;q=0.7` +
                    `mTelno=&m` +
                    `Address=${encodeURI(street.name)}&m` +
                    `State=${encodeURI(obj.stateName)}&m` +
                    `Prefecture=${encodeURI(obj.county.name)}&m` +
                    `Number=${number}&m` +
                    `Area=${encodeURI(street.area)}&` +
                    `searchcriteria=address&` +
                    `ct=bus`
                );
            });
    })
});

const queueListA = data.streets
    .filter(s => s.numbers === undefined)
    // as fetching data for number would be excessive seven common numbers were chosen
    .map(street => [2, 3, 6, 9, 12, 15, 16]
        .map(number =>
            `https://www.cosmote.gr/selfcare/jsp/ajax/avdslavailabilityAjaxV2.jsp?` +
            `Accept-Language=en-US,en;q=0.9,el-GR;q=0.8,el;q=0.7` +
            `mTelno=&m` +
            `Address=${encodeURI(street.name)}&m` +
            `State=${encodeURI(data.state)}&m` +
            `Prefecture=${encodeURI(data.prefecture)}&m` +
            `Number=${number}&m` +
            `Area=${encodeURI(street.area)}&` +
            `searchcriteria=address&` +
            `ct=bus`)
    );

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
            stateId = uri.substring(uri.indexOf("stateId=") + 8, uri.indexOf("&municipalityId="));
            countyId = uri.substring(uri.indexOf("municipalityId=") + 15, uri.indexOf("&_="));
            const state = stateList.states.find(state => state.id === stateId);
            const county = state.counties.find(county => county.id === countyId);

            // finding states counties with resprective ids
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
                                id: child2.parent.attribs.id
                            });
                        });
                    }
                }
            }

            county.streets = streets;

            console.log(`Fetched ${county.streets.length} streets for county ${county.name} of state ${state.name}.`);

            file.write(JSON.stringify(stateList));
        }

        done(() => {
            file.save();
            file = editJsonFile(`${__dirname}/database/stateList.json`, {
                autosave: true
            });
        });
    }
});

c.queue(queueList);