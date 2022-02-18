const Crawler = require('crawler');
const editJsonFile = require("edit-json-file");
const stateList = require('./data/stateList.json');
const file = editJsonFile(`${__dirname}/data/stateList.json`);

if (!process.argv[2]) {
    console.log('You must give Greek state and county ids as argument, or "All" to fetch them all.');
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
                    countyToFetch.push({ stateName: state.name, county: county });
                    return true;
                } else {
                    return false;
                }
            })
        }

        return false;
    });

    if (countyToFetch.length === 0) {
        console.log('You must give valid, Greek state and county ids, states can be found in documentation.');
        return 0;
    }

    let noStreets = false;
    countyToFetch.forEach(obj => {
        if (!obj.county.streets || obj.county.streets.lenght === 0) {
            console.log(`${obj.county.name} has no streets.`);
            noStreets = true;
        }
    })

    if (noStreets) {
        console.log('Before running prefectureCrawler.js you must first fetch all streets with countyCrawler.js.');
        return 0;
    }
}

let urlId = 1641891804000;
let queueList = [];

countyToFetch.forEach(obj => {
    if (obj.county.streets && obj.county.streets.length !== 0) {
        obj.county.streets.forEach(street => {
            queueList.push(`https://www.cosmote.gr/eshop/global/gadgets/populateAddressDetailsV3.jsp?` +
                `streetName=${encodeURI(street.name)}&` +
                `stateId=${stateId}&` +
                `municipalityId=${countyId}&` +
                `_=${urlId++}`);
        });
    }
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
            streetName = decodeURI(uri.substring(uri.indexOf("streetName=") + 11, uri.indexOf("&stateId=")));
            stateId = uri.substring(uri.indexOf("stateId=") + 8, uri.indexOf("&municipalityId="));
            countyId = uri.substring(uri.indexOf("municipalityId=") + 15, uri.indexOf("&_="));

            
            const state = stateList.states.find(state => state.id === stateId);
            const county = state.counties.find(county => county.id === countyId);
            console.log('county :>> ', county);
            console.log('streetName :>> ', streetName);
            const street = county.streets.find(str => str.name === streetName);

            // finding states counties with resprective ids

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

            console.log(`Street ${street.name} is in prefecture ${street.prefecture.name}.`);

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