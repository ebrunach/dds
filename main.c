#include <stdio.h>
#include <stdbool.h>
#include <string.h>
#include <emscripten/emscripten.h>
#include "src/dds.h"


EMSCRIPTEN_KEEPALIVE int dds_init()
{
    SetResources(40, 1);
    return 0;
}

void translate_current_trick_card(int rb_card, int* dds_suit, int* dds_rank)
{
    if (rb_card < 0)
    {
        dds_suit[0] = 0;
        dds_rank[0] = 0;
        return;
    }

    dds_suit[0] = 3 - (rb_card / 13);  // DDS encoding: 0=spades, 1=hearts, 2=diamonds, 3=clubs
    dds_rank[0] = (rb_card % 13) + 2;  // DDS encoding: 2=2, 3=3, ..., 14=A
}

EMSCRIPTEN_KEEPALIVE int do_dds_solve_board(int contract_bid,
                                            int hand_to_play,
                                            int currentTrick0,
                                            int currentTrick1,
                                            int currentTrick2,
                                            const char* pbn_remain_cards,
                                            int* output_array)
{
    // 1. Translate parameters into DDS-speak

    struct dealPBN dpbn;
    dpbn.first = hand_to_play;  // straight copy

    int rb_trump = contract_bid % 5;
    dpbn.trump = (rb_trump == 4) ? 4 : (3 - rb_trump);  // DDS encoding: 0=spades, 1=hearts, 2=diamonds, 3=clubs, 4=NT

    // current trick
    translate_current_trick_card(currentTrick0, dpbn.currentTrickSuit + 0, dpbn.currentTrickRank + 0);
    translate_current_trick_card(currentTrick1, dpbn.currentTrickSuit + 1, dpbn.currentTrickRank + 1);
    translate_current_trick_card(currentTrick2, dpbn.currentTrickSuit + 2, dpbn.currentTrickRank + 2);

    strcpy(dpbn.remainCards, pbn_remain_cards);
    //memcpy(dpbn.remainCards, pbn_remain_cards, strlen(pbn_remain_cards) + 1);
    // 2. Invoke DDS

    struct futureTricks ft;

    int res = SolveBoardPBN(dpbn, 0, 3, 1, &ft, 0);

    // 3. Translate output

    // We return an array of 2N integers, where N is the number of options (legal-to-play cards) in the hand-to-play.
    // Each pair of 2 integers represents (card, result).
    // N.B. these are returned in an arbitrary order - [no particular advantage to sorting them.]

    int* output_ptr = output_array;

    for (int i = 0; i < ft.cards; ++i)
    {
        *output_ptr++ = (3 - ft.suit[i]) * 13 + (ft.rank[i] - 2);
        *output_ptr++ = ft.score[i];

        // also output all equivalent cards
        for (int j = ft.rank[i] - 1; j >= 2; --j)
        {
            if ((ft.equals[i] & (1 << j)) > 0)
            {
                *output_ptr++ = (3 - ft.suit[i]) * 13 + (j - 2);
                *output_ptr++ = ft.score[i];
            }
        }
    }

    while (output_ptr < output_array + 26) *output_ptr++ = -1;

    return ft.nodes;
}

/*
struct ddTableDealsPBN {
    int noOfTables; // Number of DD table deals in structure, at most MAXNOOFTABLES
    struct ddTableDealPBN deals[X]; // X = MAXNOOFTABLES * DDS_STRAINS
};

struct ddTableDealPBN {
    char cards[80];
}

struct parResults {
    char parScore[2][16];
    char parContractsString[2][128];
};*/

EMSCRIPTEN_KEEPALIVE int do_calc_par_results(const char* pbn_remain_cards, struct parResults *presp){
    struct ddTableDealPBN tableDealPBN;
    strcpy(tableDealPBN.cards, pbn_remain_cards);

    // Calculer la table de résultats double-dummy
    struct ddTableResults tablep;
    CalcDDtablePBN(tableDealPBN, &tablep);

    Par(&tablep, presp, 0);
    return 0;
}

EMSCRIPTEN_KEEPALIVE int do_calc_all_par_results(const char* deals, int noOfTables, struct allParResults *presp){
    if (!deals || !presp) {
        printf("Invalid input pointers\n");
        return -1;
    }

    struct ddTableDealsPBN dealsPBN;
    dealsPBN.noOfTables = noOfTables;
    for (int i = 0; i < noOfTables; i++){
        struct ddTableDealPBN tableDealPBN;
        strncpy(tableDealPBN.cards, deals + i * 80, 80);
        dealsPBN.deals[i] = tableDealPBN;
        printf("dealsPBN.deals[%d].cards: %s\n", i, dealsPBN.deals[i].cards);
    }


    struct ddTablesRes resp;
    int mode[5] = {0, 0, 0, 0, 0};

    int result = CalcAllTablesPBN(&dealsPBN, 0, mode, &resp, presp);
    if (result != RETURN_NO_FAULT) {
        printf("CalcAllTablesPBN failed with error code: %d\n", result);
        return result;
    }

    return 0;
}