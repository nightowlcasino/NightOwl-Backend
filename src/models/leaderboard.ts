export class Leaderboard {

  public bets?: Array<WinningBet>

  constructor(
    bets?: Array<WinningBet>
  ) {
    this.bets = bets
  }

  public addBet(bet: WinningBet): void {
    if (this.bets) {
      this.bets.push(bet)
    } else {
      this.bets = new Array<WinningBet>()
      this.bets.push(bet)
    }
    return
  }

  public reverseSort(): void {
    if (this.bets) {
      this.bets.sort((a, b) => b.amount - a.amount)
    }
    return
  }
}

export class WinningBet {
  public address: string
  public amount: number
  public txId: string

  constructor(
    address: string,
    amount: number,
    txId: string
  ) {
    this.address = address
    this.amount = amount
    this.txId = txId
  }

  public static fromJson(userJson: any): WinningBet {
    var bet = new WinningBet(
      userJson.address,
      Number(userJson.amount),
      userJson.txId
    );

    return bet;
  }
}