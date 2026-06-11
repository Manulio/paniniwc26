export interface TeamColor {
  primary: string;
  secondary: string;
  tertiary?: string;
  crest?: string;
}

export const TEAM_COLORS: Record<string, TeamColor> = {
  FIFA: { primary: '#1d4ed8', secondary: '#eab308', crest: '/flags/fifa.svg' }, // Panini Blue / Gold
  ARG: { primary: '#43a1d5', secondary: '#ffffff', tertiary: '#fcd116', crest: '/flags/arg.svg' }, // Sky Blue / White / Sun Gold
  BRA: { primary: '#fcd116', secondary: '#009b3a', tertiary: '#002776', crest: '/flags/bra.svg' }, // Yellow / Green / Blue
  FRA: { primary: '#002654', secondary: '#ffffff', tertiary: '#ed2939', crest: '/flags/fra.svg' }, // Navy / White / Red
  ENG: { primary: '#ce1126', secondary: '#ffffff', tertiary: '#00247d', crest: '/flags/eng.svg' }, // Red (St George) / White / Navy
  ESP: { primary: '#aa151b', secondary: '#f1bf00', tertiary: '#00008b', crest: '/flags/esp.svg' }, // Red / Yellow / Navy
  GER: { primary: '#dd0000', secondary: '#000000', tertiary: '#ffcc00', crest: '/flags/ger.svg' }, // Red / Black / Gold
  POR: { primary: '#e42518', secondary: '#046a38', tertiary: '#f1bf00', crest: '/flags/por.svg' }, // Red / Green / Gold
  ITA: { primary: '#0064a7', secondary: '#ffffff', tertiary: '#009246', crest: '/flags/ita.svg' }, // Blue / White / Green
  NED: { primary: '#f36c21', secondary: '#1e1e1e', tertiary: '#ffffff', crest: '/flags/ned.svg' }, // Orange / Black / White
  BEL: { primary: '#e30613', secondary: '#000000', tertiary: '#fcd116', crest: '/flags/bel.svg' }, // Red / Black / Yellow
  URU: { primary: '#0081c6', secondary: '#1e1e1e', tertiary: '#fcd116', crest: '/flags/uru.svg' }, // Light Blue / Black / Sun Gold
  COL: { primary: '#fcd116', secondary: '#003893', tertiary: '#ce1126', crest: '/flags/col.svg' }, // Yellow / Blue / Red
  USA: { primary: '#002868', secondary: '#ffffff', tertiary: '#bf0a30', crest: '/flags/usa.svg' }, // Navy / White / Red
  MEX: { primary: '#006847', secondary: '#ffffff', tertiary: '#ce1126', crest: '/flags/mex.svg' }, // Green / White / Red
  CAN: { primary: '#d52b1e', secondary: '#ffffff', crest: '/flags/can.svg' }, // Red / White
  CRO: { primary: '#ff0000', secondary: '#ffffff', tertiary: '#001489', crest: '/flags/cro.svg' }, // Red / White / Blue
  MAR: { primary: '#c1272d', secondary: '#006233', crest: '/flags/mar.svg' }, // Red / Green
  SEN: { primary: '#00853f', secondary: '#fdef42', tertiary: '#e31b23', crest: '/flags/sen.svg' }, // Green / Yellow / Red
  JPN: { primary: '#000555', secondary: '#ffffff', tertiary: '#bc002d', crest: '/flags/jpn.svg' }, // Blue / White / Red
  KOR: { primary: '#c60c30', secondary: '#003478', tertiary: '#ffffff', crest: '/flags/kor.svg' }, // Red / Blue / White
  AUS: { primary: '#ffcd00', secondary: '#008751', crest: '/flags/aus.svg' }, // Yellow / Green
  IRN: { primary: '#da0000', secondary: '#239f40', tertiary: '#ffffff', crest: '/flags/irn.svg' }, // Red / Green / White
  KSA: { primary: '#006c35', secondary: '#ffffff', crest: '/flags/ksa.svg' }, // Green / White
  QAT: { primary: '#8a1538', secondary: '#ffffff', crest: '/flags/qat.svg' }, // Maroon / White
  TUN: { primary: '#e70013', secondary: '#ffffff', crest: '/flags/tun.svg' }, // Red / White
  EGY: { primary: '#ce1126', secondary: '#ffffff', tertiary: '#000000', crest: '/flags/egy.svg' }, // Red / White / Black
  NGA: { primary: '#008751', secondary: '#ffffff', crest: '/flags/nga.svg' }, // Green / White
  CMR: { primary: '#007a5e', secondary: '#ce1126', tertiary: '#fcd116', crest: '/flags/cmr.svg' }, // Green / Red / Yellow
  GHA: { primary: '#ce1126', secondary: '#fcd116', tertiary: '#006b3f', crest: '/flags/gha.svg' }, // Red / Gold / Green
  CIV: { primary: '#f77f00', secondary: '#ffffff', tertiary: '#009e60', crest: '/flags/civ.svg' }, // Orange / White / Green
  CHI: { primary: '#d52b1e', secondary: '#ffffff', tertiary: '#0039a6', crest: '/flags/chi.svg' }, // Red / White / Blue
  PER: { primary: '#d91023', secondary: '#ffffff', crest: '/flags/per.svg' }, // Red / White
  ECU: { primary: '#ffdd00', secondary: '#034ea2', tertiary: '#ed1c24', crest: '/flags/ecu.svg' }, // Yellow / Blue / Red
  VEN: { primary: '#cf142b', secondary: '#ffcc00', tertiary: '#00247d', crest: '/flags/ven.svg' }, // Red / Yellow / Blue
  PAR: { primary: '#d52b1e', secondary: '#ffffff', tertiary: '#0038a8', crest: '/flags/par.svg' }, // Red / White / Blue
  BOL: { primary: '#007934', secondary: '#fcd116', tertiary: '#da291c', crest: '/flags/bol.svg' }, // Green / Yellow / Red
  SRB: { primary: '#c6363c', secondary: '#0c4076', tertiary: '#ffffff', crest: '/flags/srb.svg' }, // Red / Blue / White
  SUI: { primary: '#ff0000', secondary: '#ffffff', crest: '/flags/sui.svg' }, // Red / White
  DEN: { primary: '#c60c30', secondary: '#ffffff', crest: '/flags/den.svg' }, // Red / White
  SWE: { primary: '#ffcd00', secondary: '#004b87', crest: '/flags/swe.svg' }, // Yellow / Blue
  NOR: { primary: '#ba0c2f', secondary: '#00205b', tertiary: '#ffffff', crest: '/flags/nor.svg' }, // Red / Blue / White
  POL: { primary: '#dc143c', secondary: '#ffffff', crest: '/flags/pol.svg' }, // Red / White
  UKR: { primary: '#ffd700', secondary: '#0057b7', crest: '/flags/ukr.svg' }, // Yellow / Blue
  WAL: { primary: '#d30f40', secondary: '#005a32', tertiary: '#ffffff', crest: '/flags/wal.svg' }, // Red / Green / White
  SCO: { primary: '#0065bd', secondary: '#ffffff', crest: '/flags/sco.svg' }, // Navy / White
  IRL: { primary: '#169b62', secondary: '#ffffff', tertiary: '#ff883e', crest: '/flags/irl.svg' }, // Green / White / Orange
  GRE: { primary: '#0d5eaf', secondary: '#ffffff', crest: '/flags/gre.svg' }, // Blue / White
  TUR: { primary: '#e30a17', secondary: '#ffffff', crest: '/flags/tur.svg' }, // Red / White
  RSA: { primary: '#007749', secondary: '#FFB81C', crest: '/flags/rsa.svg' }, // Green / Gold
  CZE: { primary: '#D7141A', secondary: '#11457E', crest: '/flags/cze.svg' }, // Red / Blue
  BIH: { primary: '#002395', secondary: '#FECB00', crest: '/flags/bih.svg' }, // Blue / Yellow
  HAI: { primary: '#00209F', secondary: '#D21034', crest: '/flags/hai.svg' }, // Blue / Red
  CUW: { primary: '#002B7F', secondary: '#F9E814', crest: '/flags/cuw.svg' }, // Blue / Yellow
  NZL: { primary: '#00247d', secondary: '#cc142b', crest: '/flags/nzl.svg' }, // Navy / Red
  CPV: { primary: '#003893', secondary: '#CF2027', crest: '/flags/cpv.svg' }, // Blue / Red
  IRQ: { primary: '#007A3D', secondary: '#FFFFFF', crest: '/flags/irq.svg' }, // Green / White
  ALG: { primary: '#006233', secondary: '#FFFFFF', crest: '/flags/alg.svg' }, // Green / White
  AUT: { primary: '#ED2939', secondary: '#FFFFFF', crest: '/flags/aut.svg' }, // Red / White
  JOR: { primary: '#007A3D', secondary: '#CE1126', tertiary: '#000000', crest: '/flags/jor.svg' }, // Green / Red / Black
  COD: { primary: '#007FFF', secondary: '#CE1126', crest: '/flags/cod.svg' }, // Blue / Red
  UZB: { primary: '#0099B5', secondary: '#FFFFFF', crest: '/flags/uzb.svg' }, // Teal / White
  PAN: { primary: '#DA291C', secondary: '#0033A0', crest: '/flags/pan.svg' }, // Red / Blue
  FWC: { primary: '#1d4ed8', secondary: '#eab308', crest: '/flags/fifa.svg' },
  'Coca-Cola': { primary: '#F40009', secondary: '#FFFFFF', crest: '/flags/coca-cola.svg' },
};

export const getTeamColors = (teamCode: string): TeamColor => {
  return TEAM_COLORS[teamCode] || { primary: '#1d4ed8', secondary: '#eab308' }; // Default Panini colors
};
