export type OperatorLane =
  | 'SALES_NOW'
  | 'QUALIFY_NOW'
  | 'QUALIFY'
  | 'NURTURE'
  | 'REVIEW'
  | 'NO_CONTACT';

export type OfferCandidate = 'HP_1_1' | 'BASIC' | 'NONE' | 'REVIEW';
export type PremiumFitKey = 'PRO' | 'KIERUNEK' | 'RYZYKO' | 'PODSTAWA';

export interface LeadOperatorInput {
  hasInstagram: boolean;
  intent: string;
  startWhen: string;
  premiumFit: string;
  wantsHelp: boolean;
  followupPriority: boolean;
}

export interface LeadOperatorDecision {
  lane: OperatorLane;
  icon: string;
  headline: string;
  offer: OfferCandidate;
  offerLabel: string;
  intentLabel: string;
  urgencyLabel: string;
  fitLabel: string;
  blocker: string;
  nextMove: string;
}

const INTENT_LABEL: Record<string, string> = {
  in_prowadz: 'chce prowadzenia',
  in_zobacz: 'chce zobaczyć pomoc',
  in_sam: 'woli działać sam',
  in_niewiem: 'nie wie jeszcze',
};

const URGENCY_LABEL: Record<string, string> = {
  sw_7dni: 'teraz · ten tydzień',
  sw_30dni: 'wysoka · ten miesiąc',
  sw_kwartal: 'niska · za 2–3 mies.',
  sw_sprawdzam: 'brak · tylko sprawdza',
};

const FIT_LABEL: Record<PremiumFitKey, string> = {
  PRO: 'PRO · dowozi sam + chce kontroli + ma stawkę poza sylwetką',
  KIERUNEK: 'KIERUNEK · dowozi sam, potrzebuje raczej kierunku',
  RYZYKO: 'RYZYKO · chce dużego wsparcia, ale ma niską samodzielność',
  PODSTAWA: 'PODSTAWA · brak pełnego sygnału premium',
};

function fitKey(value: string): PremiumFitKey {
  return value === 'PRO' || value === 'KIERUNEK' || value === 'RYZYKO'
    ? value
    : 'PODSTAWA';
}

function offerFor(fit: PremiumFitKey, wantsHelp: boolean): OfferCandidate {
  if (!wantsHelp) return 'NONE';
  if (fit === 'RYZYKO') return 'REVIEW';
  if (fit === 'PRO') return 'HP_1_1';
  return 'BASIC';
}

function offerLabel(offer: OfferCandidate): string {
  if (offer === 'HP_1_1') return 'Human Performance 1:1';
  if (offer === 'BASIC') return 'Podstawowe prowadzenie';
  if (offer === 'REVIEW') return 'sprawdź ręcznie przed ofertą';
  return 'bez oferty teraz';
}

function blockerFor(input: LeadOperatorInput, fit: PremiumFitKey): string {
  if (!input.hasInstagram) return 'brak kanału kontaktu';
  if (fit === 'RYZYKO') return 'niska samodzielność — najpierw sprawdź oczekiwania wobec prowadzenia';
  if (input.intent === 'in_sam') return 'uważa, że lepiej ogarnie sam';
  if (input.startWhen === 'sw_sprawdzam') return 'brak realnego WHY NOW — tylko sprawdza';
  if (input.intent === 'in_niewiem') return 'nie podjął jeszcze decyzji, czy chce pomocy';
  if (input.wantsHelp) return 'finanse nieznane — nie pytaliśmy o budżet';
  return 'brak jawnej obiekcji, ale też brak sygnału zakupu';
}

export function buildLeadOperatorDecision(input: LeadOperatorInput): LeadOperatorDecision {
  const fit = fitKey(input.premiumFit);
  const intentLabel = INTENT_LABEL[input.intent] || 'brak danych';
  const urgencyLabel = URGENCY_LABEL[input.startWhen] || 'brak danych';
  const fitLabel = FIT_LABEL[fit];
  const offer = offerFor(fit, input.wantsHelp);

  if (!input.hasInstagram) {
    return {
      lane: 'NO_CONTACT', icon: '⚫', headline: 'BRAK KONTAKTU', offer,
      offerLabel: offerLabel(offer), intentLabel, urgencyLabel, fitLabel,
      blocker: blockerFor(input, fit),
      nextMove: 'Brak DM. Najpierw odzyskaj kanał kontaktu.',
    };
  }

  if (fit === 'RYZYKO') {
    return {
      lane: 'REVIEW', icon: '⚠️', headline: 'SPRAWDŹ OCZEKIWANIA', offer,
      offerLabel: offerLabel(offer), intentLabel, urgencyLabel, fitLabel,
      blocker: blockerFor(input, fit),
      nextMove: 'Jedno pytanie o to, czego oczekuje od prowadzenia. Potem decyzja: oferta albo pass.',
    };
  }

  if (input.followupPriority && fit === 'PRO') {
    return {
      lane: 'SALES_NOW', icon: '🔥', headline: 'PISAĆ TERAZ — KANDYDAT HP 1:1', offer,
      offerLabel: offerLabel(offer), intentLabel, urgencyLabel, fitLabel,
      blocker: blockerFor(input, fit),
      nextMove: 'Otwórz jednym pytaniem. Po odpowiedzi szybko sprawdź pracę i budżet; dopiero potem pogłębiaj.',
    };
  }

  const startsSoon = input.startWhen === 'sw_7dni' || input.startWhen === 'sw_30dni';
  if (input.intent === 'in_zobacz' && startsSoon && (fit === 'PRO' || fit === 'KIERUNEK')) {
    return {
      lane: 'QUALIFY_NOW', icon: '🟢', headline: 'KWALIFIKUJ TERAZ', offer,
      offerLabel: offerLabel(offer), intentLabel, urgencyLabel, fitLabel,
      blocker: blockerFor(input, fit),
      nextMove: 'Otwórz wartością, potem sprawdź pracę i budżet. Jeśli to siedzi, przejdź do zakresu.',
    };
  }

  if (input.wantsHelp || (input.intent === 'in_niewiem' && startsSoon && fit === 'PRO')) {
    return {
      lane: 'QUALIFY', icon: '🟡', headline: 'KWALIFIKUJ', offer,
      offerLabel: offerLabel(offer), intentLabel, urgencyLabel, fitLabel,
      blocker: blockerFor(input, fit),
      nextMove: 'Jedna wymiana o problemie, potem kwalifikacja.',
    };
  }

  return {
    lane: 'NURTURE',
    icon: '🧊',
    headline: 'NURTURE — ZERO PITCHU',
    offer,
    offerLabel: offerLabel(offer),
    intentLabel,
    urgencyLabel,
    fitLabel,
    blocker: blockerFor(input, fit),
    nextMove: 'Daj jeden konkret z wyniku. Bez oferty; wróć po nowym sygnale intencji.',
  };
}
