
export class Bet {
  constructor(
    r4: number,
    r5: number,
    multiplier: number,
    amount: number
  ) {
    this.r4 = r4
    this.r5 = r5
    this.multiplier = multiplier
    this.amount = amount
  }
  r4: number
  r5: number
  multiplier: number
  amount: number
}

export class RouletteGame {
  constructor(
      txFee?: number | undefined,
      totalWager?: number  | undefined,
      bets?: Bet[] | undefined,
  ) {
      this.txFee = txFee
      this.totalWager = totalWager
      this.bets = bets
  }
  txFee: number | undefined
  totalWager: number | undefined
  bets: Bet[] | undefined
}