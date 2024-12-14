// This imports the Emscripten JS as a module. We must compile with -sMODULARIZE=1.
var factory = require('./a.out.js');

// We can now create an instance of the Emscripten module and call functions.
factory().then((instance) => {
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
});
