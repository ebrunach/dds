// This imports the Emscripten JS as a module. We must compile with -sMODULARIZE=1.
var fs = require('fs');
var wasmBinary = fs.readFileSync('./a.out.wasm');

// Load the Emscripten JS and pass the binary directly
var createFactory = require('./a.out.js');
var factory = createFactory({ wasmBinary: wasmBinary });


factory.then((instance) => {
    console.log("DDS loaded");
    // Initialise DDS
    instance._dds_init();

    // Solve deals
    var deals = [
        "N:43.AQT4.842.AT94 AKT95.53.AQT6.Q3 Q2.KJ9.KJ97.K865 J876.8762.53.J72",
        "N:A4.AQT4.842.AT94 KT953.53.AQT6.Q3 Q2.KJ9.KJ97.K865 J876.8762.53.J72"
    ];

    var deals_string = deals.map(deal => deal.padEnd(80, ' ')).join('');

    const size = instance.lengthBytesUTF8(deals_string) + 1;
    var deals_string_ptr = instance._malloc(size);
    instance.stringToUTF8(deals_string, deals_string_ptr, size);

    if (!deals_string_ptr) {
        console.error("Failed to allocate memory for deals_string_ptr");
        return;
    }

    var noOfTables = deals.length;
    var structSize = instance._get_all_par_results_size(); // Taille de struct allParResults
    var resultSize = instance._get_par_results_size();
    var scoreOffset = instance._get_par_score_offset();
    var contractsOffset = instance._get_par_contracts_offset();

    // Allocation de la structure globale entière
    var all_par_results_ptr = instance._malloc(structSize);
    if (!all_par_results_ptr) {
        console.error("Failed to allocate memory for all_par_results_ptr");
        instance._free(deals_string_ptr);
        return;
    }

    var mode_ptr = instance._malloc(5 * 4);
    if (!mode_ptr) {
        console.error("Failed to allocate memory for mode_ptr");
        instance._free(deals_string_ptr);
        instance._free(all_par_results_ptr);
        return;
    }

    var ddTablesRes_ptr = instance._malloc(instance._get_dd_tables_res_size());
    if (!ddTablesRes_ptr) {
        console.error("Failed to allocate memory for ddTablesRes_ptr");
        instance._free(deals_string_ptr);
        instance._free(all_par_results_ptr);
        instance._free(mode_ptr);
        return;
    }

    instance._do_calc_all_par_results(deals_string_ptr, noOfTables, mode_ptr, all_par_results_ptr, ddTablesRes_ptr);

    var allParResults = [];
    for (var i = 0; i < noOfTables; i++) {
        // Dans struct allParResults, les tableaux de résultats sont indexés par table (souvent via un tableau interne 'res')
        // Si 'res' est le premier champ de allParResults, on peut itérer par resultSize :
        var basePtr = all_par_results_ptr + (i * resultSize);

        var parScore = [];
        for (var j = 0; j < 2; j++) {
            parScore[j] = "";
            for (var k = 0; k < 16; k++) {
                var chr = instance.getValue(basePtr + scoreOffset + (j * 16) + k, 'i8');
                if (chr != 0) {
                    parScore[j] += String.fromCharCode(chr);
                }
            }
        }

        var parContractsString = [];
        for (var j = 0; j < 2; j++) {
            parContractsString[j] = "";
            for (var k = 0; k < 128; k++) {
                var charCode = instance.getValue(basePtr + contractsOffset + (j * 128) + k, 'i8');
                if (charCode != 0) {
                    parContractsString[j] += String.fromCharCode(charCode);
                }
            }
        }

        allParResults.push({ parScore, parContractsString });
    }

    console.log("All Par Results:", allParResults);

    instance._free(all_par_results_ptr);
    instance._free(deals_string_ptr);
});



factory.then((instance) => {
    console.log("DDS loaded");
    // Initialise DDS
    instance._dds_init();

    // Solve deals
    var deals = [
        "N:43.AQT4.842.AT94 AKT95.53.AQT6.Q3 Q2.KJ9.KJ97.K865 J876.8762.53.J72",
        //"N:A4.AQT4.842.AT94 KT953.53.AQT6.Q3 Q2.KJ9.KJ97.K865 J876.8762.53.J72"
    ];

    var deals_string = deals.map(deal => deal.padEnd(80, ' ')).join('');
    const size = instance.lengthBytesUTF8(deals_string) + 1;
    var deals_string_ptr = instance._malloc(size);
    instance.stringToUTF8(deals_string, deals_string_ptr, size);
    if (!deals_string_ptr) {
        console.error("Failed to allocate memory for deals_string_ptr");
        return;
    }



    // Call the C function to solve the first deal using _do_dds_solve_board
    // The PBN string is passed unpadded: remainCards is a char[80] filled with strcpy.
    var pbn = deals[0];
    var pbn_size = instance.lengthBytesUTF8(pbn) + 1;
    var pbn_ptr = instance._malloc(pbn_size);
    instance.stringToUTF8(pbn, pbn_ptr, pbn_size);

    // The C code writes at least 26 ints (13 cards x (card, score)), padded with -1
    var OUTPUT_INTS = 26;
    var output_ptr = instance._malloc(OUTPUT_INTS * 4);

    var contract_bid = 4;   // trump = bid % 5 -> 4 = No Trump
    var hand_to_play = 1;   // 0=N, 1=E, 2=S, 3=W: East is on lead
    var NO_CARD = -1;       // no card played yet in the current trick

    var nodes = instance._do_dds_solve_board(
        contract_bid, hand_to_play,
        NO_CARD, NO_CARD, NO_CARD,
        pbn_ptr, output_ptr);

    // Output is pairs (card, score); card = (3 - suit) * 13 + (rank - 2), -1 = end
    var suitNames = ['S', 'H', 'D', 'C'];
    var rankNames = '23456789TJQKA';
    var results = [];
    for (var i = 0; i < OUTPUT_INTS; i += 2) {
        var card = instance.getValue(output_ptr + i * 4, 'i32');
        var score = instance.getValue(output_ptr + (i + 1) * 4, 'i32');
        if (card < 0) break;
        results.push({
            card: suitNames[3 - Math.floor(card / 13)] + rankNames[card % 13],
            tricks: score
        });
    }
    console.log("Nodes:", nodes);
    console.log("Solve result for first deal:", results);

    instance._free(output_ptr);
    instance._free(pbn_ptr);
    instance._free(deals_string_ptr);
});