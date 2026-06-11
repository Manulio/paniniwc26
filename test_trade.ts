import { exportCollection, importCollection, calculateTrades } from './src/utils/tradeEngine';

const dummyCollection = {
  'MEX-1': { owned: true, duplicates: 2 },
  'MEX-2': { owned: false, duplicates: 0 },
  'ARG-10': { owned: true, duplicates: 1 },
  'BRA-5': { owned: false, duplicates: 0 },
  'FWC-1': { owned: true, duplicates: 3 }
};

const allIds = ['MEX-1', 'MEX-2', 'ARG-10', 'BRA-5', 'FWC-1'];

const text = exportCollection(dummyCollection, allIds);
console.log("=== EXPORTED TEXT ===");
console.log(text);

const parsed = importCollection(text, 'me', 'Me');
console.log("\n=== PARSED ME ===");
console.log(JSON.stringify(parsed, null, 2));

const friendText = `
Me faltan
MEX 🇲🇽: 1
FWC 🏆: 1

Repetidas
MEX 🇲🇽: 2 (x1)
BRA 🇧🇷: 5 (x1)
`;

const parsedFriend = importCollection(friendText, 'friend', 'Friend');
console.log("\n=== PARSED FRIEND ===");
console.log(JSON.stringify(parsedFriend, null, 2));

const trades = calculateTrades([parsed, parsedFriend]);
console.log("\n=== TRADES ===");
console.log(JSON.stringify(trades, null, 2));
