const yargs = require('yargs');
const fs = require('fs');

const argv = yargs
    .option('municipalityFile', {
        alias: 'm',
        description: 'Tells if file is municipality file',
        type: 'string'
    })
    .option('streetFile', {
        alias: 's',
        description: 'Tells if file is street file',
        type: 'string'
    })
    .help().alias('help', 'h')
    .argv;

if (!(argv.m || argv.s)) {
    console.log('You must give a street or a municipality file path as input.');
    return 0;
} else if (argv.m && argv.s) {
    console.log('You must give only one between a street or a municipality file path as input.');
    return 0;
}

if (argv.s) {
    if (!fs.existsSync(argv.s)) {
        console.log(`Street file ${argv.s}, does not exist.`);
        return 0;
    }

    const streetList = require(`./${argv.s}`);

    const { FIMbps, OHMbps, THMbps, TWMbps, withData } = streetFileAnalyzer(streetList);

    console.log(`Network availability analyzer:\n`,
        ` 24 Mbps have ${TWMbps}/${withData}, which is ${((TWMbps / (withData) * 100).toFixed(1))}% of all.\n`,
        ` 50 Mbps have ${FIMbps}/${withData}, which is ${((FIMbps / (withData) * 100).toFixed(1))}% of all.\n`,
        `100 Mbps have ${OHMbps}/${withData}, which is ${((OHMbps / (withData) * 100).toFixed(1))}% of all.\n`,
        `200 Mbps have ${THMbps}/${withData}, which is ${((THMbps / (withData) * 100).toFixed(1))}% of all.\n\n`,

        `${((FIMbps / TWMbps * 100).toFixed(1))}% of households with  24Mbps have also access to  50Mbps.\n`,
        `${((OHMbps / FIMbps * 100).toFixed(1))}% of households with  50Mbps have also access to 100Mbps.\n`,
        `${((THMbps / OHMbps * 100).toFixed(1))}% of households with 100Mbps have also access to 200Mbps.\n\n`
    );

} else if (argv.m) {
    if (!fs.existsSync(argv.m)) {
        console.log(`Municipality file ${argv.m}, does not exist.`);
        return 0;
    }

    const municipalityList = require(`./${argv.m}`);

    let FIMbpsAll = 0, OHMbpsAll = 0, THMbpsAll = 0, TWMbpsAll = 0, withDataAll = 0;

    for (let j in municipalityList) {
        if (fs.existsSync(municipalityList[j].streetsFilePath)) {
            const streetList = require(municipalityList[j].streetsFilePath);

            const { FIMbps, OHMbps, THMbps, TWMbps, withData } = streetFileAnalyzer(streetList);

            FIMbpsAll += FIMbps;
            OHMbpsAll += OHMbps;
            THMbpsAll += THMbps;
            TWMbpsAll += TWMbps;
            withDataAll += withData;
        } else {
            console.log(`Streets file ${municipalityList[j].streetsFilePath}, does not exist.`);
        }
    }

    console.log(`Network availability analyzer:\n`,
        ` 24 Mbps have ${TWMbpsAll}/${withDataAll}, which is ${((TWMbpsAll / (withDataAll) * 100).toFixed(1))}% of all.\n`,
        ` 50 Mbps have ${FIMbpsAll}/${withDataAll}, which is ${((FIMbpsAll / (withDataAll) * 100).toFixed(1))}% of all.\n`,
        `100 Mbps have ${OHMbpsAll}/${withDataAll}, which is ${((OHMbpsAll / (withDataAll) * 100).toFixed(1))}% of all.\n`,
        `200 Mbps have ${THMbpsAll}/${withDataAll}, which is ${((THMbpsAll / (withDataAll) * 100).toFixed(1))}% of all.\n\n`,

        `${((FIMbpsAll/ TWMbpsAll * 100).toFixed(1))}% of households with  24Mbps have also access to  50Mbps.\n`,
        `${((OHMbpsAll/ FIMbpsAll * 100).toFixed(1))}% of households with  50Mbps have also access to 100Mbps.\n`,
        `${((THMbpsAll/ OHMbpsAll * 100).toFixed(1))}% of households with 100Mbps have also access to 200Mbps.\n\n`
    );
}

function streetFileAnalyzer(streetFile) {
    let TWMbps = 0;
    let FIMbps = 0;
    let OHMbps = 0;
    let THMbps = 0;
    let withData = 0;

    streetFile.forEach(street => {
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

    return { FIMbps, OHMbps, THMbps, TWMbps, withData };
}