const Crawler = require('crawler');

const addresses = [{
    address: 'ΘΕΡΜΟΠΥΛΩΝ (ΟΔΌΣ)',
    state: 'Ν. ΑΧΑΪΑΣ',
    prefecture: 'Δ. ΠΑΤΡΕΩΝ',
    number: 12,
    area: 'ΠΑΤΡΑ-ΚΩΝΣΤΑΝΤΙΝΟΥΠΟΛΕΩΣ'
}]

const c = new Crawler({
    maxConnections: 10,

    // This will be called for each crawled page
    callback: (error, res, done) => {
        if (error) {
            console.log(error);
        } else {
            const $ = res.$;
            // $ is Cheerio by default
            //a lean implementation of core jQuery designed specifically for the server

            if ($.text().replace(/\s/g, '').includes('Έως200Mbps')) { console.log('Έως 200 Mbps'); }
            if ($.text().replace(/\s/g, '').includes('Έως100Mbps')) { console.log('Έως 100 Mbps'); }
            if ($.text().replace(/\s/g, '').includes('Έως50Mbps')) { console.log('Έως 50 Mbps'); }
            if ($.text().replace(/\s/g, '').includes('Έως24Mbps')) { console.log('Έως 24 Mbps'); }
        }
        done();
    }
});

// Queue just one URL, with default callback
addresses.forEach(address => c.queue(`https://www.cosmote.gr/selfcare/jsp/ajax/avdslavailabilityAjaxV2.jsp?` +
    `Accept-Language=en-US,en;q=0.9,el-GR;q=0.8,el;q=0.7` +
    `mTelno=&m` +
    `Address=${encodeURI(address.address)}&m` +
    `State=${encodeURI(address.state)}&m` +
    `Prefecture=${encodeURI(address.prefecture)}&m` +
    `Number=22&m` +
    `Area=${encodeURI(address.area)}&` +
    `searchcriteria=address&` +
    `ct=bus`
));

//${encodeURI('Δ. ΠΑΤΡΕΩΝ')}&m
//Έως 200 Mbps