const Crawler = require('crawler');
const editJsonFile = require("edit-json-file");
const data = require('./database.json');

let file = editJsonFile(`${__dirname}/database.json`);
let database = file.toObject();

// const prefectures = {
//     name: "Δ. ΗΡΑΚΛΕΙΟΥ",
//     list: [
//         "Δ.ΗΡΑΚΛΕΙΟΥ"
//     ]
// }

// const addresses = [{
//     address: 'ΠΑΤΡΙΑΡΧΟΥ ΓΡΗΓΟΡΙΟΥ Ε\' (ΟΔΌΣ)',
//     state: 'Ν. ΗΡΑΚΛΕΙΟΥ',
//     prefecture: 'Δ. ΗΡΑΚΛΕΙΟΥ',
//     number: 16,
//     area: 'ΜΑΣΤΑΜΠΑΣ'
// }];

const queueList = data.streets
    .filter(street => street.area === null)
    .map(street => {
        return `https://www.cosmote.gr/eshop/global/gadgets/populateAddressDetailsV3.jsp?` +
            `streetName=${encodeURI(street.name)}&` +
            `stateId=48&` +
            `&municipalityId=893&` +
            `_=1641891804001`
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
            // $ is Cheerio by default
            //a lean implementation of core jQuery designed specifically for the server

            let uri = res.options.uri;
            uri = uri.substring(84);
            uri = uri.substring(0, uri.indexOf("&stateId"));

            const street = decodeURI(uri);

            const entry = database.streets.find(s => s.name === street);
            if (entry) {
                console.log(`area for ${street} is `, $.text().replace(/\s/g, '').substring(7));

                entry.area = $.text().replace(/\s/g, '').substring(7);
                file.write(JSON.stringify(database));
            }

            if ($.text().replace(/\s/g, '').includes('Έως200MbpsΔιαθέσιμοστηνπεριοχήσου!')) {
                console.log('Έως 200 Mbps');
            }
            if ($.text().replace(/\s/g, '').includes('Έως100MbpsΔιαθέσιμοστηνπεριοχήσου!')) {
                console.log('Έως 100 Mbps');
            }
            if ($.text().replace(/\s/g, '').includes('Έως50MbpsΔιαθέσιμοστηνπεριοχήσου!')) {
                console.log('Έως  50 Mbps');
            }
            if ($.text().replace(/\s/g, '').includes('Έως24MbpsΔιαθέσιμοστηνπεριοχήσου!')) {
                console.log('Έως  24 Mbps');
            }
        }

        done(() => {
            file.save();
            file = editJsonFile(`${__dirname}/database.json`, {
                autosave: true
            });
        });
    }
});

c.queue(queueList);