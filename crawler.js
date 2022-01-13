const Crawler = require('crawler');
const editJsonFile = require("edit-json-file");
const data = require('./database.json');

let file = editJsonFile(`${__dirname}/database.json`);
let database = file.toObject();

// const addresses = [{
//     address: 'ΠΑΤΡΙΑΡΧΟΥ ΓΡΗΓΟΡΙΟΥ Ε\' (ΟΔΌΣ)',
//     state: 'Ν. ΗΡΑΚΛΕΙΟΥ',
//     prefecture: 'Δ. ΗΡΑΚΛΕΙΟΥ',
//     number: 16,
//     area: 'ΜΑΣΤΑΜΠΑΣ'
// }];

// const queueList = data.streets
//     .filter(street => street.area === null)
//     .map(street => {
//         return `https://www.cosmote.gr/eshop/global/gadgets/populateAddressDetailsV3.jsp?` +
//             `streetName=${encodeURI(street.name)}&` +
//             `stateId=48&` +
//             `&municipalityId=893&` +
//             `_=1641891804001`
//     });

const queueListA = data.streets
    .filter(s => s.numbers === undefined)
    .map(street => [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]
        .map(number =>
            `https://www.cosmote.gr/selfcare/jsp/ajax/avdslavailabilityAjaxV2.jsp?` +
            `Accept-Language=en-US,en;q=0.9,el-GR;q=0.8,el;q=0.7` +
            `mTelno=&m` +
            `Address=${encodeURI(street.name)}&m` +
            `State=${encodeURI(data.prefecture)}&m` +
            `Prefecture=${encodeURI(data.prefecture)}&m` +
            `Number=${number}&m` +
            `Area=${encodeURI(data.area)}&` +
            `searchcriteria=address&` +
            `ct=bus`
        )
    );

const queueList = [];
queueListA
    .forEach(street => {
        street
            .forEach(number => {
                queueList.push(number);
            });
    });

const c = new Crawler({
    maxConnections: 10,
    rateLimit: 800,

    // This will be called for each crawled page
    callback: (error, res, done) => {
        if (error) {
            console.log(error);
        } else {
            const $ = res.$;

            let uri = res.options.uri;
            uriStreetName = uri.substring(uri.indexOf("&mAddress=") + 10, uri.indexOf("&mState="));
            uriStreetNumber = uri.substring(uri.indexOf("&mNumber=") + 9, uri.indexOf("&mArea="));

            const street = decodeURI(uriStreetName);
            const entry = database.streets.find(s => s.name === street);

            if (entry) {
                if (!entry.numbers) entry.numbers = [];
                entry.numbers.push({ value: uriStreetNumber, speeds: {} });

                const number = entry.numbers.find(n => n.value === uriStreetNumber);
                if (number) {
                    console.log(`On ${street} with number ${uriStreetNumber}`);
                    number.speeds = {
                        speed200: ($.text().replace(/\s/g, '')
                            .includes('Έως200MbpsΔιαθέσιμοστηνπεριοχήσου!')) ? true : false,
                        speed100: ($.text().replace(/\s/g, '')
                            .includes('Έως100MbpsΔιαθέσιμοστηνπεριοχήσου!')) ? true : false,
                        speed50: ($.text().replace(/\s/g, '')
                            .includes('Έως50MbpsΔιαθέσιμοστηνπεριοχήσου!')) ? true : false,
                        speed24: ($.text().replace(/\s/g, '')
                            .includes('Έως24MbpsΔιαθέσιμοστηνπεριοχήσου!')) ? true : false
                    }
                }

                file.write(JSON.stringify(database));
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

c.queue(queueList[1766]);

c.on('drain', () => {
    file.save();
    file = editJsonFile(`${__dirname}/database.json`, {
        autosave: true
    });
});