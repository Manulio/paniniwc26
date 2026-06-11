import stickersData from '../data/stickers.json';
import { getTeamEmoji } from './teamEmojis';

export interface TradeParticipant {
  id: string;
  name: string;
  needs: string[];
  dupes: Record<string, number>;
}

export interface TradeAction {
  from: string;
  to: string;
  stickers: string[];
}

export interface TradeSuggestion {
  id: string;
  type: 'direct' | 'multi-way' | 'generosity';
  actions: TradeAction[];
  description: string;
}

// Generates a WhatsApp-friendly string representing the collection
export const exportCollection = (
  collection: Record<string, { owned: boolean; duplicates: number }>,
  allStickersIds: string[]
): string => {
  const missing: Record<string, string[]> = {};
  const dupes: Record<string, string[]> = {};

  stickersData.forEach(s => {
    if (!allStickersIds.includes(s.id)) return;
    
    const isOwned = collection[s.id]?.owned || false;
    const duplicates = collection[s.id]?.duplicates || 0;

    const parts = s.number.split(' ');
    const prefix = parts.length > 1 ? parts[0] : s.team;
    const num = parts.length > 1 ? parts[1] : s.number;

    let displayPrefix = prefix;
    if (prefix === 'FWC') {
      const numVal = parseInt(num);
      if (num === '00' || (!isNaN(numVal) && numVal <= 8)) {
        displayPrefix = 'FWC 🏆';
      } else {
        displayPrefix = 'FWC 📜';
      }
    } else {
      const emoji = getTeamEmoji(prefix);
      if (emoji) {
        displayPrefix = `${prefix} ${emoji}`;
      }
    }

    if (!isOwned) {
      if (!missing[displayPrefix]) missing[displayPrefix] = [];
      missing[displayPrefix].push(num);
    }

    if (duplicates > 0) {
      if (!dupes[displayPrefix]) dupes[displayPrefix] = [];
      dupes[displayPrefix].push(duplicates > 1 ? `${num} (x${duplicates})` : num);
    }
  });

  let text = 'Me faltan\n';
  Object.keys(missing).forEach(team => {
    text += `${team}: ${missing[team].join(', ')}\n`;
  });

  if (Object.keys(dupes).length > 0) {
    text += '\nRepetidas\n';
    Object.keys(dupes).forEach(team => {
      text += `${team}: ${dupes[team].join(', ')}\n`;
    });
  }

  return text.trim();
};

// Parses WhatsApp format text back to a participant
export const importCollection = (text: string, id: string, name: string): TradeParticipant | null => {
  if (!text.trim()) return null;

  const parsedMissing = new Set<string>();
  const parsedDuplicates: Record<string, number> = {};
  let currentSection: 'missing' | 'duplicates' | null = null;

  const lines = text.split('\n');
  let hasParsedSomething = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.toLowerCase().includes('me faltan')) {
      currentSection = 'missing';
      continue;
    } else if (trimmed.toLowerCase().includes('repetidas')) {
      currentSection = 'duplicates';
      continue;
    }

    // Match team prefix (like FWC 🏆, MEX 🇲🇽, or just C)
    const match = trimmed.match(/^([A-Z]{1,3})\s*(?:[^\w\s:]*)?:\s*(.*)$/);
    if (match && currentSection) {
      const teamCode = match[1];
      const numbersStr = match[2];

      const numberParts = numbersStr.split(',').map(s => s.trim());
      for (const part of numberParts) {
        if (!part) continue;
        
        let num = part;
        let count = 1;

        const xMatch = part.match(/(.*?)\s*\(x(\d+)\)/i);
        if (xMatch) {
          num = xMatch[1].trim();
          count = parseInt(xMatch[2], 10);
        }

        const stickerId = `${teamCode}-${num}`;

        if (currentSection === 'missing') {
          parsedMissing.add(stickerId);
          hasParsedSomething = true;
        } else if (currentSection === 'duplicates') {
          parsedDuplicates[stickerId] = count;
          hasParsedSomething = true;
        }
      }
    }
  }

  if (!hasParsedSomething) {
    return null;
  }

  return {
    id,
    name,
    needs: Array.from(parsedMissing),
    dupes: parsedDuplicates,
  };
};

// Calculates optimal trades
export const calculateTrades = (participants: TradeParticipant[]): TradeSuggestion[] => {
  const suggestions: TradeSuggestion[] = [];
  
  // Deep copy to simulate and mutate
  const state: TradeParticipant[] = JSON.parse(JSON.stringify(participants));

  let suggestionIdCounter = 0;

  // 1. Direct Trades (2-way exchanges)
  for (let i = 0; i < state.length; i++) {
    for (let j = i + 1; j < state.length; j++) {
      const p1 = state[i];
      const p2 = state[j];

      const p1CanGive = Object.keys(p1.dupes).filter(id => p1.dupes[id] > 0 && p2.needs.includes(id));
      const p2CanGive = Object.keys(p2.dupes).filter(id => p2.dupes[id] > 0 && p1.needs.includes(id));

      const tradeLimit = Math.min(p1CanGive.length, p2CanGive.length);

      if (tradeLimit > 0) {
        const p1Gives = p1CanGive.slice(0, tradeLimit);
        const p2Gives = p2CanGive.slice(0, tradeLimit);

        // Apply mutations
        p1Gives.forEach(id => {
          p1.dupes[id]--;
          p2.needs = p2.needs.filter(n => n !== id);
        });
        p2Gives.forEach(id => {
          p2.dupes[id]--;
          p1.needs = p1.needs.filter(n => n !== id);
        });

        suggestions.push({
          id: `direct-${suggestionIdCounter++}`,
          type: 'direct',
          description: `Intercambio justo entre ${p1.name} y ${p2.name} (${tradeLimit} figuritas)`,
          actions: [
            { from: p1.id, to: p2.id, stickers: p1Gives },
            { from: p2.id, to: p1.id, stickers: p2Gives }
          ]
        });
      }
    }
  }

  // 2. Multi-way Trades (Cycles)
  // Repeat finding cycles until none exist
  let foundCycle = true;
  while (foundCycle) {
    foundCycle = false;

    // Build directed graph of possible gifts
    // edge from A to B means A has at least 1 sticker that B needs
    const edges: { from: string; to: string; sticker: string }[] = [];
    
    for (const A of state) {
      for (const B of state) {
        if (A.id !== B.id) {
          const available = Object.keys(A.dupes).find(id => A.dupes[id] > 0 && B.needs.includes(id));
          if (available) {
            edges.push({ from: A.id, to: B.id, sticker: available });
          }
        }
      }
    }

    // Find any cycle using DFS
    const adj = new Map<string, { to: string; sticker: string }[]>();
    for (const e of edges) {
      if (!adj.has(e.from)) adj.set(e.from, []);
      adj.get(e.from)!.push({ to: e.to, sticker: e.sticker });
    }

    const visited = new Set<string>();
    const path: string[] = [];
    let cyclePath: string[] = [];

    const dfs = (node: string) => {
      if (cyclePath.length > 0) return;
      if (path.includes(node)) {
        cyclePath = path.slice(path.indexOf(node));
        return;
      }
      if (visited.has(node)) return;
      visited.add(node);
      path.push(node);

      const neighbors = adj.get(node) || [];
      for (const n of neighbors) {
        dfs(n.to);
      }
      path.pop();
    };

    for (const p of state) {
      if (cyclePath.length === 0) {
        visited.clear();
        dfs(p.id);
      }
    }

    if (cyclePath.length > 0) {
      foundCycle = true;
      const actions: TradeAction[] = [];
      const participantNames = cyclePath.map(id => state.find(p => p.id === id)?.name);
      
      // Execute 1 round of cycle
      for (let i = 0; i < cyclePath.length; i++) {
        const fromId = cyclePath[i];
        const toId = cyclePath[(i + 1) % cyclePath.length];
        
        const edge = edges.find(e => e.from === fromId && e.to === toId);
        if (edge) {
          const sticker = edge.sticker;
          
          const pFrom = state.find(p => p.id === fromId)!;
          const pTo = state.find(p => p.id === toId)!;
          
          pFrom.dupes[sticker]--;
          pTo.needs = pTo.needs.filter(n => n !== sticker);
          
          actions.push({ from: fromId, to: toId, stickers: [sticker] });
        }
      }

      suggestions.push({
        id: `multi-${suggestionIdCounter++}`,
        type: 'multi-way',
        description: `Cadena de intercambio: ${participantNames.join(' ➔ ')} ➔ ${participantNames[0]}`,
        actions
      });
    }
  }

  // 3. Generosity (Leftovers)
  for (const A of state) {
    for (const B of state) {
      if (A.id !== B.id) {
        const aCanGive = Object.keys(A.dupes).filter(id => A.dupes[id] > 0 && B.needs.includes(id));
        if (aCanGive.length > 0) {
          suggestions.push({
            id: `gen-${suggestionIdCounter++}`,
            type: 'generosity',
            description: `${A.name} puede regalar a ${B.name} (${aCanGive.length} figuritas)`,
            actions: [
              { from: A.id, to: B.id, stickers: aCanGive }
            ]
          });
        }
      }
    }
  }

  return suggestions;
};
