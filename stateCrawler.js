const Crawler = require('crawler');
const editJsonFile = require("edit-json-file");
const fs = require('fs');

const stateList = require('./data/stateList.json');
const stateListSTATIC = editJsonFile(`./data/stateList.json`);

if (!process.argv[2]) {
    console.log('You must give Greek state and county ids as argument, or "All" to fetch them all.');
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
        console.log('You must give a valid, Greek state and county ids, state ids can be found in documentation.');
        return 0;
    }
}

let urlId = 1641891804000;
const queueCountyList = statesToFetch
    .map(state => {
        if (!state.countiesFilePath || state.countiesFilePath === '') {
            return `https://www.cosmote.gr/eshop/global/gadgets/populateAddressDetailsV3.jsp?` +
                `stateId=${state.id}&` +
                `_=${urlId++}`;
        }
    })
    .filter(url => !!url);

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
            id = uri.substring(uri.indexOf("stateId=") + 8, uri.indexOf("&_="));

            const state = stateList.states.find(state => state.id === id);

            // finding states counties with resprective ids
            const lis = $("li");
            let counties = [];

            for (let i = 1; i < Object.keys(lis).length; i++) {
                const li = lis[i];
                if (li && li.name === 'li') {
                    if (li.children.length > 0) {
                        const child = li.children.find(child => child.type === 'tag' && child.name === 'a');
                        child.children.forEach(child2 => {
                            counties.push({
                                name: child2.data.toUpperCase(),
                                id: child2.parent.attribs.id,
                                streetsFilePath: ""
                            });
                        });
                    }
                }
            }

            state.countiesFilePath = `./generated/counties/counties_of_state_${state.id}.json`;

            const stateCounties = editJsonFile(state.countiesFilePath);
            if (stateCounties) {
                stateCounties.write(JSON.stringify(counties));
            } else {
                fs.appendFile(state.countiesFilePath, JSON.stringify(counties), function (err) {
                    if (err) throw err;
                });
            }

            stateListSTATIC.write(JSON.stringify(stateList));

            console.log(`Fetched ${counties.length} ${counties.length === 1 ? 'county' : 'counties'} for state ${state.name}.`);
        }
    }
});

c.queue(queueCountyList);