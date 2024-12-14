// This imports the Emscripten JS as a module. We must compile with -sMODULARIZE=1.
var factory = require('./a.out.js');

// We can now create an instance of the Emscripten module and call functions.
/* factory().then((instance) => {
    console.log("DDS loaded");
    // Initialise DDS
    instance._dds_init();

    // Solve a deal
    var deal_string = "N:A4.AQT4.842.AT94 KT953.53.AQT6.Q3 Q2.KJ9.KJ97.K865 J876.8762.53.J72";
    var deal_string_ptr = instance.allocateUTF8(deal_string);
    var buf = instance._malloc(26 * 4);

    var num_nodes = instance._do_dds_solve_board(14, 0, -1, -1, -1, deal_string_ptr, buf);

    // Print the raw output to the console

    console.log("Solutions:");
    for (var i = 0; i < 26; i++) {
        console.log(instance.getValue(buf + i * 4, 'i32'));
    }

    // Clean up and exit
    instance._free(buf);
    instance._free(deal_string_ptr);
}); */

/*factory().then((instance) => {
    console.log("DDS loaded");
    // Initialise DDS
    instance._dds_init();

    // Solve a deal
    var deal_string = "N:A4.AQT4.842.AT94 KT953.53.AQT6.Q3 Q2.KJ9.KJ97.K865 J876.8762.53.J72";
    var deal_string_ptr = instance.allocateUTF8(deal_string);
    var par_results_ptr = instance._malloc(2 * 16 * 4 + 2 * 128); // Allocation pour struct parResults

    instance._do_calc_par_results(deal_string_ptr, par_results_ptr);

    // Récupérer les résultats
    var parScore = [];
    for (var i = 0; i < 2; i++) {
        parScore[i] = "";
        for (var j = 0; j < 16; j++) {
            var chr = instance.getValue(par_results_ptr + i * 16 * 4 + j, 'i8');
            if (chr != 0) {
            parScore[i] += String.fromCharCode(chr);
            }
        }
    }

    var parContractsString = [];
    for (var i = 0; i < 2; i++) {
        parContractsString[i] = "";
        for (var j = 0; j < 128; j++) {
            var charCode = instance.getValue(par_results_ptr + 2 * 16 * 4 + i * 128 + j, 'i8');
            if (charCode != 0) {
            parContractsString[i] += String.fromCharCode(charCode);
            }
        }
    }

    console.log("Par Scores:", parScore);
    console.log("Par Contracts Strings:", parContractsString);

    // Libérer la mémoire allouée
    instance._free(par_results_ptr);
    instance._free(deal_string_ptr);
});*/

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
