const Crawler = require('crawler');
const editJsonFile = require("edit-json-file");
const fs = require('fs');

const stateList = require('./data/stateList.json');
const stateListSTATIC = editJsonFile(`./data/stateList.json`);

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
}

let urlId = 1641891804000;
let queueMunicipalityList = [];

for (let i in statesToFetch) {
    if (!statesToFetch[i].municipalitiesFilePath || statesToFetch[i].municipalitiesFilePath === '') {
        if (!municipalityList) {
            queueMunicipalityList.push(`https://www.cosmote.gr/eshop/global/gadgets/populateAddressDetailsV3.jsp?` +
                `stateId=${statesToFetch[i].id}&` +
                `_=${urlId++}`
            );
        }
    } else {
        if (!fs.existsSync(statesToFetch[i].municipalitiesFilePath)) {
            queueMunicipalityList.push(`https://www.cosmote.gr/eshop/global/gadgets/populateAddressDetailsV3.jsp?` +
                `stateId=${statesToFetch[i].id}&` +
                `_=${urlId++}`
            );
        }
    }
}

if (queueMunicipalityList.length === 0) {
    console.log('All municipalities have been fetched.');
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
            id = uri.substring(uri.indexOf("stateId=") + 8, uri.indexOf("&_="));

            const state = stateList.states.find(state => state.id === id);

            // finding states municipalities with resprective ids
            const lis = $("li");
            let municipalities = [];

            for (let i = 1; i < Object.keys(lis).length; i++) {
                const li = lis[i];
                if (li && li.name === 'li') {
                    if (li.children.length > 0) {
                        const child = li.children.find(child => child.type === 'tag' && child.name === 'a');
                        child.children.forEach(child2 => {
                            municipalities.push({
                                name: child2.data.toUpperCase(),
                                id: child2.parent.attribs.id,
                                streetsFilePath: ""
                            });
                        });
                    }
                }
            }

            if (!fs.existsSync('./generated')) {
                fs.mkdirSync('./generated');
            }

            if (!fs.existsSync(`./generated/state_${stateId}`)) {
                fs.mkdirSync((`./generated/state_${stateId}`));
            }

            state.municipalitiesFilePath = `./generated/state_${stateId}/municipalities.json`;

            const stateMunicipalities = editJsonFile(state.municipalitiesFilePath);
            if (stateMunicipalities) {
                stateMunicipalities.write(JSON.stringify(municipalities));
            } else {
                fs.appendFile(state.municipalitiesFilePath, JSON.stringify(municipalities), function (err) {
                    if (err) throw err;
                });
            }

            stateListSTATIC.write(JSON.stringify(stateList));

            console.log(`Fetched ${municipalities.length} ${municipalities.length === 1 ? 'municipality' : 'municipalities'} for state ${state.name}.`);

            done(() => {
                console.log(`\nState crawler has finished successfully.`);
            });
        }
    }
});

c.queue(queueMunicipalityList);