const fs = require('fs');

if (!process.argv[2]) {
    console.log('You must give a street or a municipality file path as input.');
    return 0;
}

if (!fs.existsSync(process.argv[2])) {
    console.log(`${process.argv[2]} does not exist.`);
    return 0;
}

const fileJson = require(`./${process.argv[2]}`);
let TWMbps = 0;
let FIMbps = 0;
let OHMbps = 0;
let THMbps = 0;
let withData = 0;

fileJson.forEach(street => {
    if (street.speeds) {
        withData += street.speeds.length;
        street.speeds.forEach(streetNumber => {
            TWMbps += streetNumber.networkAvailability.speed24 ? 1 : 0;
            FIMbps += streetNumber.networkAvailability.speed50 ? 1 : 0;
            OHMbps += streetNumber.networkAvailability.speed100 ? 1 : 0;
            THMbps += streetNumber.networkAvailability.speed200 ? 1 : 0;
        });
    }
});

console.log(`Network availability analyzer:\n`,
    ` 24 Mbps have ${TWMbps}/${withData}, which is ${((TWMbps / (withData) * 100).toFixed(1))}% of all.\n`,
    ` 50 Mbps have ${FIMbps}/${withData}, which is ${((FIMbps / (withData) * 100).toFixed(1))}% of all.\n`,
    `100 Mbps have ${OHMbps}/${withData}, which is ${((OHMbps / (withData) * 100).toFixed(1))}% of all.\n`,
    `200 Mbps have ${THMbps}/${withData}, which is ${((THMbps / (withData) * 100).toFixed(1))}% of all.\n\n`,

    `${((FIMbps / TWMbps * 100).toFixed(1))}% of households with  24Mbps have also access to  50Mbps.\n`,
    `${((OHMbps / FIMbps * 100).toFixed(1))}% of households with  50Mbps have also access to 100Mbps.\n`,
    `${((THMbps / OHMbps * 100).toFixed(1))}% of households with 100Mbps have also access to 200Mbps.\n\n`
);