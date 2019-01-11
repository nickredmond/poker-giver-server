var API_BASE_URL = 'https://poker-giver-api.herokuapp.com/';
const fetch = require('node-fetch');

// todo: do I want to store these, or is in-memory fine?
var connectionsByGameId = {};
var connections = [];
var addConnection = function(connection) {
    connections.push(connection);
}
var addClientToGame = function(gameId, clientConnection) {
    if (connectionsByGameId[gameId]) {
        connectionsByGameId[gameId].push(clientConnection);
    }
    else {
        connectionsByGameId[gameId] = [clientConnection];
    }
}

var minLogLevel = 'trace';
var logLevels = {
    'trace': 1,
    'info': 2,
    'warn': 3,
    'error': 4
};
var logMessage =  function(logLevel, message) {
    if (logLevels[logLevel] >= logLevels[minLogLevel]) {
        console.log(logLevel.toUpperCase() + ': ' + message);
    }
}

var sendMessageToClients = function(gameId, payload) {
    var clientConnections = connectionsByGameId[gameId];
    if (clientConnections) {
        clientConnections.forEach(connection => {
            connection.send(JSON.stringify(payload));
        });
    }
}

var addChipsRequestsByPlayerName = {};

//#region PORTED OVER CODE FROM WEBVIEW

// SECTION:: ported over from client

// constants 
var DECK_OF_CARDS = [
    { rank: 'A', suit: 'spade' }, { rank: 'A', suit: 'diamond' }, { rank: 'A', suit: 'club' }, { rank: 'A', suit: 'heart' },
    { rank: '2', suit: 'spade' }, { rank: '2', suit: 'diamond' }, { rank: '2', suit: 'club' }, { rank: '2', suit: 'heart' },
    { rank: '3', suit: 'spade' }, { rank: '3', suit: 'diamond' }, { rank: '3', suit: 'club' }, { rank: '3', suit: 'heart' },
    { rank: '4', suit: 'spade' }, { rank: '4', suit: 'diamond' }, { rank: '4', suit: 'club' }, { rank: '4', suit: 'heart' },
    { rank: '5', suit: 'spade' }, { rank: '5', suit: 'diamond' }, { rank: '5', suit: 'club' }, { rank: '5', suit: 'heart' },
    { rank: '6', suit: 'spade' }, { rank: '6', suit: 'diamond' }, { rank: '6', suit: 'club' }, { rank: '6', suit: 'heart' },
    { rank: '7', suit: 'spade' }, { rank: '7', suit: 'diamond' }, { rank: '7', suit: 'club' }, { rank: '7', suit: 'heart' },
    { rank: '8', suit: 'spade' }, { rank: '8', suit: 'diamond' }, { rank: '8', suit: 'club' }, { rank: '8', suit: 'heart' },
    { rank: '9', suit: 'spade' }, { rank: '9', suit: 'diamond' }, { rank: '9', suit: 'club' }, { rank: '9', suit: 'heart' },
    { rank: '10', suit: 'spade' }, { rank: '10', suit: 'diamond' }, { rank: '10', suit: 'club' }, { rank: '10', suit: 'heart' },
    { rank: 'J', suit: 'spade' }, { rank: 'J', suit: 'diamond' }, { rank: 'J', suit: 'club' }, { rank: 'J', suit: 'heart' },
    { rank: 'Q', suit: 'spade' }, { rank: 'Q', suit: 'diamond' }, { rank: 'Q', suit: 'club' }, { rank: 'Q', suit: 'heart' },
    { rank: 'K', suit: 'spade' }, { rank: 'K', suit: 'diamond' }, { rank: 'K', suit: 'club' }, { rank: 'K', suit: 'heart' },
];

// AI logic functions -->

var beginAiTurn = function(game) {
    var turnLengthMillis = (Math.random() * 2500) + 300;
    setTimeout(() => {
        try {
            var player = game.players[game.currentTurnIndex];
            var cards = game.cardsOnTable.concat([player.card1, player.card2]);

            var maxBetAmount = 1000;
            var oddsOfBetting = 1;
            var oddsOfFolding = 0;
            var isHandFound = false;

            var handTiers = [
                [getRoyalFlush, getStraightFlush, getFourofaKind],
                [getFullHouse, getFlush, getStraight],
                [getThreeofaKind, getTwoPair, getPair],
            ];

            for (var i = 0; i < handTiers.length && !isHandFound; i++) {
                var handChecks = handTiers[i];
                for (var j = 0; j < handTiers[i].length && !isHandFound; j++) {
                    isHandFound = handChecks[j](cards) !== null;

                    if (!isHandFound) {
                        maxBetAmount -= 55;
                        oddsOfBetting -= 0.01;
                        oddsOfFolding += 0.01;
                    }
                }
                if (!isHandFound) {
                    maxBetAmount -= 105;
                    oddsOfBetting -= 0.22;
                    oddsOfFolding += 0.08;
                }
            }

            if (cardsOnTable.length > 3) {
                maxBetAmount -= 75 * (cardsOnTable - 3);
                oddsOfBetting -= 0.08 * (cardsOnTable - 3);
                oddsOfFolding += (maxBetAmount > 500) ? 0 : 0.05;
            }

            var isFold = false;
            if (player.currentBet < game.currentBet) {
                isFold = oddsOfFolding > Math.random();
            }

            if (isFold) {
                onNextUserAction(game, 'fold');
            }
            else {
                var isAggressive = oddsOfBetting > Math.random();
                if (isAggressive) {
                    var betAmount = Math.random() * maxBetAmount;
                    var action = (game.currentBet === 0) ? 'bet' : 'raise';
                    onNextUserAction(game, action, betAmount);
                }
                else {
                    var action = (game.currentBet === 0) ? 'check' : 'call';
                    onNextUserAction(game, action);
                }
            }
        } catch (error) {
            // todo: handle this more gracefully... or just remove w/ removal of AI?
            console.log("error: [ name:" + error.name + ", message:" + error.message + ", stack: " + error.stack + " ]");
        }
    }, turnLengthMillis);
}

// Logic functions -->

var shuffleCards = function() {
    var unshuffledCards = JSON.parse(JSON.stringify(DECK_OF_CARDS));
    var shuffledCards = [];

    for (var i = 0; i < DECK_OF_CARDS.length; i++) {
        var nextCardIndex = Math.floor(Math.random() * unshuffledCards.length);
        shuffledCards.push(unshuffledCards[nextCardIndex]);
        unshuffledCards.splice(nextCardIndex, 1);
    }

    return shuffledCards;
}

var incrementBlinds = function(game) {
    if (!game.bigBlindIndex && game.bigBlindIndex !== 0) {
        game.bigBlindIndex = Math.floor(Math.random() * players.length);
        game.littleBlindIndex = bigBlindIndex === 0 ? players.length - 1 : bigBlindIndex - 1;
    }
    else {
        do {
            game.bigBlindIndex++;
            if (game.bigBlindIndex >= game.players.length) {
                game.bigBlindIndex = 0;
            }
        } while(game.players[game.bigBlindIndex].isOut);
        game.littleBlindIndex = game.bigBlindIndex === 0 ? game.players.length - 1 : game.bigBlindIndex - 1;

        while (game.players[game.littleBlindIndex].isOut) {
            game.littleBlindIndex--;
            if (game.littleBlindIndex < 0) {
                game.littleBlindIndex = game.players.length - 1;
            }
        }
    }
}

var deductBlindsFromPlayers = function(game) {
    game.players[game.bigBlindIndex].numberOfChips -= game.bigBlindAmount;
    game.players[game.bigBlindIndex].currentBet = game.bigBlindAmount;
    if (game.players[game.bigBlindIndex].numberOfChips < 0) {
        game.players[game.bigBlindIndex].numberOfChips = 0;
    }

    game.players[game.littleBlindIndex].numberOfChips -= game.littleBlindAmount;
    game.players[game.littleBlindIndex].currentBet = game.littleBlindAmount;
    if (game.players[game.littleBlindIndex].numberOfChips < 0) {
        game.players[game.littleBlindIndex].numberOfChips = 0;
    }
}

var drawCardFromDeck = function(game) {
    var nextCard = game.currentDeck[game.currentCardIndex];
    game.currentCardIndex++;
    return nextCard;
}

var beginDeal = function(game, onDealComplete) {
    try {
        game.players.forEach(player => {
            player.isShowingHand = false;
            player.currentBet = 0;
            player.isPlayed = false;
            player.isOut = player.numberOfChips <= 0;
        });

        var activePlayersCount = getActivePlayersCount(game.players);
        if (activePlayersCount < 2) {
            // todo: impelement end-game for this scenario
            console.log("game over " + game.id);
        }
        incrementBlinds(game);
        game.currentBet = game.bigBlindAmount;
        game.currentPotAmount = game.bigBlindAmount + game.littleBlindAmount;
        deductBlindsFromPlayers(game);

        game.currentDeck = shuffleCards();
        game.currentCardIndex = 0;

        game.currentTurnIndex = game.bigBlindIndex;
        var isBeforeDeal = true;
        incrementTurnIndex(game, isBeforeDeal);

        for (var i = game.currentTurnIndex; i < game.currentTurnIndex + game.players.length; i++) {
            var currentIndex = i >= game.players.length ? i - game.players.length : i;
            var player = game.players[currentIndex];
            player.card1 = null;
            player.card2 = null;

            if (!player.isOut) {
                player.card1 = drawCardFromDeck(game);
                player.card2 = drawCardFromDeck(game);;
            }
        }

        sendMessageToClients(game.id, { game, activePlayersCount, action: 'deal' });

        var cardDealInterval = 200;
        var roundOfCardsTime = (activePlayersCount - 1) * cardDealInterval;
        setTimeout(() => {
            onDealComplete();
        }, roundOfCardsTime * 2);
    } catch (error) {
        // todo: handle this more gracefully...
        console.log("error: [ name:" + error.name + ", message:" + error.message + ", stack: " + error.stack + " ]");
    }
}

// returns hand containing rank (royal flush for this method) or null if no hand
var getRoyalFlush = function(cards) {
    var straightFlush;
    var royalFlush = null;

    if (cards.length >= 5) {
        straightFlush = getStraightFlush(cards);
    }
    if (straightFlush && straightFlush[0].rank === 'A') {
        royalFlush = straightFlush;
    }

    return royalFlush;
}

var getStraightFlush = function(cards) {
    var isExtraCardsExcluded = false;
    var flush = getFlush(cards, isExtraCardsExcluded);
    var straightFlush = flush ? getStraight(flush) : null;

    return straightFlush;
}

var getFourofaKind = function(cards) {
    var cardsByRank = {};
    var fourOfaKind = null;
    
    for (var i = 0; i < cards.length && !fourOfaKind; i++) {
        var card = cards[i];
        if (cardsByRank[card.rank]) {
            cardsByRank[card.rank].push(card);
            if (cardsByRank[card.rank].length === 4) {
                fourOfaKind = cardsByRank[card.rank];
            }
        }
        else {
            cardsByRank[card.rank] = [card];
        }
    }
    
    var maxRankingCard = null;
    if (fourOfaKind) {
        Object.keys(cardsByRank).forEach(rank => {
            if (maxRankingCard === null && rank !== fourOfaKind[0].rank) {
                maxRankingCard = cardsByRank[rank][0];
            }
            else {
                var maxCardScore = maxRankingCard ? getCardScore(maxRankingCard.rank) : 0;
                if (rank !== fourOfaKind[0].rank && getCardScore(rank, true) > maxCardScore) {
                    maxRankingCard = cardsByRank[rank][0];
                }
            }
        });
    }
    
    var result = null;
    if (fourOfaKind) {
        result = fourOfaKind.concat(maxRankingCard);
    }
    return result;
}

var getFullHouse = function(cards) {
    var twoOfSameRank = null;
    var threeOfSameRank = null;

    if (cards.length >= 5) {
        var cardsByRank = {};
        cards.forEach(card => {
            if (cardsByRank[card.rank]) {
                cardsByRank[card.rank].push(card);
            }
            else {
                cardsByRank[card.rank] = [card];
            }
        });

        var ranks = Object.keys(cardsByRank);
        for (var i = 0; i < ranks.length; i++) {
            if (cardsByRank[ranks[i]].length >= 3) {
                threeOfSameRank = cardsByRank[ranks[i]];
            }
            else if (cardsByRank[ranks[i]].length >= 2) {
                if (!twoOfSameRank || cardsByRank[ranks[i]][0].rank > twoOfSameRank[0].rank) {
                    twoOfSameRank = cardsByRank[ranks[i]];
                }
            }
        }
    }
    
    var result = null;
    if (threeOfSameRank && twoOfSameRank) {
        threeOfSameRank = threeOfSameRank.slice(0, 3);
        twoOfSameRank = twoOfSameRank.slice(0, 2);
        result = threeOfSameRank.concat(twoOfSameRank);
    }
    return result;
}

/** return flush or null if there is none
 * @param isExtraCardsExcluded (opt) - if true, only the highest five cards in the suit 
 *      will be returned. if false, all cards in the matching suit (5-7 cards) will be 
 *      returned.
 */
 getFlush = function(cards, isExtraCardsExcluded = true) {
    var isHand = cards.length >= 5;
    var cardsInSuit = null;

    if (isHand) {
        var cardsBySuit = {};
        cards.forEach(card => {
            if (cardsBySuit[card.suit]) {
                cardsBySuit[card.suit].push(card);
            }
            else {
                cardsBySuit[card.suit] = [card];
            }
        });

        var suits = Object.keys(cardsBySuit);
        for (var i = 0; i < suits.length && !cardsInSuit; i++) {
            if (cardsBySuit[suits[i]].length >= 5) {
                cardsInSuit = cardsBySuit[suits[i]];
                if (isExtraCardsExcluded) {
                    var isAceHigh = true;
                    var sortingFunction = generateCardSortingFunction(isAceHigh);
                    cardsInSuit.sort(sortingFunction);
                    cardsInSuit = cardsInSuit.slice(0, 5);
                }
            }
        }
    }

    return cardsInSuit;
}

var getStraight = function(cards) {
    var sortingFunction = generateCardSortingFunction(true);
    cards.sort(sortingFunction);

    var straight = [];
    var ace = null;
    
    for (var i = 0; i < cards.length && straight.length < 5; i++) {
        if (straight.length === 0) {
            straight[0] = cards[i];
        }
        else if (isNextInStraight(cards, i, straight)) {
            straight.push(cards[i]);
        }
        else if (!isDuplicate(cards, i, straight)) {
            straight = [cards[i]];
        }

        if (cards[i].rank === 'A') {
            ace = cards[i];
        }
    }

    if (ace && is2345(straight)) {
        straight.push(ace);
    }
    
    var result = straight.length === 5 ? straight : null;
    return result;
}
var isNextInStraight = function(cards, i, cardsMatched) {
    // ace high doesn't matter because aces will be logically accounted for
    var lastCardScore = getCardScore(cardsMatched[cardsMatched.length - 1].rank, true);

    return getCardScore(cards[i].rank, true) === lastCardScore - 1;
}
var isDuplicate = function(cards, i, cardsMatched) {
    // ace high doesn't matter because aces will be logically accounted for
    var lastCardScore = getCardScore(cardsMatched[cardsMatched.length - 1].rank, true);

    return getCardScore(cards[i].rank, true) === lastCardScore;
}
var is2345 = function(cards) {
    var numberOfMatches = 0;
    if (cards.length === 4) {
        for (var i = 0; i < cards.length && numberOfMatches < 4; i++) {
            var card = cards[i];
            if (card.rank === '2' || card.rank === '3' || card.rank === '4' || card.rank === '5') {
                numberOfMatches++;
            }
        }
    }

    return numberOfMatches === 4;
}

var getThreeofaKind = function(cards) {
    var cardsByRank = {};
    var threeOfaKind = null;
    
    for (var i = 0; i < cards.length; i++) {
        var card = cards[i];
        if (Object.keys(cardsByRank).includes(card.rank)) {
            cardsByRank[card.rank].push(card);
            if (cardsByRank[card.rank].length === 3) { // 4 of rank is automatically a better hand
                threeOfaKind = cardsByRank[card.rank];
            }
        }
        else {
            cardsByRank[card.rank] = [card];
        }
    }
    
    var maxRankingCard1 = null;
    var maxRankingCard2 = null;
    if (threeOfaKind) {
        Object.keys(cardsByRank).forEach(rank => {
            if (rank !== threeOfaKind[0].rank) {
                if (maxRankingCard1 === null || getCardScore(rank) > getCardScore(maxRankingCard1.rank)) {
                    maxRankingCard1 = cardsByRank[rank][0];
                    if (cardsByRank[rank].length > 1) {
                        maxRankingCard2 = cardsByRank[rank][1];
                    }
                }
                else if (maxRankingCard2 === null || getCardScore(rank) > getCardScore(maxRankingCard2.rank)) {
                    maxRankingCard2 = cardsByRank[rank][0];
                }
            }
        });
    }
    
    var result = threeOfaKind ? threeOfaKind.concat([maxRankingCard1, maxRankingCard2]) : null;
    return result;
}

var getTwoPair = function(cards) {
    var isAceHigh = true;
    var sortingFunction = generateCardSortingFunction(isAceHigh);
    cards.sort(sortingFunction);

    var pair1 = null;
    var pair2 = null;
    var highCard = null;
    var cardsByRank = {};

    for (var i = 0; i < cards.length; i++) {
        if (cardsByRank[cards[i].rank]) {
            cardsByRank[cards[i].rank].push(cards[i]);
        }
        else {
            cardsByRank[cards[i].rank] = [cards[i]];
        }
    }
    
    Object.keys(cardsByRank).forEach(rank => {
        var isMatch = false;          
        if (cardsByRank[rank].length >= 2) {
            if (!pair1 || getCardScore(pair1[0].rank) < getCardScore(rank)) {
                isMatch = true;
                pair2 = pair1;
                pair1 = cardsByRank[rank].slice(0, 2);
            }
            else if (!pair2 || getCardScore(pair2[0].rank) < getCardScore(rank)) {
                isMatch = true;
                pair2 = cardsByRank[rank].slice(0, 2);
            }
        }
        
        var highCardScore = highCard ? getCardScore(highCard.rank) : 0;
        if ((!isMatch || cardsByRank[rank].length > 2) && highCardScore < getCardScore(cardsByRank[rank][0].rank)) {
            highCard = isMatch ? cardsByRank[rank][2] : cardsByRank[rank][0];
        }
    });
    
    return (pair1 && pair2) ? pair1.concat(pair2).concat(highCard) : null;
}

var getPair = function(cards) {
    var isAceHigh = true;
    var sortingFunction = generateCardSortingFunction(isAceHigh);
    cards.sort(sortingFunction);

    var pair = null;
    var highCards = [];
    var cardsByRank = {};

    for (var i = 0; i < cards.length; i++) {
        if (cardsByRank[cards[i].rank]) {
            cardsByRank[cards[i].rank].push(cards[i]);
        }
        else {
            cardsByRank[cards[i].rank] = [cards[i]];
        }
    }
    
    Object.keys(cardsByRank).forEach(rank => {             
        if (cardsByRank[rank].length >= 2) {
            if (pair === null || getCardScore(pair[0].rank) < getCardScore(rank)) {
                pair = cardsByRank[rank].slice(0, 2);
            }
        }
    });

    var maxRankingCard1 = null;
    var maxRankingCard2 = null;
    var maxRankingCard3 = null;
    if (pair) {
        Object.keys(cardsByRank).forEach(rank => {
            if (rank !== pair[0].rank || cardsByRank[rank].length > 2) {
                var cardScore = getCardScore(rank, true);
                
                if (!maxRankingCard1 || cardScore > getCardScore(maxRankingCard1.rank, true)) {
                    maxRankingCard1 = cardsByRank[rank][0];
                }
                else if (!maxRankingCard2 || cardScore > getCardScore(maxRankingCard2.rank, true)) {
                    maxRankingCard2 = cardsByRank[rank][0];
                }
                else if (maxRankingCard3 === null || cardScore > getCardScore(maxRankingCard3.rank, true)) {
                    maxRankingCard3 = cardsByRank[rank][0];
                }
            }
        });
    }
    
    return pair ? pair.concat([maxRankingCard1, maxRankingCard2, maxRankingCard3]) : null;
}

var generateCardSortingFunction = function(isAceHigh, isAscending = false) {
    return function(a, b) {
        var sortResult = 0;
        var rankA = a ? a.rank || 0 : 0;
        var rankB = b ? b.rank || 0 : 0;

        if (isAscending) {
            sortResult = getCardScore(rankA, isAceHigh) - getCardScore(rankB, isAceHigh);
        }
        else {
            sortResult = getCardScore(rankB, isAceHigh) - getCardScore(rankA, isAceHigh);
        }

        return sortResult;
    };
}

var getCardScore = function(cardRank, isAceHigh = true) {
    var aceScore = isAceHigh ? 14 : 1;
    var cardRanks = {
        'A': aceScore,
        '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
        '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
    };
    return cardRanks[cardRank];
}

// return { hand: [<card>], score: 1-10 (10 is highest ) }
var getHandAndScore = function(cards) {
    var hand = null;
    var score = 10;

    var handCheckFunctions = [
        getRoyalFlush,
        getStraightFlush,
        getFourofaKind,
        getFullHouse,
        getFlush,
        getStraight,
        getThreeofaKind,
        getTwoPair,
        getPair
    ];
    for (var i = 0; i < handCheckFunctions.length && !hand; i++) {
        var tryMatchHand = handCheckFunctions[i];
        hand = tryMatchHand(cards);
        
        if (!hand) {
            score--;
        }
    }

    if (!hand) {
        hand = (cards.length > 5) ? cards.slice(0, 5) : cards;
    }
    return { hand, score };
}


// turn-taking logic -->

var cardsOnTable = []

var setIsPlayedFalseExceptCurrentPlayer = function(game) {
    for (var i = 0; i < game.players.length; i++) {
        game.players[i].isPlayed = (game.currentTurnIndex === i);
    }
}

 /** actionType: 'check', 'call', 'bet', 'raise', 'fold'
/* actionValue (any): bet/raise (number)
*/
var onNextUserAction = function(game, actionType, actionValue) {
    try {
        var activePlayer = game.players[game.currentTurnIndex]; 
        var actionAmount = parseInt(actionValue) || 0;
        var isAllIn = false;
        var actionDisplayAmount;
        switch (actionType) {
            case 'check': 
                activePlayer.isPlayed = true;
                break;
            case 'call': 
                activePlayer.isPlayed = true;
                var amountToCall = game.currentBet - activePlayer.currentBet;
                actionDisplayAmount = amountToCall;
                if (amountToCall >= activePlayer.numberOfChips) {
                    isAllIn = true;
                    activePlayer.isOut = true;
                    actionDisplayAmount = activePlayer.numberOfChips;
                    activePlayer.numberOfChips = 0;
                }
                else {
                    activePlayer.numberOfChips -= amountToCall;
                }
                game.currentPotAmount += amountToCall;
                activePlayer.currentBet = game.currentBet;
                break;
            case 'bet': 
                setIsPlayedFalseExceptCurrentPlayer(game);
                actionDisplayAmount = actionAmount;
                if (actionAmount >= activePlayer.numberOfChips) {
                    isAllIn = true;
                    activePlayer.isOut = true;
                    actionDisplayAmount = activePlayer.numberOfChips;
                    activePlayer.numberOfChips = 0;
                }
                else {
                    activePlayer.numberOfChips -= actionAmount;
                }
                game.currentPotAmount += actionAmount;
                activePlayer.currentBet = actionAmount;
                game.currentBet = actionAmount;
                break;
            case 'raise': 
                setIsPlayedFalseExceptCurrentPlayer(game);
                actionDisplayAmount = actionAmount;
                var totalBet = (game.currentBet - activePlayer.currentBet) + actionAmount;
                if (totalBet >= activePlayer.numberOfChips) {
                    isAllIn = true;
                    activePlayer.isOut = true;
                    actionDisplayAmount = activePlayer.numberOfChips;
                    activePlayer.numberOfChips = 0;
                }
                else {
                    activePlayer.numberOfChips -= totalBet;
                }
                game.currentPotAmount += totalBet;
                game.currentBet += actionAmount;
                activePlayer.currentBet = game.currentBet;
                break;
            case 'fold':
                activePlayer.isOut = true;
                activePlayer.card1 = null;
                activePlayer.card2 = null;
                break;
        }

        var actionText = 'Player "' + activePlayer.name + '" ';
        if (isAllIn) {
            actionText += 'goes all in (' + actionDisplayAmount + ')';
        }
        else if (actionType === 'call' || actionType === 'raise' || actionType === 'bet') {
            actionText += actionType + 's ' + actionDisplayAmount;
        }
        else {
            actionText += actionType + 's';
        }
        
        endTurn(game, actionText);
    } catch (error) {
        // todo: better error-handling
        console.log("error handling next user action. " + error.name + ": " + error.message + ", " + error.stack);
    }
}

var incrementTurnIndex = function(game, isBeforeDeal = false) {
    do {
        game.currentTurnIndex = (game.currentTurnIndex + 1) % game.players.length;
    } while (
        game.players[game.currentTurnIndex].numberOfChips <= 0 || !(isBeforeDeal || game.players[game.currentTurnIndex].card1)
    );
}

var getOnlyPlayerIn = function(players) {
    var playersIn = players.filter(player => {
        return player.card1 !== null && player.card1 !== undefined;
    });
    return playersIn.length === 1 ? playersIn[0] : null;
}

var startNextTurn = function(game) {
    saveGame(game, function() {
        if (!game.players[game.currentTurnIndex].isHuman) { // todo: do I really want AI in prod? maybe at first
            logMessage('trace', 'beginning AI turn')
            beginAiTurn(game);
        }
        else {
            logMessage('trace', 'waiting for human player')
        }
    });
}

var getActivePlayersCount = function(players) {
    return players.filter(player => {
        return !player.isOut;
    }).length;
}
 
var beginRound = function(game, messageToClients) {
    try {
        logMessage('trace', 'beginning next round')
        var activePlayersCount = getActivePlayersCount(game.players);
        if (activePlayersCount < 2) { // all players but one are all-in
            game.roundNumber = NUMBER_OF_ROUNDS;
            endTurn(game);
        }
        else {
            game.currentTurnIndex = game.bigBlindIndex + 1;
            incrementTurnIndex(game);

            if (game.currentTurnIndex >= game.players.length) {
                game.currentTurnIndex = 0;
            }

            game.currentBet = 0;
            game.players.forEach(player => {
                player.currentBet = 0;
                player.isPlayed = false;
            });

            sendMessageToClients(game.id, { game, message: messageToClients || null });
            startNextTurn(game);
        }
    } catch (error) {
        // todo: better error-handling
        console.log("ERROR starting next round. " + error.name + ": " + error.message + ", " + error.stack);
    }
}

var isAllPlayersPlayed = function(players) {
    var isAllPlayed = true;
    for (var i = 0; i < players.length && isAllPlayed; i++) {
        isAllPlayed = isAllPlayed && (players[i].isPlayed || players[i].isOut);
    }

    return isAllPlayed;
}

var NUMBER_OF_ROUNDS = 4; // pre-flop, flop, turn, river
var endTurn = function(game, actionMessage) {
    try {
        var message = actionMessage;

        var onlyPlayerIn = getOnlyPlayerIn(game.players);
        var isRoundComplete = onlyPlayerIn || isAllPlayersPlayed(game.players); 
        logMessage('trace', 'is round complete: ' + isRoundComplete);

        if (isRoundComplete) {
            if (onlyPlayerIn || game.cardsOnTable.length === 5) {
                var winningPlayers = [];

                if (onlyPlayerIn) {
                    onlyPlayerIn.numberOfChips += game.currentPotAmount;
                    message = onlyPlayerIn.name + ' wins. All other players folded.';
                }
                else {
                    var winningResult = determineWinningAmountsByPlayerIndex(game);
                    winningResult.playerRewards.forEach(reward => {
                        var player = game.players[reward.playerIndex];
                        player.numberOfChips += reward.winningAmount;
                        player.isShowingHand = true;
                        winningPlayers.push(game.players[reward.playerIndex]);
                    });
                    message = winningResult.message;
                }

                game.players.forEach(player => {
                    if (player.numberOfChips <= 0) {
                        //setMessageText('Player ' + player.name + ' has run out of chips.');
                        // todo: boot player, or let player add chips until their turn? 
                        // also fix timing of this message
                    }
                });

                game.players.forEach(player => {
                    if (addChipsRequestsByPlayerName[player.name]) {
                        player.numberOfChips += addChipsRequestsByPlayerName[player.name];
                        delete addChipsRequestsByPlayerName[player.name];
                    }
                });
                
                // todo: maybe make animation of pot being rewarded or some shit
                sendMessageToClients(game.id, { message, game })
                setTimeout(() => {
                    try {
                        game.cardsOnTable = [];
                        game.roundNumber = 1;

                        saveGame(game, function() {
                            beginDeal(game, function() {
                                startNextTurn(game);
                            });
                        });
                    } catch (error) {
                        console.log("ERROR while starting new hand. " + error.name + ", " + error.message + ", " + error.stack);
                    }
                }, 5000);
            }
            else {
                game.roundNumber++;
                drawCardFromDeck(game); // burn card

                logMessage('trace', 'incrementing rounding number to ' + game.roundNumber);
                if (game.roundNumber === 2) { // flop
                    logMessage('trace', 'dealing flop');

                    for (var i = 0; i < 3; i++) {
                        game.cardsOnTable.push(drawCardFromDeck(game));
                        if (i === 2) {
                            sendMessageToClients(game.id, { message, game, action: 'flop' })
                            setTimeout(() => {
                                logMessage('trace', 'beginning round after flop');
                                saveGame(game, function() {
                                    beginRound(game);
                                });
                            }, 1500); // allow for front-end animation AND bot players
                        }
                    }
                }
                else { // turn, river
                    game.cardsOnTable.push(drawCardFromDeck(game));
                    saveGame(game, function() {
                        beginRound(game, message);
                    });
                }
            }
        }
        else {
            logMessage('trace', 'starting next turn')
            incrementTurnIndex(game);
            sendMessageToClients(game.id, { message, game });
            startNextTurn(game);
        }
    } catch (error) {
        // todo: refund chips and deal new hand?
        console.log("error: [ name:" + error.name + ", message:" + error.message + ", stack: " + error.stack + " ]");
    }
}

var ROYAL_FLUSH_RANK = 10;
var STRAIGHT_FLUSH_RANK = 9;
var FOUR_OF_A_KIND_RANK = 8;
var FULL_HOUSE_RANK = 7;
var FLUSH_RANK = 6;
var STRAIGHT_RANK = 5;
var THREE_OF_A_KIND_RANK = 4;
var TWO_PAIR_RANK = 3;
var PAIR_RANK = 2;
var HIGH_CARD_RANK = 1;
/** returns [{ playerIndex, winningAmount }] */
var determineWinningAmountsByPlayerIndex = function(game) {
    var winners = [];
    var handsByPlayerName = {};
    var highestRank = 0;
    var isAceHighByPlayerName = {};

    game.players.forEach(player => {
        if (player.card1 && player.card2) {
            var allCards = game.cardsOnTable.concat(player.card1).concat(player.card2);
            var hand = getHandAndScore(allCards);
            
            if (hand.score === highestRank) {
                winners.push(player);
                handsByPlayerName[player.name] = hand;
            }
            else if (hand.score > highestRank) {
                highestRank = hand.score;
                winners = [player];
                handsByPlayerName = {};
                handsByPlayerName[player.name] = hand;
            }

            if (hand.score >= highestRank && [STRAIGHT_FLUSH_RANK, STRAIGHT_FLUSH_RANK].includes(hand.score)) {
                var athrough5 = ['A', '2', '3', '4', '5'];
                for (var i = 0; i < hand.hand.length; i++) {
                    var isMatch = false;
                    for (var j = 0; j < athrough5 && !isMatch; j++) {
                        if (hand.hand[i].rank === athrough5[j]) {
                            isMatch = true;
                            athrough5 = athrough5.slice(j, 1);
                        }
                    }
                }
                isAceHighByPlayerName[player.name] = athrough5.length > 0;
            }
        }
    });

    var winningAmountsByPlayerIndex = null;
    if (winners.length > 1) {
        // if royal then just split the pot because everybody's a winner
        if ([STRAIGHT_FLUSH_RANK, STRAIGHT_RANK, FLUSH_RANK].includes(highestRank)) {
            var highCardWinners = [];
            var highCardScore = 0;
            
            winners.forEach(winner => {
                var isAceHigh = isAceHighByPlayerName[winner.name];
                var sortedCards = handsByPlayerName[winner.name].hand.sort(generateCardSortingFunction(isAceHigh));
                
                var highCard = sortedCards[0];
                var cardScore = getCardScore(highCard.rank, isAceHigh);
                if (cardScore > highCardScore) {
                    highCardScore = cardScore;
                    highCardWinners = [winner];
                }
                else if (cardScore === highCardScore) {
                    highCardWinners.push(winner);
                }
            });
            winners = highCardWinners;
        }
        else if (highestRank === FOUR_OF_A_KIND_RANK) {
            winners = getNofaKindWinners(winners, 4);
        }
        else if (highestRank === FULL_HOUSE_RANK) {
            var highestThreeRank = 0;
            var highestTwoRank = 0;
            var highestThreeWinners;
            var highestTwoWinners;

            winners.forEach(winner => {
                var hand = game.cardsOnTable.concat(winner.card1).concat(winner.card2);
                var cardsByRank = groupBy(hand, 'rank');
                Object.keys(cardsByRank).forEach(rank => {
                    var cards = cardsByRank[rank];
                    var cardScore = getCardScore(rank);
                    if (cards.length === 3) {
                        if (cardScore > highestThreeRank) {
                            highestThreeRank = cardScore;
                            highestThreeWinners = [winner];
                        }
                        else if (cardScore === highestThreeRank) {
                            highestThreeWinners.push(winner);
                        }
                    }
                    else if (cards.length === 2) {
                         if (cardScore > highestTwoRank) {
                             highestTwoRank = cardScore;
                             highestTwoWinners = [winner];
                         }
                         else if (cardScore === highestTwoRank) {
                             highestTwoWinners.push(winner);
                         }
                    }
                });
            });

            if (highestThreeWinners.length === 1 || highestTwoWinners.length > 1) {
                winners = highestThreeWinners;
            }
            else {
                winners = highestTwoWinners;
            }
        }
        else if (highestRank === THREE_OF_A_KIND_RANK) {
            winners = getNofaKindWinners(winners, 3);
        }
        else if (highestRank === TWO_PAIR_RANK) {
            var highestPair1Score = 0;
            var highestPairWinners = [];
            var highestPair2Score = 0;
            var highCardScore = 0;

            winners.forEach(winner => {
                var hand = game.cardsOnTable.concat(winner.card1).concat(winner.card2);
                var cardsByRank = groupBy(hand, 'rank');
                var highestPairScore = 0;
                var secondHighestPairScore = 0;
                var highestCardScore = 0;

                Object.keys(cardsByRank).forEach(rank => { 
                    var cardScore = getCardScore(rank);
                    if (cardsByRank[rank].length === 2) {
                        if (cardScore > highestPairScore) {
                            highestPairScore = cardScore;
                        }
                        else if (cardScore > secondHighestPairScore) {
                            secondHighestPairScore = cardScore;
                        }
                        else if (cardScore > highestCardScore) {
                            highestCardScore = cardScore;
                        }
                    }
                    else if (cardScore > highestCardScore) { // must be single card cuz 3+ would automatically be a better hand
                        highestCardScore = cardScore;
                    }
                });

                if (highestPairScore > highestPair1Score) {
                    highestPair1Score = highestPairScore;
                    highestPair2Score = secondHighestPairScore;
                    highCardScore = highestCardScore;
                    highestPairWinners = [winner];
                }
                else if (highestPairScore === highestPair1Score) {
                    if (secondHighestPairScore > highestPair2Score) {
                        highestPair1Score = highestPairScore;
                        highestPair2Score = secondHighestPairScore;
                        highCardScore = highestCardScore;
                        highestPairWinners = [winner];
                    }
                    else if (secondHighestPairScore === highestPair2Score) {
                        if (highestCardScore > highCardScore) {
                            highestPair1Score = highestPairScore;
                            highestPair2Score = secondHighestPairScore;
                            highCardScore = highestCardScore;
                            highestPairWinners = [winner];
                        }
                        else if (highestCardScore === highCardScore) {
                            highestPairWinners.push(winner);
                        }
                    }
                }
            });

            winners = highestPairWinners;
        }
        else if (highestRank === PAIR_RANK) {
            var highPairScore = 0;
            var highPairWinners = [];
            var highCardScores = []; // highest cards in desc order

            winners.forEach(winner => {
                var hand = game.cardsOnTable.concat(winner.card1).concat(winner.card2);
                var cardsByRank = groupBy(hand, 'rank');
                var highestPairScore = 0;
                var highestCardScores = [];

                Object.keys(cardsByRank).forEach(rank => { 
                    var cardScore = getCardScore(rank);
                    if (cardsByRank[rank].length === 2 && cardScore > highestPairScore) {
                        highestPairScore = cardScore;
                    }
                    else { // must be single card cuz 3+ would automatically be a better hand
                        if (highestCardScores.length < 3) {
                            highestCardScores.push(cardScore);
                            if (highestCardScores.length === 3) {
                                highestCardScores.sort((a, b) => { return b - a; });
                            }
                        }
                        else {
                            var swappedScore = null;
                            for (var i = 0; i < highestCardScores.length; i++) {
                                if (swappedScore) {
                                    var tempScore = highestCardScores[i];
                                    highestCardScores[i] = swappedScore;
                                    swappedScore = tempScore;
                                }
                                else if (cardScore > highestCardScores[i]) {
                                    swappedScore = highestCardScores[i]
                                    highestCardScores[i] = cardScore;
                                }
                            }
                        }
                    }
                });

                if (highestPairScore > highPairScore) {
                    highPairScore = highestPairScore;
                    highPairWinners = [winner];
                    highCardScores = highestCardScores;
                }
                else if (highestPairScore === highPairScore) {
                    var isTied = true;
                    for (var i = 0; i < highCardScores.length && isTied; i++) {
                        if (highestCardScores[i] > highCardScores[i]) {
                            highPairWinners = [winner];
                            highCardScores = highestCardScores;
                            isTied = false;
                        }
                        else {
                            isTied = highestCardScores[i] === highCardScores[i];
                        }
                    }

                    if (isTied) {
                        highPairWinners.push(winner);
                    }
                }
            });

            winners = highPairWinners;
        }
        else if (highestRank === HIGH_CARD_RANK) { // high card
            var highCardScores = [];
            var highCardWinners = [];

            var finalWinners = [];
            winners.forEach(winner => {
                var hand = game.cardsOnTable.concat(winner.card1).concat(winner.card2);
                var sortedHand = hand.sort(generateCardSortingFunction(true));
                var cardScores = sortedHand.map(card => {
                    return getCardScore(card.rank, true);
                });

                if (highCardScores.length === 0) {
                    highCardScores = cardScores;
                    highCardWinners = [winner];
                }
                else {
                    var isReplaced = false;
                    var isEqual = true;
                    for (var i = 0; i < cardScores.length && !isReplaced; i++) {
                        isReplaced = cardScores[i] > highCardScores[i];
                        isEqual = cardScores[i] === highCardScores[i];
                    }

                    if (isReplaced) {
                        highCardScores = cardScores;
                        highCardWinners = [winner];
                    }
                    else if (isEqual) {
                        highCardWinners.push(winner);
                    }
                }

                finalWinners = highCardWinners;
            });
            winners = finalWinners;
        }
    
        winningAmountsByPlayerIndex = getWinningAmountsByPlayerIndex(game, winners);
    }
    else { // single winner
        var winningIndex;
        var isIndexFound = false;
        for (var i = 0; i < game.players.length && !isIndexFound; i++) {
            if (game.players[i].name === winners[0].name) {
                winningIndex = i;
                isIndexFound = true;
            }
        }

        winningAmountsByPlayerIndex = [{
            playerIndex: winningIndex,
            winningAmount: game.currentPotAmount
        }];
    }

    var playerWord = 'Player';
    var winWord = 'wins';
    if (winningAmountsByPlayerIndex.length > 1) {
        playerWord = 'Players';
        winWord = 'win';
    }
    var playerName = null;
    winningAmountsByPlayerIndex.forEach(amountByIndex => {
        var name = game.players[amountByIndex.playerIndex].name;
        if (!playerName) {
            playerName = name;
        }
        else {
            playerName += ', ' + name;
        }
    });
    
    var hand = handsByPlayerName[game.players[winningAmountsByPlayerIndex[0].playerIndex].name];
    var handName = getHandDisplayName(highestRank, hand.hand);
    var message = playerWord + ' ' + playerName + ' ' + winWord + ' with ' + handName;

    return { playerRewards: winningAmountsByPlayerIndex, message: message };
}

var getHandDisplayName = function(score, cards) {
    var displayName = '';
    cards.sort(generateCardSortingFunction(true));
    var cardsDisplay = null;
    
    cards.forEach(card => {
        var cardRank = card ? card.rank || '' : '';
        if (!cardsDisplay) {
            cardsDisplay = cardRank;
        }
        else {
            cardsDisplay += ', ' + cardRank;
        }
    });
    switch (score) {
        case ROYAL_FLUSH_RANK: 
            displayName = 'royal flush';
            break;
        case STRAIGHT_FLUSH_RANK:
            displayName = 'straight flush: ' + cardsDisplay;
            break;
        case FOUR_OF_A_KIND_RANK:
            displayName = '4 of a kind: ' + cardsDisplay;
            break;
        case FULL_HOUSE_RANK: 
            displayName = 'full house: ' + cardsDisplay;
            break;
        case FLUSH_RANK:
            displayName = 'flush (' + cards[0].suit + 's): ' + cardsDisplay;
            break;
        case STRAIGHT_RANK: 
            displayName = 'straight: ' + cardsDisplay;
            break;
        case THREE_OF_A_KIND_RANK:
            displayName = '3 of a kind: ' + cardsDisplay;
            break;
        case TWO_PAIR_RANK: 
            displayName = '2 pair: ' + cardsDisplay;
            break;
        case PAIR_RANK: 
            displayName = 'pair: ' + cardsDisplay;
            break;
        case HIGH_CARD_RANK:
            displayName = 'high card: ' + cardsDisplay;
            break;
    }
    return displayName;
}

var getNofaKindWinners = function(players, n) {
    var highestNScore = 0;
    var highestNWinners = [];

    var winners = [];
    players.forEach(winner => {
        var hand = cardsOnTable.concat(winner.card1).concat(winner.card2);
        var cardsByRank = groupBy(hand, 'rank');
        var nOfakindCard;
        var ranks = Object.keys(cardsByRank);
        for (var i = 0; i < ranks.length && !nOfakindCard; i++) {
            if (cardsByRank[ranks[i]].length === n) {
                nOfakindCard = cardsByRank[ranks[i]][0];
            }
        }

        var cardScore = getCardScore(nOfakindCard.rank, true);
        if (cardScore > highestNScore) {
            highestNScore = cardScore;
            highestNWinners = [winner];
        }
        else if (cardScore === highestNScore) {
            highestNWinners.push(winner);
        }
    });
    
    if (highestNWinners.length > 1) {
        var highestCardWinners = []
        var highestCardScores = null;
        
        highestNWinners.forEach(winner => {
            var hand = cardsOnTable.concat(winner.card1).concat(winner.card2);
            var cardsByRank = groupBy(hand, 'rank'); 
            var ranks = Object.keys(cardsByRank);
            var highCardScores = [];
            for (var i = 0; i < ranks.length; i++) {
                if (cardsByRank[ranks[i]].length < n) {
                    var scores = cardsByRank[ranks[i]].map(card => { return getCardScore(card.rank) });
                    highCardScores = highCardScores.concat(scores);
                }
            }
            highCardScores.sort(function(a, b) { return b - a });

            if (!highestCardScores) {
                highestCardScores = highCardScores;
                highestCardWinners = [winner];
            }
            else {
                var isReplaced = false;
                var isEqual = true;
                for (var i = 0; i < highCardScores.length && !isReplaced; i++) {
                    isReplaced = highCardScores[i] > highestCardScores[i];
                    isEqual = isEqual && highCardScores[i] === highestCardScores[i];
                }

                if (isReplaced) {
                    highestCardScores = highCardScores;
                    highestCardWinners = [winner];
                }
                else if (isEqual) {
                    highestCardWinners.push(winner);
                }
            }
        });

        winners = highestCardWinners;
    }
    else {
        winners = highestNWinners;
    }

    return winners;
}

// return [{ playerIndex, winningAmount }]
var getWinningAmountsByPlayerIndex = function(game, winners) {
    var winningAmountsByPlayerIndex = [];
    var winningNames = winners.map(function(winner) { return winner.name });
    for (var i = 0; i < game.players.length; i++) {
        if (winningNames.includes(game.players[i].name)) {
            winningAmountsByPlayerIndex.push({
                playerIndex: i,
                winningAmount: parseInt(game.currentPotAmount / winners.length)
            });
        }
    }

    return winningAmountsByPlayerIndex;
}

var groupBy = function(items, propertyName) {
    var groups = {};
    items.forEach(item => {
        if (groups[item[propertyName]]) {
            groups[item[propertyName]].push(item);
        }
        else {
            groups[item[propertyName]] = [item];
        }
    });

    return groups;
}

var WebSocketServer = require("ws").Server
var http = require("http")
var express = require("express")
var app = express()
var port = process.env.PORT || 5000

app.use(express.static(__dirname + "/"))

var server = http.createServer(app)
server.listen(port)

console.log("http server listening on %d", port)

var wss = new WebSocketServer({server: server})
console.log("websocket server created")

var joinGame = function(messageData, connection) {
    authenticate(messageData.token, 
        () => {
            getGameById(messageData.gameId, function(game) {
                if (game) {
                    // todo: add blocking to prevent simultaneous requests from breaking table
                    // like perhaps a queue of join requests per table? getGame > addPlayer > save > next
                    if (!game.isFull) {
                        addClientToGame(messageData.gameId, connection);

                        var player = {
                            name: messageData.playerName,
                            isHuman: true,
                            numberOfChips: messageData.buyInAmount,
                            currentBet: 0,
                            isPlayed: true,
                            isOut: true
                        };
                        game.players.push(player);
                        
                        saveGame(game, function() {
                            if (!game.isStarted) {
                                game.isStarted = true;
                                beginGame(game);
                            }
                        });
                    }
                    else {
                        connection.send(JSON.stringify({ isTableFull: true, errorMessage: 'Table is full!' }));
                    }
                }
                else {
                    connection.send(JSON.stringify({ errorMessage: 'Error joining table.' }));
                }
            });
        },
        () => {
            connection.send(JSON.stringify({ errorMessage: 'Error joining table: not allowed.' }));
        });
}

var startGame = function(messageData, connection) {
    authenticate(messageData.token, 
        () => {
            getGameById(messageData.gameId, function(game) {
                if (game) {
                    if (!game.isStarted) {
                        game.isStarted = true;
                        beginGame(game);
                    }
                }
                else {
                    connection.send(JSON.stringify({ errorMessage: 'Error joining table.' }));
                }
            });
        },
        () => {
            connection.send(JSON.stringify({ errorMessage: 'Error joining table: not allowed.' }));
        }
    );
}

var addChips = function(messageData) {
    addChipsRequestsByPlayerName[messageData.playerName] = messageData.numberOfChips;
}

var handleUserAction = function(messageData) {
    getGameById(messageData.gameId, function(game) {
        try {
            logMessage('trace', 'action received from user ' + game.players[game.currentTurnIndex].name)
            if (messageData.playerName === game.players[game.currentTurnIndex].name) {
                logMessage('trace', 'indigenous')
                if (messageData.actionType === 'showCards') {
                    game.players[game.currentTurnIndex].isShowingHand = true;
                    sendMessageToClients(game.id, { game });
                }
                else {
                    onNextUserAction(game, messageData.actionType, messageData.actionAmount);
                }
            }
        } catch (error) {
            // todo: better error-handling
            console.log("ERROR handling user action " + error.name + ": " + error.message + ", " + error.stack);
        }
    });
}

wss.on('connection', function(ws) {
    console.log("made connection")
    addConnection(ws);

    ws.on('message', function(message) {
        console.log('Received Message: ' + message);

        const messageData = JSON.parse(message);
        switch (messageData.action) {
            case 'joinGame': 
                joinGame(messageData, ws);
                break;
            case 'addChips': 
                addChips(messageData);
            case 'userAction':
                handleUserAction(messageData);
                break;
            case 'startGame':
                startGame(messageData, ws);
                break;
            case 'ping':
                break;
            default:
                console.log("WARN: unknown request action '" + messageData.action + "' received, so nothing will be done.");
                break;
        }
    });
    ws.on('close', function() {
        // todo: remove connection from list; 
        //      remove player from game;
        //      if no players remain then reward chips and delete game, just like at end of round        
        console.log((new Date()) + ' Peer disconnected.');
    });
});

// todo: lock down all actions; authenticate before switch on action type
// also, maybe store validTokens list in memory so only need to POST /authenticate once?
var authenticate = function(token, onSuccess, onError) {
    fetch(API_BASE_URL + 'authenticate', {
        method: 'post',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(token)
    })
    .then(
        () => {
            onSuccess();
        },
        error => {
            onError(error);
        }
    )
}

var getGameById = function(id, onSuccess, onError) {
    fetch(API_BASE_URL + 'game/' + id)
        .then(response => response.json())
        .then(game => {
            if (game) {
                onSuccess(game);
            }
            else {
                logMessage('warn', 'Could not find game with id ' + id);
                onError({ error: 'Game not found.' });
            }
        })
}
var saveGame = function(game, onSuccess) {
    fetch(API_BASE_URL + 'game/' + game.id, {
        method: 'put',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(game)
    }) 
    .then(response => response.json())
    .then(() => {
        onSuccess();
    });
}
var deleteGame = function(gameId, onSuccess) {
    fetch(API_BASE_URL + 'game/' + gameId, {
        method: 'delete'
    })
    .then(() => {
        onSuccess();
    });
}

// SECTION:: server logic
var beginGame = function(game) {
    beginDeal(game, function() {
        startNextTurn(game);
    });
}