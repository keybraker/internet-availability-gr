const Crawler = require('crawler');
const editJsonFile = require("edit-json-file");
const data = require('./database.json');

let file = editJsonFile(`${__dirname}/database.json`);
let database = file.toObject();

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
                    console.log(
                        `On ${street} - ${uriStreetNumber}: ` +
                        ` 24Mbps ${number.speeds.speed24}, ` +
                        ` 50Mbps ${number.speeds.speed50}, ` +
                        `100Mbps ${number.speeds.speed100}, ` +
                        `200Mbps ${number.speeds.speed200}`
                    );
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

c.queue(queueList);

c.on('drain', () => {
    file.save();
    file = editJsonFile(`${__dirname}/database.json`, {
        autosave: true
    });
});