
export enum Subgame {
  RED_BLACK,
  ODD_EVEN,
  LOW_UPPER_HALF,
  COLUMNS,
  LOWER_MID_UPPER_3RD,
  EXACT
}

export interface Bet {
  r4: Subgame
  r5: number
  multiplier: number
  amount: number
}

export interface RouletteGame {
  txFee: number
  totalWager: number
  bets: Bet[]
}