const data = require('./database/database_state.json');

let TWMbps = 0;
let FIMbps = 0;
let OHMbps = 0;
let THMbps = 0;

let noData = 0;
let withData = 0;

data.streets.forEach(street => {
    if (!street.numbers) {
        noData++;
    } else {
        withData++;
        street.numbers.forEach(number => {
            TWMbps += number.speeds.speed24 ? 1 : 0;
            FIMbps += number.speeds.speed50 ? 1 : 0;
            OHMbps += number.speeds.speed100 ? 1 : 0;
            THMbps += number.speeds.speed200 ? 1 : 0;
        });
    }
});

console.log(`In state ${data.state} and prefecture ${data.prefecture} there are:\n`,
    ` 24 Mbps have ${TWMbps}/${withData * 4}, which is ${((TWMbps/(withData * 4) * 100).toFixed(1))}% of all.\n`,
    ` 50 Mbps have ${FIMbps}/${withData * 4}, which is ${((FIMbps/(withData * 4) * 100).toFixed(1))}% of all.\n`,
    `100 Mbps have ${OHMbps}/${withData * 4}, which is ${((OHMbps/(withData * 4) * 100).toFixed(1))}% of all.\n`,
    `200 Mbps have ${THMbps}/${withData * 4}, which is ${((THMbps/(withData * 4) * 100).toFixed(1))}% of all.\n\n`,

    `${((FIMbps/TWMbps * 100).toFixed(1))}% of households with  24Mbps have also access to  50Mbps.\n`,
    `${((OHMbps/FIMbps * 100).toFixed(1))}% of households with  50Mbps have also access to 100Mbps.\n`,
    `${((THMbps/OHMbps * 100).toFixed(1))}% of households with 100Mbps have also access to 200Mbps.\n\n`,

    `Disclaimer: When a household has no type of internet, it is not out of the network, but that more investigation is needed.`
);