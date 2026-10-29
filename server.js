// This imports the Emscripten JS as a module. We must compile with -sMODULARIZE=1.
var factory = require('./a.out.js');


factory().then((instance) => {
    console.log("DDS loaded");
    // Initialise DDS
    instance._dds_init();

    // Solve deals
    var deals = [
        "N:43.AQT4.842.AT94 AKT95.53.AQT6.Q3 Q2.KJ9.KJ97.K865 J876.8762.53.J72",
        "N:A4.AQT4.842.AT94 KT953.53.AQT6.Q3 Q2.KJ9.KJ97.K865 J876.8762.53.J72"
    ];

    var deals_string = deals.map(deal => deal.padEnd(80, ' ')).join('');
    var deals_string_ptr = instance.allocateUTF8(deals_string);
    if (!deals_string_ptr) {
        console.error("Failed to allocate memory for deals_string_ptr");
        return;
    }
    var noOfTables = deals.length;
    var all_par_results_ptr = instance._malloc(noOfTables * (2 * 16 * 4 + 2 * 128)); // Allocation pour struct allParResults
    if (!all_par_results_ptr) {
        console.error("Failed to allocate memory for all_par_results_ptr");
        instance._free(deals_string_ptr);
        return;
    }

    instance._do_calc_all_par_results(deals_string_ptr, noOfTables, all_par_results_ptr);

    // Récupérer les résultats
    var allParResults = [];
    for (var i = 0; i < noOfTables; i++) {
        var parScore = [];
        for (var j = 0; j < 2; j++) {
            parScore[j] = "";
            for (var k = 0; k < 16; k++) {
                chr = instance.getValue(all_par_results_ptr + i * (2 * 16 + 2 * 128) + j * 16 + k , 'i8');
                if (chr != 0) {
                    parScore[j] += String.fromCharCode(chr);
                }
            }
        }

        var parContractsString = [];
        for (var j = 0; j < 2; j++) {
            parContractsString[j] = "";
            for (var k = 0; k < 128; k++) {
                var charCode = instance.getValue(all_par_results_ptr + i * (2 * 16 + 2 * 128) + 2 * 16 + j * 128 + k, 'i8');
                if (charCode != 0) {
                parContractsString[j] += String.fromCharCode(charCode);
                }
            }
        }

        allParResults.push({ parScore, parContractsString });
    }

    console.log("All Par Results:", allParResults);

    // Libérer la mémoire allouée
    instance._free(all_par_results_ptr);
    instance._free(deals_string_ptr);
});
